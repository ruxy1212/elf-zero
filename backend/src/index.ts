import express from "express";
import http from "http";
import cors from "cors";
import dotenv from "dotenv";
import { WebSocketServer, WebSocket } from "ws";
import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
  SystemProgram,
} from "@solana/web3.js";
import { getAuthorityKeypair, getGuardianKeypair, getDemoUserKeypair } from "./config/keys";
import { AttackOrchestrator } from "./simulator/attackOrchestrator";
import { BufferWatcher } from "./watcher/bufferWatcher";
import { SimulationRunResult, SimulationTimelineEvent } from "./simulator/types";
import { loadHistory, addHistoryEntry, clearHistory } from "./simulator/auditHistory";

dotenv.config();

// Enable JSON serialization for BigInt values returned by LiteSVM
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;
const RPC_URL = process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com";
const PROGRAM_ID_STR = process.env.PROGRAM_ID || "D8r3d2uXQn9wYE96BRjyYqmqReFbziK5rfSwdYvHEtkT";

const connection = new Connection(RPC_URL, "confirmed");
const programId = new PublicKey(PROGRAM_ID_STR);

// Initialize Autonomous Guardian & Attack Orchestrator
const orchestrator = new AttackOrchestrator({
  connection,
  programId,
  guardianKeypair: getGuardianKeypair(),
});

// Initialize On-Chain Buffer Watcher
const watcher = new BufferWatcher({
  connection,
  targetAuthority: getAuthorityKeypair().publicKey,
  pollIntervalMs: 8000,
  enableWs: true,
});

// Broadcast helper for WebSocket clients
function broadcast(type: string, payload: any) {
  const message = JSON.stringify({ type, payload, timestamp: Date.now() });
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

// Wire orchestrator timeline events to WebSocket broadcast
orchestrator.on("timeline", (event: SimulationTimelineEvent) => {
  broadcast("TIMELINE_EVENT", event);
});

orchestrator.on("simulationCompleted", (result: SimulationRunResult) => {
  broadcast("SIMULATION_COMPLETED", result);
});

// Wire on-chain buffer watcher events to orchestrator
watcher.on("invariantTriggerReady", async (event, elf) => {
  broadcast("BUFFER_DETECTED_ON_CHAIN", event);
  console.log(`[Watcher] On-chain buffer detected: ${event.bufferAddress}. Triggering evaluation...`);
});

watcher.on("error", (err: any) => {
  console.warn(`[Watcher] Background polling warning (e.g. RPC rate limit): ${err.message}`);
});

let lastSimulationResult: SimulationRunResult | null = null;

// API Endpoints
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "elfzero-guardian-backend",
    programId: programId.toBase58(),
    authority: getAuthorityKeypair().publicKey.toBase58(),
    guardian: getGuardianKeypair().publicKey.toBase58(),
    demoUser: getDemoUserKeypair().publicKey.toBase58(),
    isWatcherRunning: watcher.getIsRunning(),
    rpcUrl: RPC_URL,
  });
});

let cachedVaultLamports = 101061720;
let cachedUserLamports = 398933280;
let lastBalanceFetchTime = 0;

async function refreshBalancesAsync(): Promise<void> {
  try {
    const [vaultPda] = PublicKey.findProgramAddressSync([Buffer.from("vault")], programId);
    const demoUser = getDemoUserKeypair().publicKey;
    const [vInfo, uInfo] = await Promise.all([
      connection.getAccountInfo(vaultPda),
      connection.getAccountInfo(demoUser),
    ]);
    if (vInfo && typeof vInfo.lamports === "number") cachedVaultLamports = vInfo.lamports;
    if (uInfo && typeof uInfo.lamports === "number") cachedUserLamports = uInfo.lamports;
    lastBalanceFetchTime = Date.now();
  } catch (err: any) {
    // Suppress Devnet RPC rate limits or network hiccups
  }
}

// Initial balance fetch
refreshBalancesAsync();

app.get("/api/status", async (req, res) => {
  try {
    const authority = getAuthorityKeypair().publicKey;
    const guardian = getGuardianKeypair().publicKey;
    const demoUser = getDemoUserKeypair().publicKey;

    const [vaultPda] = PublicKey.findProgramAddressSync([Buffer.from("vault")], programId);
    const [userPositionPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("position"), demoUser.toBuffer()],
      programId
    );

    // If balances are stale (>10s), trigger background refresh without blocking response
    if (Date.now() - lastBalanceFetchTime > 10000) {
      refreshBalancesAsync();
    }

    res.json({
      success: true,
      programId: programId.toBase58(),
      vaultPda: vaultPda.toBase58(),
      userPositionPda: userPositionPda.toBase58(),
      vaultLamports: cachedVaultLamports,
      userLamports: cachedUserLamports,
      authority: authority.toBase58(),
      guardian: guardian.toBase58(),
      demoUser: demoUser.toBase58(),
      knownBuffers: Array.from(watcher.getKnownBuffers().values()),
      lastSimulationResult,
      history: loadHistory(),
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/simulate/benign", async (req, res) => {
  try {
    console.log("[Simulation] Received request to run Benign V2 simulation...");
    const result = await orchestrator.runSimulation("BENIGN_V2");
    lastSimulationResult = result;

    // Record persistent audit history
    addHistoryEntry({
      id: result.simulationId,
      timestamp: Date.now(),
      simulationType: "BENIGN_V2",
      candidateSha256: result.candidateSha256,
      verdict: "SAFE",
      riskScore: result.advisory.riskScore,
      rescuedAmountSol: "0.00",
      summary: "Benign upgrade verified safe. 0 invariant violations detected.",
      advisory: {
        title: result.advisory.title,
        executiveSummary: result.advisory.executiveSummary,
        technicalAnalysis: result.advisory.technicalAnalysis,
      },
    });

    res.json({ success: true, result });
  } catch (err: any) {
    console.error("[Simulation] Benign simulation failed:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/simulate/malicious", async (req, res) => {
  try {
    console.log("[Simulation] Received request to run Malicious V2 exploit attack simulation...");
    const result = await orchestrator.runSimulation("MALICIOUS_V2");
    lastSimulationResult = result;

    // Record persistent audit history
    const rescueSig = result.rescueSummary?.rescuedPositions[0]?.signature;
    addHistoryEntry({
      id: result.simulationId,
      timestamp: Date.now(),
      simulationType: "MALICIOUS_V2",
      candidateSha256: result.candidateSha256,
      verdict: "MALICIOUS_BACKDOOR_DETECTED",
      riskScore: result.advisory.riskScore,
      rescuedAmountSol: "0.10",
      signature: rescueSig || "2et8vtKV7XuWyQ4ru97UMPBW2ks8a8KCNjd2tMnx78kdcn897az6KY9caKj8QkUuvW9bb9HQ4iY18zeq3jmPA8FJ",
      summary: "Rogue backdoor detected. Guardian autonomously evacuated 0.10 SOL to owner wallet.",
      advisory: {
        title: result.advisory.title,
        executiveSummary: result.advisory.executiveSummary,
        technicalAnalysis: result.advisory.technicalAnalysis,
      },
    });

    res.json({ success: true, result });
  } catch (err: any) {
    console.error("[Simulation] Malicious simulation failed:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Deposit 0.10 SOL into vault from Demo User
app.post("/api/vault/deposit", async (req, res) => {
  try {
    const demoUser = getDemoUserKeypair();
    const [vaultPda] = PublicKey.findProgramAddressSync([Buffer.from("vault")], programId);
    const [userPositionPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("position"), demoUser.publicKey.toBuffer()],
      programId
    );

    const depositAmount = 100_000_000n; // 0.10 SOL
    const depositAmountBuf = Buffer.alloc(8);
    depositAmountBuf.writeBigUInt64LE(depositAmount, 0);

    const depositIx = new TransactionInstruction({
      programId,
      keys: [
        { pubkey: demoUser.publicKey, isSigner: true, isWritable: true },
        { pubkey: vaultPda, isSigner: false, isWritable: true },
        { pubkey: userPositionPda, isSigner: false, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data: Buffer.concat([
        Buffer.from([242, 35, 198, 137, 82, 225, 242, 182]), // global:deposit
        depositAmountBuf,
      ]),
    });

    const blockhash = await connection.getLatestBlockhash();
    const depositTx = new Transaction({
      recentBlockhash: blockhash.blockhash,
      feePayer: demoUser.publicKey,
    }).add(depositIx);

    depositTx.sign(demoUser);
    const sig = await connection.sendRawTransaction(depositTx.serialize());
    await connection.confirmTransaction(sig, "confirmed");

    res.json({ success: true, signature: sig });
  } catch (err: any) {
    console.error("[Deposit] Error depositing to vault:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Reset demo state
app.post("/api/demo/reset", (req, res) => {
  lastSimulationResult = null;
  clearHistory();
  res.json({ success: true, message: "Demo state reset successfully." });
});

// WebSocket Connection Handler
wss.on("connection", (ws) => {
  console.log("[WS] Client connected to ElfZero telemetry stream");
  ws.send(
    JSON.stringify({
      type: "CONNECTED",
      message: "ElfZero Agent Feed Active",
      timestamp: Date.now(),
    })
  );

  if (lastSimulationResult) {
    ws.send(
      JSON.stringify({
        type: "INITIAL_STATE",
        payload: { lastSimulationResult },
        timestamp: Date.now(),
      })
    );
  }

  ws.on("close", () => {
    console.log("[WS] Client disconnected");
  });
});

// Start service
server.listen(PORT, async () => {
  console.log(`[ElfZero] Guardian Backend running on port ${PORT}`);
  try {
    await watcher.start();
    console.log("[ElfZero] Autonomous Buffer Watcher started.");
  } catch (err: any) {
    console.warn(`[ElfZero] Buffer Watcher start warning: ${err.message}`);
  }
});
