import express from "express";
import http from "http";
import cors from "cors";
import dotenv from "dotenv";
import { WebSocketServer } from "ws";
import { getAuthorityKeypair, getGuardianKeypair, getDemoUserKeypair } from "./config/keys.js";

dotenv.config();

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "elfzero-guardian-backend",
    authority: getAuthorityKeypair().publicKey.toBase58(),
    guardian: getGuardianKeypair().publicKey.toBase58(),
    demoUser: getDemoUserKeypair().publicKey.toBase58(),
  });
});

wss.on("connection", (ws) => {
  console.log("[WS] Client connected");
  ws.send(JSON.stringify({ type: "CONNECTED", message: "ElfZero Agent Feed Active" }));

  ws.on("close", () => {
    console.log("[WS] Client disconnected");
  });
});

server.listen(PORT, () => {
  console.log(`[ElfZero] Guardian Backend running on port ${PORT}`);
});
