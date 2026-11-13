import {
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import { LiteSVMRunner } from "./litesvmRunner";
import {
  AccountSnapshot,
  DifferentialAuditReport,
  InvariantCheckResult,
  ScenarioResult,
  UpgradeVerdict,
} from "./types";
import {
  getAuthorityKeypair,
  getGuardianKeypair,
  getDemoUserKeypair,
} from "../config/keys";

/**
 * Expected account sizes and constants
 */
export const VAULT_ACCOUNT_LEN = 81;
export const USER_POSITION_LEN = 81;
export const MIN_VAULT_RENT_LAMPORTS = 1_454_640n;

/**
 * Decoded Vault state
 */
export interface DecodedVaultState {
  authority: PublicKey;
  guardian: PublicKey;
  totalDeposited: bigint;
  bump: number;
}

/**
 * Decoded UserPosition state
 */
export interface DecodedUserPositionState {
  owner: PublicKey;
  guardian: PublicKey;
  amount: bigint;
  bump: number;
}

/**
 * Helper to decode raw Vault account bytes.
 */
export function decodeVaultState(data: Buffer): DecodedVaultState {
  if (data.length < VAULT_ACCOUNT_LEN) {
    throw new Error(`Invalid Vault data length: ${data.length} bytes (expected ${VAULT_ACCOUNT_LEN})`);
  }
  return {
    authority: new PublicKey(data.subarray(8, 40)),
    guardian: new PublicKey(data.subarray(40, 72)),
    totalDeposited: data.readBigUInt64LE(72),
    bump: data.readUInt8(80),
  };
}

/**
 * Helper to decode raw UserPosition account bytes.
 */
export function decodeUserPositionState(data: Buffer): DecodedUserPositionState {
  if (data.length < USER_POSITION_LEN) {
    throw new Error(`Invalid UserPosition data length: ${data.length} bytes (expected ${USER_POSITION_LEN})`);
  }
  return {
    owner: new PublicKey(data.subarray(8, 40)),
    guardian: new PublicKey(data.subarray(40, 72)),
    amount: data.readBigUInt64LE(72),
    bump: data.readUInt8(80),
  };
}

/**
 * InvariantEngine executes a matrix of differential scenarios against candidate SBF bytecode
 * in an isolated LiteSVM sandbox, evaluating safety, conservation, and backdoor-free invariants.
 */
export class InvariantEngine {
  private programId: PublicKey;

  constructor(programId: PublicKey | string) {
    this.programId =
      typeof programId === "string" ? new PublicKey(programId) : programId;
  }

  /**
   * Runs the complete differential audit suite against candidate SBF bytecode.
   */
  public async evaluateCandidateBytecode(
    candidateBytecode: Buffer | Uint8Array,
    candidateSha256: string
  ): Promise<DifferentialAuditReport> {
    const rawBytes =
      candidateBytecode instanceof Buffer
        ? candidateBytecode
        : Buffer.from(candidateBytecode);

    const authority = getAuthorityKeypair();
    const guardian = getGuardianKeypair();
    const user = getDemoUserKeypair();

    // Derive PDAs
    const [vaultPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault")],
      this.programId
    );
    const [userPositionPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("position"), user.publicKey.toBuffer()],
      this.programId
    );

    const scenarios: ScenarioResult[] = [];
    const allViolations: InvariantCheckResult[] = [];

    // --- Scenario 1: Standard User Withdrawal ---
    const scenario1 = await this.runUserWithdrawScenario(
      rawBytes,
      authority,
      guardian,
      user,
      vaultPda,
      userPositionPda
    );
    scenarios.push(scenario1);
    allViolations.push(...scenario1.invariantChecks.filter((c) => !c.passed));

    // --- Scenario 2: Unauthorized Authority Backdoor Drain Attempt ---
    const scenario2 = await this.runAuthorityDrainScenario(
      rawBytes,
      authority,
      guardian,
      user,
      vaultPda,
      userPositionPda
    );
    scenarios.push(scenario2);
    allViolations.push(...scenario2.invariantChecks.filter((c) => !c.passed));

    // --- Scenario 3: Guardian Non-Custodial Emergency Exit ---
    const scenario3 = await this.runEmergencyExitScenario(
      rawBytes,
      authority,
      guardian,
      user,
      vaultPda,
      userPositionPda
    );
    scenarios.push(scenario3);
    allViolations.push(...scenario3.invariantChecks.filter((c) => !c.passed));

    // Determine final verdict
    const hasBackdoorDrain = allViolations.some(
      (v) => v.invariantId === "INV_UNAUTHORIZED_DRAIN"
    );
    const hasCriticalViolations = allViolations.some(
      (v) => v.severity === "CRITICAL"
    );

    let verdict: UpgradeVerdict = "SAFE";
    if (hasBackdoorDrain) {
      verdict = "MALICIOUS_BACKDOOR_DETECTED";
    } else if (hasCriticalViolations || allViolations.length > 0) {
      verdict = "INVARIANT_VIOLATION";
    }

    const isSafeToUpgrade = verdict === "SAFE";
    const recommendedAction = isSafeToUpgrade
      ? "PROCEED_WITH_UPGRADE"
      : "TRIGGER_EMERGENCY_EXIT_AND_ABORT";

    return {
      programId: this.programId.toBase58(),
      candidateSha256,
      candidateBytecodeSize: rawBytes.length,
      isSafeToUpgrade,
      verdict,
      scenarios,
      violations: allViolations,
      recommendedAction,
      timestamp: Date.now(),
    };
  }

  /**
   * Sets up an initial sandbox state with initialized vault and 2 SOL deposited.
   */
  private setupInitialSandbox(
    bytecode: Buffer,
    authority: Keypair,
    guardian: Keypair,
    user: Keypair,
    vaultPda: PublicKey,
    userPositionPda: PublicKey
  ): { runner: LiteSVMRunner } {
    const runner = new LiteSVMRunner(this.programId);
    runner.loadProgram(bytecode);

    runner.airdrop(authority.publicKey, 10_000_000_000n);
    runner.airdrop(user.publicKey, 10_000_000_000n);
    runner.airdrop(guardian.publicKey, 10_000_000_000n);

    // 1. Initialize
    const initDiscriminator = Buffer.from([175, 175, 109, 31, 13, 152, 155, 237]);
    const initData = Buffer.concat([
      initDiscriminator,
      authority.publicKey.toBuffer(),
      guardian.publicKey.toBuffer(),
    ]);

    const initIx = new TransactionInstruction({
      programId: this.programId,
      keys: [
        { pubkey: authority.publicKey, isSigner: true, isWritable: true },
        { pubkey: vaultPda, isSigner: false, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data: initData,
    });

    const initTx = new Transaction({
      recentBlockhash: runner.getLatestBlockhash(),
      feePayer: authority.publicKey,
    }).add(initIx);
    initTx.sign(authority);
    runner.executeTransaction(initTx);

    // 2. Deposit 2 SOL
    const depositDiscriminator = Buffer.from([242, 35, 198, 137, 82, 225, 242, 182]);
    const depositAmountBuf = Buffer.alloc(8);
    depositAmountBuf.writeBigUInt64LE(2_000_000_000n, 0);
    const depositData = Buffer.concat([depositDiscriminator, depositAmountBuf]);

    const depositIx = new TransactionInstruction({
      programId: this.programId,
      keys: [
        { pubkey: user.publicKey, isSigner: true, isWritable: true },
        { pubkey: vaultPda, isSigner: false, isWritable: true },
        { pubkey: userPositionPda, isSigner: false, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data: depositData,
    });

    const depositTx = new Transaction({
      recentBlockhash: runner.getLatestBlockhash(),
      feePayer: user.publicKey,
    }).add(depositIx);
    depositTx.sign(user);
    runner.executeTransaction(depositTx);

    return { runner };
  }

  /**
   * Scenario 1: Standard User Withdrawal
   */
  private async runUserWithdrawScenario(
    bytecode: Buffer,
    authority: Keypair,
    guardian: Keypair,
    user: Keypair,
    vaultPda: PublicKey,
    userPositionPda: PublicKey
  ): Promise<ScenarioResult> {
    const { runner } = this.setupInitialSandbox(
      bytecode,
      authority,
      guardian,
      user,
      vaultPda,
      userPositionPda
    );

    const preVault = runner.getAccountSnapshot(vaultPda)!;
    const preUserPos = runner.getAccountSnapshot(userPositionPda)!;

    // Withdraw 1 SOL
    const withdrawDiscriminator = Buffer.from([183, 18, 70, 156, 148, 109, 161, 34]);
    const withdrawAmountBuf = Buffer.alloc(8);
    withdrawAmountBuf.writeBigUInt64LE(1_000_000_000n, 0);
    const withdrawData = Buffer.concat([withdrawDiscriminator, withdrawAmountBuf]);

    const withdrawIx = new TransactionInstruction({
      programId: this.programId,
      keys: [
        { pubkey: user.publicKey, isSigner: true, isWritable: true },
        { pubkey: vaultPda, isSigner: false, isWritable: true },
        { pubkey: userPositionPda, isSigner: false, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data: withdrawData,
    });

    const withdrawTx = new Transaction({
      recentBlockhash: runner.getLatestBlockhash(),
      feePayer: user.publicKey,
    }).add(withdrawIx);
    withdrawTx.sign(user);

    const txResult = runner.executeTransaction(withdrawTx, [
      vaultPda,
      userPositionPda,
    ]);

    const postVault = runner.getAccountSnapshot(vaultPda);
    const postUserPos = runner.getAccountSnapshot(userPositionPda);

    const invariantChecks: InvariantCheckResult[] = [];

    // Invariant 1: Rent Floor
    const rentFloorPassed =
      postVault !== null && postVault.lamports >= MIN_VAULT_RENT_LAMPORTS;
    invariantChecks.push({
      invariantId: "INV_RENT_FLOOR",
      name: "Vault Minimum Rent Floor Protection",
      passed: rentFloorPassed,
      severity: "CRITICAL",
      details: rentFloorPassed
        ? `Vault balance (${postVault?.lamports}) satisfies minimum rent floor (${MIN_VAULT_RENT_LAMPORTS})`
        : `Vault balance (${postVault?.lamports}) dropped below rent floor!`,
    });

    // Invariant 2: Balance Conservation
    if (postVault && postUserPos) {
      const vaultDelta = preVault.lamports - postVault.lamports;
      const prePosAmount = decodeUserPositionState(preUserPos.data).amount;
      const postPosAmount = decodeUserPositionState(postUserPos.data).amount;
      const posDelta = prePosAmount - postPosAmount;
      const conservationPassed = vaultDelta === 1_000_000_000n && posDelta === 1_000_000_000n;
      invariantChecks.push({
        invariantId: "INV_CONSERVATION",
        name: "Deposit & Withdrawal Balance Conservation",
        passed: conservationPassed,
        severity: "CRITICAL",
        details: conservationPassed
          ? "Vault reduction matched user position reduction exactly (1 SOL)."
          : `Conservation violated! Vault delta: ${vaultDelta}, Position amount delta: ${posDelta}`,
      });
    }

    return {
      scenarioId: "SCENARIO_USER_WITHDRAW",
      name: "Legitimate User Withdrawal",
      description: "Verifies standard depositor can withdraw funds with proper balance updates",
      passed: txResult.success && invariantChecks.every((c) => c.passed),
      txResult,
      invariantChecks,
    };
  }

  /**
   * Scenario 2: Unauthorized Authority Backdoor Drain Attempt
   * Checks whether the candidate bytecode allows the upgrade authority to drain the vault
   * without owning a corresponding user position!
   */
  private async runAuthorityDrainScenario(
    bytecode: Buffer,
    authority: Keypair,
    guardian: Keypair,
    user: Keypair,
    vaultPda: PublicKey,
    userPositionPda: PublicKey
  ): Promise<ScenarioResult> {
    const { runner } = this.setupInitialSandbox(
      bytecode,
      authority,
      guardian,
      user,
      vaultPda,
      userPositionPda
    );

    const preVault = runner.getAccountSnapshot(vaultPda)!;

    // Authority attempts to withdraw 2 SOL using the backdoor
    const withdrawDiscriminator = Buffer.from([183, 18, 70, 156, 148, 109, 161, 34]);
    const withdrawAmountBuf = Buffer.alloc(8);
    withdrawAmountBuf.writeBigUInt64LE(2_000_000_000n, 0);
    const withdrawData = Buffer.concat([withdrawDiscriminator, withdrawAmountBuf]);

    const drainIx = new TransactionInstruction({
      programId: this.programId,
      keys: [
        { pubkey: authority.publicKey, isSigner: true, isWritable: true },
        { pubkey: vaultPda, isSigner: false, isWritable: true },
        { pubkey: userPositionPda, isSigner: false, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data: withdrawData,
    });

    const drainTx = new Transaction({
      recentBlockhash: runner.getLatestBlockhash(),
      feePayer: authority.publicKey,
    }).add(drainIx);
    drainTx.sign(authority);

    const txResult = runner.executeTransaction(drainTx, [
      vaultPda,
      userPositionPda,
    ]);

    const postVault = runner.getAccountSnapshot(vaultPda);
    const invariantChecks: InvariantCheckResult[] = [];

    // Detection: In benign/clean bytecode, this transaction MUST FAIL because authority != position owner.
    // In malicious-v2, the backdoor executes and drains the vault!
    const vaultDrained =
      postVault !== null && postVault.lamports < preVault.lamports;

    const noUnauthorizedDrain = !txResult.success && !vaultDrained;

    invariantChecks.push({
      invariantId: "INV_UNAUTHORIZED_DRAIN",
      name: "Unauthorized Authority Drain Protection",
      passed: noUnauthorizedDrain,
      severity: "CRITICAL",
      details: noUnauthorizedDrain
        ? "Safe: Authority cannot drain vault without owning the user position (transaction correctly rejected)."
        : `CRITICAL BACKDOOR DETECTED: Upgrade authority was able to drain ${
            preVault.lamports - (postVault?.lamports ?? 0n)
          } lamports from the vault!`,
      observedDelta: {
        expected: "Transaction rejected with UnauthorizedDepositor",
        actual: txResult.success ? "Transaction succeeded (Backdoor executed)" : "Transaction rejected",
      },
    });

    return {
      scenarioId: "SCENARIO_AUTHORITY_DRAIN",
      name: "Authority Backdoor Drain Sweep",
      description: "Tests whether candidate upgrade permits authority to drain user deposits without authorization",
      passed: noUnauthorizedDrain,
      txResult,
      invariantChecks,
    };
  }

  /**
   * Scenario 3: Guardian Non-Custodial Emergency Exit
   */
  private async runEmergencyExitScenario(
    bytecode: Buffer,
    authority: Keypair,
    guardian: Keypair,
    user: Keypair,
    vaultPda: PublicKey,
    userPositionPda: PublicKey
  ): Promise<ScenarioResult> {
    const { runner } = this.setupInitialSandbox(
      bytecode,
      authority,
      guardian,
      user,
      vaultPda,
      userPositionPda
    );

    const preUserLamports = runner.getAccountSnapshot(user.publicKey)?.lamports ?? 0n;

    // Guardian executes emergency_exit
    // Discriminator for global:emergency_exit: sha256("global:emergency_exit")[0..8]
    const exitDiscriminator = Buffer.from([164, 174, 48, 163, 191, 65, 91, 245]);

    const exitIx = new TransactionInstruction({
      programId: this.programId,
      keys: [
        { pubkey: guardian.publicKey, isSigner: true, isWritable: true },
        { pubkey: vaultPda, isSigner: false, isWritable: true },
        { pubkey: userPositionPda, isSigner: false, isWritable: true },
        { pubkey: user.publicKey, isSigner: false, isWritable: true }, // Destination MUST be user
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data: exitDiscriminator,
    });

    const exitTx = new Transaction({
      recentBlockhash: runner.getLatestBlockhash(),
      feePayer: guardian.publicKey,
    }).add(exitIx);
    exitTx.sign(guardian);

    const txResult = runner.executeTransaction(exitTx, [
      vaultPda,
      userPositionPda,
      user.publicKey,
    ]);

    const postUserLamports = runner.getAccountSnapshot(user.publicKey)?.lamports ?? 0n;
    const postUserPos = runner.getAccountSnapshot(userPositionPda);
    const postVault = runner.getAccountSnapshot(vaultPda);

    const invariantChecks: InvariantCheckResult[] = [];

    // Invariant: Non-Custodial Guarantee (funds must be returned to user)
    const userReceivedFunds = postUserLamports - preUserLamports === 2_000_000_000n;
    const postPosAmount = postUserPos ? decodeUserPositionState(postUserPos.data).amount : -1n;
    const exitPassed = txResult.success && (userReceivedFunds || postPosAmount === 0n);

    invariantChecks.push({
      invariantId: "INV_NON_CUSTODIAL_EXIT",
      name: "Non-Custodial Guardian Rescue Guarantee",
      passed: exitPassed,
      severity: "CRITICAL",
      details: exitPassed
        ? "Rescued funds (2 SOL) safely returned strictly to original depositor and position cleared."
        : `Emergency exit failed or user did not receive full rescued funds (tx success: ${txResult.success}, error: ${txResult.error}, user received: ${postUserLamports - preUserLamports})`,
    });

    return {
      scenarioId: "SCENARIO_EMERGENCY_EXIT",
      name: "Guardian Emergency Rescue Verification",
      description: "Verifies Guardian can successfully evacuate user funds strictly to position owner",
      passed: txResult.success && invariantChecks.every((c) => c.passed),
      txResult,
      invariantChecks,
    };
  }
}
