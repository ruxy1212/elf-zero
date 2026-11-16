import fs from "fs";
import path from "path";
import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";

const KEYS_DIR = path.resolve(__dirname, "../../.keys");

function ensureDirectoryExists(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function parseSecretKey(val: string): Uint8Array | null {
  try {
    const trimmed = val.trim();
    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      return Uint8Array.from(JSON.parse(trimmed));
    }
    return bs58.decode(trimmed);
  } catch {
    return null;
  }
}

export function loadOrCreateKeypair(filename: string, envVar?: string): Keypair {
  // Priority 1: Environment variable
  if (envVar && process.env[envVar]) {
    const parsed = parseSecretKey(process.env[envVar]!);
    if (parsed) {
      return Keypair.fromSecretKey(parsed);
    }
  }

  // Priority 2: File on disk
  ensureDirectoryExists(KEYS_DIR);
  const filePath = path.join(KEYS_DIR, filename);

  if (fs.existsSync(filePath)) {
    try {
      const raw = fs.readFileSync(filePath, "utf-8");
      const secretKey = Uint8Array.from(JSON.parse(raw));
      return Keypair.fromSecretKey(secretKey);
    } catch {
      // fallback to generate
    }
  }

  // Priority 3: Generate and persist
  const newKeypair = Keypair.generate();
  try {
    fs.writeFileSync(
      filePath,
      JSON.stringify(Array.from(newKeypair.secretKey)),
      "utf-8"
    );
  } catch {
    // read-only filesystem fallback
  }
  return newKeypair;
}

export function getAuthorityKeypair(): Keypair {
  return loadOrCreateKeypair("authority.json", "AUTHORITY_SECRET_KEY");
}

export function getGuardianKeypair(): Keypair {
  return loadOrCreateKeypair("guardian.json", "GUARDIAN_SECRET_KEY");
}

export function getDemoUserKeypair(): Keypair {
  return loadOrCreateKeypair("demo_user.json", "DEMO_USER_SECRET_KEY");
}
