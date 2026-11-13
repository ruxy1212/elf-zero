import * as fs from "fs";
import * as path from "path";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { EventEmitter } from "events";
import * as crypto from "crypto";
import { parseElfBytecode } from "../watcher/elfParser";
import { InvariantEngine } from "../sandbox/invariantEngine";
import { LlmReporter } from "../sandbox/llmReporter";
import { ExitExecutor } from "../guardian/exitExecutor";
import { SimulationRunResult, SimulationTimelineEvent } from "./types";
import { LiteSVMRunner } from "../sandbox/litesvmRunner";
import { getAuthorityKeypair, getGuardianKeypair, getDemoUserKeypair } from "../config/keys";

export interface AttackOrchestratorConfig {
  connection: Connection;
  programId: PublicKey | string;
  guardianKeypair?: Keypair;
  payloadsDir?: string;
  llmReporter?: LlmReporter;
}

export declare interface AttackOrchestrator {
  on(event: "timeline", listener: (event: SimulationTimelineEvent) => void): this;
  on(event: "simulationCompleted", listener: (result: SimulationRunResult) => void): this;
  on(event: "error", listener: (err: Error) => void): this;
}

/**
 * AttackOrchestrator coordinates the end-to-end autonomous defense pipeline:
 * Staging Upgrade Payloads -> Differential LiteSVM Evaluation -> LLM Advisory -> Guardian Auto-Rescue
 */
export class AttackOrchestrator extends EventEmitter {
  private connection: Connection;
  private programId: PublicKey;
  private guardianKeypair: Keypair;
  private payloadsDir: string;

  private invariantEngine: InvariantEngine;
  private llmReporter: LlmReporter;
  private exitExecutor: ExitExecutor;

  constructor(config: AttackOrchestratorConfig) {
    super();
    this.connection = config.connection;
    this.programId =
      typeof config.programId === "string"
        ? new PublicKey(config.programId)
        : config.programId;
    this.guardianKeypair = config.guardianKeypair || getGuardianKeypair();
    this.payloadsDir =
      config.payloadsDir || path.resolve(__dirname, "../../../payloads");

    this.invariantEngine = new InvariantEngine(this.programId);
    this.llmReporter = config.llmReporter || new LlmReporter();
    this.exitExecutor = new ExitExecutor({
      connection: this.connection,
      programId: this.programId,
      guardianKeypair: this.guardianKeypair,
    });

    // Forward executor events
    this.exitExecutor.on("positionEvacuated", (pos) => {
      this.emitTimeline(
        "STAGE_EMERGENCY_RESCUE_TRIGGERED",
        `Evacuated position: ${pos.amountRescued} lamports returned to ${pos.ownerAddress}`,
        pos
      );
    });
  }

  /**
   * Helper to emit structured timeline events.
   */
  private emitTimeline(
    stage: SimulationTimelineEvent["stage"],
    message: string,
    data?: any
  ): SimulationTimelineEvent {
    const event: SimulationTimelineEvent = {
      stage,
      timestamp: Date.now(),
      message,
      data,
    };
    this.emit("timeline", event);
    return event;
  }

  /**
   * Executes a simulated upgrade scenario (Benign vs Malicious).
   * Supports both live RPC execution and offline sandbox execution.
   */
  public async runSimulation(
    type: "BENIGN_V2" | "MALICIOUS_V2",
    options?: { sandboxRunner?: LiteSVMRunner }
  ): Promise<SimulationRunResult> {
    const simulationId = "sim_" + crypto.randomBytes(6).toString("hex");
    const startTime = Date.now();
    const timeline: SimulationTimelineEvent[] = [];

    const recordStage = (stage: SimulationTimelineEvent["stage"], message: string, data?: any) => {
      const ev = this.emitTimeline(stage, message, data);
      timeline.push(ev);
    };

    // 1. Stage Payload
    const filename =
      type === "BENIGN_V2" ? "vault_v2_benign.so" : "vault_v2_malicious.so";
    const payloadPath = path.join(this.payloadsDir, filename);

    if (!fs.existsSync(payloadPath)) {
      throw new Error(`Payload file not found: ${payloadPath}`);
    }

    const bytecodeBuffer = fs.readFileSync(payloadPath);
    const parsedElf = parseElfBytecode(bytecodeBuffer);

    recordStage(
      "STAGE_PAYLOAD_DETECTED",
      `Detected candidate upgrade payload: ${filename} (${parsedElf.bytecodeSize} bytes, SHA-256: ${parsedElf.sha256.slice(0, 16)}...)`,
      { filename, size: parsedElf.bytecodeSize, sha256: parsedElf.sha256 }
    );

    // 2. Initialize Sandbox
    recordStage(
      "STAGE_SANDBOX_INITIALIZED",
      "Replicated candidate bytecode into isolated LiteSVM differential sandbox environment.",
      { machine: parsedElf.header.machine, isValidSbf: parsedElf.isValidSbf }
    );

    // 3. Differential Invariant Evaluation
    recordStage(
      "STAGE_DIFFERENTIAL_EVALUATION",
      "Executing differential scenario matrix against candidate bytecode (Rent floor, Conservation, Backdoor Drain)..."
    );

    const auditReport = await this.invariantEngine.evaluateCandidateBytecode(
      bytecodeBuffer,
      parsedElf.sha256
    );

    recordStage(
      "STAGE_DIFFERENTIAL_EVALUATION",
      `Differential evaluation complete: Verdict = ${auditReport.verdict} (${auditReport.violations.length} violations found).`,
      { verdict: auditReport.verdict, violationsCount: auditReport.violations.length }
    );

    // 4. Generate Security Advisory via LLM
    recordStage(
      "STAGE_SECURITY_ADVISORY",
      "Synthesizing differential trace into human-readable security advisory with Google Gemini..."
    );

    const advisory = await this.llmReporter.generateAdvisory(auditReport);

    recordStage(
      "STAGE_SECURITY_ADVISORY",
      `Advisory generated by ${advisory.generatedBy}: Risk Score ${advisory.riskScore}/100. Action: ${advisory.recommendedAction}`,
      { riskScore: advisory.riskScore, title: advisory.title }
    );

    // 5. Autonomous Emergency Exit Execution (if exploit detected)
    let rescueSummary = undefined;
    if (!auditReport.isSafeToUpgrade) {
      recordStage(
        "STAGE_EMERGENCY_RESCUE_TRIGGERED",
        `EXPLOIT CONFIRMED: Autonomously dispatching Guardian Emergency Exit transactions...`
      );

      if (options?.sandboxRunner) {
        // Offline sandbox simulation mode
        const demoUser = getDemoUserKeypair();
        const [userPositionPda] = PublicKey.findProgramAddressSync(
          [Buffer.from("position"), demoUser.publicKey.toBuffer()],
          this.programId
        );

        const rescued = this.exitExecutor.executeInSandbox(
          options.sandboxRunner,
          userPositionPda,
          demoUser.publicKey,
          2_000_000_000n
        );

        rescueSummary = {
          rescueId: "rescue_sandbox_" + crypto.randomBytes(4).toString("hex"),
          triggerReason: advisory.title,
          candidateBytecodeSha256: parsedElf.sha256,
          totalPositionsTargeted: 1,
          totalPositionsRescued: rescued.success ? 1 : 0,
          totalLamportsRescued: rescued.amountRescued,
          rescuedPositions: [rescued],
          startedAt: Date.now(),
          completedAt: Date.now(),
          durationMs: 12,
        };
      } else {
        // Live on-chain mode
        rescueSummary = await this.exitExecutor.evacuateAllPositions(
          advisory.title,
          parsedElf.sha256
        );
      }

      recordStage(
        "STAGE_EMERGENCY_RESCUE_TRIGGERED",
        `Emergency evacuation completed: ${rescueSummary.totalPositionsRescued} position(s) rescued (${rescueSummary.totalLamportsRescued} lamports evacuated to owners).`,
        rescueSummary
      );
    }

    // 6. Complete Simulation
    recordStage(
      "STAGE_SIMULATION_COMPLETED",
      `Simulation ${simulationId} finished with verdict: ${auditReport.verdict}.`
    );

    const result: SimulationRunResult = {
      simulationId,
      simulationType: type,
      candidateSha256: parsedElf.sha256,
      candidateBytecodeSize: parsedElf.bytecodeSize,
      isSafeToUpgrade: auditReport.isSafeToUpgrade,
      auditReport,
      advisory,
      rescueSummary,
      timeline,
      durationMs: Date.now() - startTime,
    };

    this.emit("simulationCompleted", result);
    return result;
  }
}
