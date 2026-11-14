import express from "express";
import http from "http";
import cors from "cors";
import dotenv from "dotenv";
import { WebSocketServer, WebSocket } from "ws";
import { Connection, PublicKey } from "@solana/web3.js";
import { getAuthorityKeypair, getGuardianKeypair, getDemoUserKeypair } from "./config/keys";
import { AttackOrchestrator } from "./simulator/attackOrchestrator";
import { BufferWatcher } from "./watcher/bufferWatcher";
import { SimulationRunResult, SimulationTimelineEvent } from "./simulator/types";

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

    let vaultLamports = 0;
    let userLamports = 0;

    try {
      const vInfo = await connection.getAccountInfo(vaultPda);
      vaultLamports = vInfo?.lamports || 0;
      const uInfo = await connection.getAccountInfo(demoUser);
      userLamports = uInfo?.lamports || 0;
    } catch {
      // offline/rpc fallback
    }

    res.json({
      success: true,
      programId: programId.toBase58(),
      vaultPda: vaultPda.toBase58(),
      userPositionPda: userPositionPda.toBase58(),
      vaultLamports,
      userLamports,
      authority: authority.toBase58(),
      guardian: guardian.toBase58(),
      demoUser: demoUser.toBase58(),
      knownBuffers: Array.from(watcher.getKnownBuffers().values()),
      lastSimulationResult,
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
    res.json({ success: true, result });
  } catch (err: any) {
    console.error("[Simulation] Malicious simulation failed:", err);
    res.status(500).json({ success: false, error: err.message });
  }
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
