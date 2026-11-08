import fs from "fs";
import path from "path";
import { Keypair, PublicKey } from "@solana/web3.js";

const KEYS_DIR = path.resolve(__dirname, "../../.keys");

function ensureDirectoryExists(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

export function loadOrCreateKeypair(filename: string): Keypair {
  ensureDirectoryExists(KEYS_DIR);
  const filePath = path.join(KEYS_DIR, filename);

  if (fs.existsSync(filePath)) {
    const raw = fs.readFileSync(filePath, "utf-8");
    const secretKey = Uint8Array.from(JSON.parse(raw));
    return Keypair.fromSecretKey(secretKey);
  }

  const newKeypair = Keypair.generate();
  fs.writeFileSync(
    filePath,
    JSON.stringify(Array.from(newKeypair.secretKey)),
    "utf-8"
  );
  return newKeypair;
}

export function getAuthorityKeypair(): Keypair {
  return loadOrCreateKeypair("authority.json");
}

export function getGuardianKeypair(): Keypair {
  return loadOrCreateKeypair("guardian.json");
}

export function getDemoUserKeypair(): Keypair {
  return loadOrCreateKeypair("demo_user.json");
}
