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
 * Severity level for invariant violations.
 */
export type InvariantSeverity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO";

/**
 * Result of checking a specific invariant rule.
 */
export interface InvariantCheckResult {
  invariantId: string;
  name: string;
  passed: boolean;
  severity: InvariantSeverity;
  details: string;
  observedDelta?: {
    expected: string;
    actual: string;
  };
}

/**
 * Result of executing an individual test scenario.
 */
export interface ScenarioResult {
  scenarioId: string;
  name: string;
  description: string;
  passed: boolean;
  txResult: SandboxExecutionResult;
  invariantChecks: InvariantCheckResult[];
}

/**
 * Final structured differential audit verdict.
 */
export type UpgradeVerdict =
  | "SAFE"
  | "MALICIOUS_BACKDOOR_DETECTED"
  | "INVARIANT_VIOLATION";

export interface DifferentialAuditReport {
  programId: string;
  candidateSha256: string;
  candidateBytecodeSize: number;
  isSafeToUpgrade: boolean;
  verdict: UpgradeVerdict;
  scenarios: ScenarioResult[];
  violations: InvariantCheckResult[];
  recommendedAction: "PROCEED_WITH_UPGRADE" | "TRIGGER_EMERGENCY_EXIT_AND_ABORT";
  timestamp: number;
}
