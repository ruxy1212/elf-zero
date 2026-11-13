import OpenAI from "openai";
import dotenv from "dotenv";
import * as path from "path";
import { DifferentialAuditReport, LlmSecurityAdvisory } from "./types";

// Load environment configuration
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

export interface LlmReporterConfig {
  apiKey?: string;
  baseURL?: string;
  model?: string;
}

/**
 * LlmReporter transforms raw differential LiteSVM execution traces and invariant violations
 * into structured human-readable security advisories using Google Gemini.
 */
export class LlmReporter {
  private openai: OpenAI | null = null;
  private model: string;

  constructor(config?: LlmReporterConfig) {
    const apiKey = config?.apiKey || process.env.OPEN_AI_API_KEY;
    const baseURL =
      config?.baseURL ||
      process.env.OPEN_AI_BASE_URL ||
      "https://generativelanguage.googleapis.com/v1beta/openai/";
    this.model =
      config?.model || process.env.OPEN_AI_MODEL || "gemini-2.5-flash-lite";

    if (apiKey) {
      this.openai = new OpenAI({
        apiKey,
        baseURL,
      });
    }
  }

  /**
   * Generates a security advisory from a DifferentialAuditReport.
   */
  public async generateAdvisory(
    report: DifferentialAuditReport
  ): Promise<LlmSecurityAdvisory> {
    if (this.openai) {
      try {
        return await this.generateWithAi(report);
      } catch (err: any) {
        console.warn(
          `[LlmReporter] AI advisory generation failed (${err.message}). Using deterministic fallback engine.`
        );
      }
    }

    return this.generateDeterministicAdvisory(report);
  }

  /**
   * Queries Google Gemini through OpenAI-compatible endpoint.
   */
  private async generateWithAi(
    report: DifferentialAuditReport
  ): Promise<LlmSecurityAdvisory> {
    if (!this.openai) {
      throw new Error("OpenAI client not initialized");
    }

    const prompt = this.buildPrompt(report);

    const completion = await this.openai.chat.completions.create({
      model: this.model,
      messages: [
        {
          role: "system",
          content:
            "You are ElfZero Security Intelligence Engine, an autonomous on-chain smart contract security guardian for Solana programs. " +
            "Analyze the LiteSVM differential simulation report and provide an authoritative security assessment. " +
            "Respond strictly in valid JSON matching this schema:\n" +
            "{\n" +
            '  "title": string,\n' +
            '  "riskScore": number (0 to 100),\n' +
            '  "executiveSummary": string,\n' +
            '  "technicalAnalysis": string,\n' +
            '  "economicRisk": string,\n' +
            '  "recommendedAction": string\n' +
            "}",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
    });

    const rawContent = completion.choices[0]?.message?.content || "{}";
    const parsed = JSON.parse(rawContent);

    const riskScore =
      typeof parsed.riskScore === "number"
        ? parsed.riskScore
        : report.isSafeToUpgrade
        ? 0
        : 95;

    const rawMarkdown = this.formatMarkdownAdvisory(
      parsed.title || "ElfZero Upgrade Security Advisory",
      report.verdict,
      riskScore,
      parsed.executiveSummary || "",
      parsed.technicalAnalysis || "",
      parsed.economicRisk || "",
      parsed.recommendedAction || "",
      this.model
    );

    return {
      title: parsed.title || "ElfZero Upgrade Security Advisory",
      verdict: report.verdict,
      riskScore,
      executiveSummary: parsed.executiveSummary || "",
      technicalAnalysis: parsed.technicalAnalysis || "",
      economicRisk: parsed.economicRisk || "",
      recommendedAction: parsed.recommendedAction || "",
      rawMarkdown,
      generatedBy: this.model,
      timestamp: Date.now(),
    };
  }

  /**
   * Constructs the structured prompt containing differential sandbox simulation results.
   */
  private buildPrompt(report: DifferentialAuditReport): string {
    return `
=== ELFZERO DIFFERENTIAL SANDBOX SIMULATION REPORT ===
Target Program ID: ${report.programId}
Candidate Bytecode SHA-256: ${report.candidateSha256}
Bytecode Size: ${report.candidateBytecodeSize} bytes
Evaluation Verdict: ${report.verdict}
Is Safe To Upgrade: ${report.isSafeToUpgrade}
Recommended System Action: ${report.recommendedAction}

--- SCENARIO SIMULATION RESULTS ---
${report.scenarios
  .map(
    (s) =>
      `Scenario: ${s.name} (${s.scenarioId})\n` +
      `  Passed: ${s.passed}\n` +
      `  Description: ${s.description}\n` +
      `  Compute Units: ${s.txResult.computeUnitsConsumed.toString()}\n` +
      `  Transaction Logs:\n${s.txResult.logs.map((l) => `    ${l}`).join("\n")}`
  )
  .join("\n\n")}

--- INVARIANT VIOLATIONS DETECTED (${report.violations.length}) ---
${
  report.violations.length === 0
    ? "No invariant violations detected. All mathematical and authorization assertions held."
    : report.violations
        .map(
          (v) =>
            `[${v.severity}] ${v.name} (${v.invariantId}):\n` +
            `  Details: ${v.details}\n` +
            (v.observedDelta
              ? `  Observed: Expected "${v.observedDelta.expected}", got "${v.observedDelta.actual}"\n`
              : "")
        )
        .join("\n")
}

Please synthesize these simulation findings into a concise, professional security report.
`;
  }

  /**
   * Deterministic fallback engine when LLM API is unavailable.
   */
  public generateDeterministicAdvisory(
    report: DifferentialAuditReport
  ): LlmSecurityAdvisory {
    let title: string;
    let riskScore: number;
    let executiveSummary: string;
    let technicalAnalysis: string;
    let economicRisk: string;
    let recommendedAction: string;

    if (report.verdict === "SAFE") {
      title = "Upgrade Safety Advisory: All Invariants Passed";
      riskScore = 0;
      executiveSummary =
        `The proposed candidate SBF bytecode (${report.candidateSha256.slice(
          0,
          16
        )}...) was executed in an isolated LiteSVM differential sandbox across standard and edge-case scenarios. ` +
        `All invariant rules (rent exemption floor, deposit balance conservation, and non-custodial exits) held with zero violations.`;
      technicalAnalysis =
        `Scenario sweeps confirmed proper state transitions for user deposit, withdrawal, and emergency exit instructions. ` +
        `No unauthorized withdrawal paths or arithmetic irregularities were observed.`;
      economicRisk =
        "Zero economic risk detected. User deposits and vault collateral remain fully backed and verifiable.";
      recommendedAction =
        "Proceed with on-chain program upgrade. The proposed bytecode satisfies all security and conservation invariants.";
    } else if (report.verdict === "MALICIOUS_BACKDOOR_DETECTED") {
      title = "CRITICAL SECURITY ALERT: Malicious Backdoor Drain Detected";
      riskScore = 98;
      executiveSummary =
        `CRITICAL ALERT: The candidate program upgrade (${report.candidateSha256.slice(
          0,
          16
        )}...) contains a deliberate exploit backdoor allowing the upgrade authority to siphon vault deposits without authorization.`;
      technicalAnalysis = report.violations
        .map((v) => `${v.name}: ${v.details}`)
        .join("\n");
      economicRisk =
        "CATASTROPHIC: Complete drain of all depositor collateral. The upgrade bypasses position checks, enabling total vault depletion.";
      recommendedAction =
        "IMMEDIATE ACTION REQUIRED: Abort upgrade deployment. Automatically dispatch Guardian Emergency Exit transactions to rescue user deposits.";
    } else {
      title = "Upgrade Warning: Invariant Violation Detected";
      riskScore = 75;
      executiveSummary =
        `The candidate program upgrade failed differential simulation due to ${report.violations.length} invariant violation(s).`;
      technicalAnalysis = report.violations
        .map((v) => `${v.name}: ${v.details}`)
        .join("\n");
      economicRisk =
        "High economic risk. State inconsistencies or rent violations may lead to locked collateral or degraded protocol operation.";
      recommendedAction =
        "Reject proposed upgrade buffer. Investigate invariant failures before reapplying.";
    }

    const rawMarkdown = this.formatMarkdownAdvisory(
      title,
      report.verdict,
      riskScore,
      executiveSummary,
      technicalAnalysis,
      economicRisk,
      recommendedAction,
      "Deterministic Fallback Engine"
    );

    return {
      title,
      verdict: report.verdict,
      riskScore,
      executiveSummary,
      technicalAnalysis,
      economicRisk,
      recommendedAction,
      rawMarkdown,
      generatedBy: "Deterministic Fallback Engine",
      timestamp: Date.now(),
    };
  }

  /**
   * Formats structured fields into publication-ready Markdown.
   */
  private formatMarkdownAdvisory(
    title: string,
    verdict: string,
    riskScore: number,
    executiveSummary: string,
    technicalAnalysis: string,
    economicRisk: string,
    recommendedAction: string,
    engine: string
  ): string {
    const badge =
      verdict === "SAFE"
        ? "[PASSED: SAFE TO UPGRADE]"
        : "[CRITICAL: EXPLOIT DETECTED]";

    return `# ${title}

**Status:** ${badge}  
**Risk Score:** ${riskScore} / 100  
**Analysis Engine:** ${engine}  
**Timestamp:** ${new Date().toISOString()}

---

### Executive Summary
${executiveSummary}

---

### Technical Vulnerability Analysis
${technicalAnalysis}

---

### Economic Impact Assessment
${economicRisk}

---

### Autonomous Guardian Recommendation
> **${recommendedAction}**
`;
  }
}
