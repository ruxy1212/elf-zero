import { PublicKey, Transaction, VersionedTransaction } from "@solana/web3.js";

/**
 * Snapshot of an account before or after execution in the sandbox.
 */
export interface AccountSnapshot {
  address: string;
  lamports: bigint;
  owner: string;
  data: Buffer;
  executable: boolean;
}

/**
 * Result of executing or simulating transactions against an ELF binary in LiteSVM.
 */
export interface SandboxExecutionResult {
  success: boolean;
  programId: string;
  bytecodeSha256: string;
  bytecodeSize: number;
  preState: Map<string, AccountSnapshot>;
  postState: Map<string, AccountSnapshot>;
  logs: string[];
  computeUnitsConsumed: bigint;
  error?: string;
  executionDurationMs: number;
}

/**
 * Input configuration for a sandbox differential test run.
 */
export interface SandboxRunConfig {
  programId: PublicKey | string;
  programBytecode: Buffer | Uint8Array;
  clonedAccounts?: AccountSnapshot[];
  payer?: PublicKey;
  airdropAmount?: bigint; // Default 10 SOL (10_000_000_000n lamports)
}

/**
 * Transaction simulation payload.
 */
export interface TransactionPayload {
  name: string;
  transaction: Transaction | VersionedTransaction;
  description?: string;
}
