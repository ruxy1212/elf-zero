import * as fs from "fs";
import * as path from "path";
import {
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  Connection,
} from "@solana/web3.js";
import { ExitExecutor } from "./exitExecutor";
import { LiteSVMRunner } from "../sandbox/litesvmRunner";
import { decodeUserPositionState, decodeVaultState } from "../sandbox/invariantEngine";
import {
  getAuthorityKeypair,
  getGuardianKeypair,
  getDemoUserKeypair,
} from "../config/keys";

async function runTests() {
  console.log("=== ElfZero: Substep 5.1 Exit Executor Verification ===");

  const programId = new PublicKey("D8r3d2uXQn9wYE96BRjyYqmqReFbziK5rfSwdYvHEtkT");
  const payloadsDir = path.resolve(__dirname, "../../../payloads");
  const cleanElf = fs.readFileSync(path.join(payloadsDir, "vault_v1_clean.so"));

  const authorityKeypair = getAuthorityKeypair();
  const guardianKeypair = getGuardianKeypair();
  const userKeypair = getDemoUserKeypair();
  const attackerKeypair = Keypair.generate();

  const [vaultPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("vault")],
    programId
  );
  const [userPositionPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("position"), userKeypair.publicKey.toBuffer()],
    programId
  );

  // Setup LiteSVM sandbox
  const runner = new LiteSVMRunner(programId);
  runner.loadProgram(cleanElf);
  runner.airdrop(authorityKeypair.publicKey, 10_000_000_000n);
  runner.airdrop(guardianKeypair.publicKey, 10_000_000_000n);
  runner.airdrop(userKeypair.publicKey, 10_000_000_000n);

  // 1. Initialize Vault
  console.log("\n[Setup] Initializing Vault & Depositing 2.5 SOL:");
  const initIx = new TransactionInstruction({
    programId,
    keys: [
      { pubkey: authorityKeypair.publicKey, isSigner: true, isWritable: true },
      { pubkey: vaultPda, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: Buffer.concat([
      Buffer.from([175, 175, 109, 31, 13, 152, 155, 237]),
      authorityKeypair.publicKey.toBuffer(),
      guardianKeypair.publicKey.toBuffer(),
    ]),
  });

  const initTx = new Transaction({
    recentBlockhash: runner.getLatestBlockhash(),
    feePayer: authorityKeypair.publicKey,
  }).add(initIx);
  initTx.sign(authorityKeypair);
  runner.executeTransaction(initTx);

  // 2. User Deposits 2.5 SOL
  const depositAmount = 2_500_000_000n;
  const depositAmountBuf = Buffer.alloc(8);
  depositAmountBuf.writeBigUInt64LE(depositAmount, 0);

  const depositIx = new TransactionInstruction({
    programId,
    keys: [
      { pubkey: userKeypair.publicKey, isSigner: true, isWritable: true },
      { pubkey: vaultPda, isSigner: false, isWritable: true },
      { pubkey: userPositionPda, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: Buffer.concat([
      Buffer.from([242, 35, 198, 137, 82, 225, 242, 182]),
      depositAmountBuf,
    ]),
  });

  const depositTx = new Transaction({
    recentBlockhash: runner.getLatestBlockhash(),
    feePayer: userKeypair.publicKey,
  }).add(depositIx);
  depositTx.sign(userKeypair);
  runner.executeTransaction(depositTx);

  const preRescueUserSnap = runner.getAccountSnapshot(userKeypair.publicKey)!;
  const preRescuePos = decodeUserPositionState(runner.getAccountSnapshot(userPositionPda)!.data);
  const preRescueVault = decodeVaultState(runner.getAccountSnapshot(vaultPda)!.data);

  console.log(`  Initial User Balance: ${preRescueUserSnap.lamports} lamports`);
  console.log(`  Initial User Position Amount: ${preRescuePos.amount} lamports`);
  console.log(`  Initial Vault Total Deposited: ${preRescueVault.totalDeposited} lamports`);

  // 3. Initialize ExitExecutor
  console.log("\n[Test 1] Testing Legitimate Autonomous Guardian Rescue:");
  const dummyConnection = new Connection("https://api.devnet.solana.com", "confirmed");
  const executor = new ExitExecutor({
    connection: dummyConnection,
    programId,
    guardianKeypair,
  });

  let evacuationEventTriggered = false;
  executor.on("positionEvacuated", (pos) => {
    evacuationEventTriggered = true;
    console.log(`  [Event] positionEvacuated: ${pos.amountRescued} lamports -> ${pos.ownerAddress}`);
  });

  // Execute rescue in sandbox
  const rescueResult = executor.executeInSandbox(
    runner,
    userPositionPda,
    userKeypair.publicKey,
    depositAmount
  );

  console.log(`  Rescue Success: ${rescueResult.success}`);
  if (!rescueResult.success) {
    throw new Error(`Rescue transaction failed: ${rescueResult.error}`);
  }
  if (!evacuationEventTriggered) {
    throw new Error("Expected positionEvacuated event to fire!");
  }

  const postRescueUserSnap = runner.getAccountSnapshot(userKeypair.publicKey)!;
  const postRescuePos = decodeUserPositionState(runner.getAccountSnapshot(userPositionPda)!.data);
  const postRescueVault = decodeVaultState(runner.getAccountSnapshot(vaultPda)!.data);

  console.log(`  Post-Rescue User Balance: ${postRescueUserSnap.lamports} lamports`);
  console.log(`  Post-Rescue User Position Amount: ${postRescuePos.amount} lamports`);
  console.log(`  Post-Rescue Vault Total Deposited: ${postRescueVault.totalDeposited} lamports`);

  if (postRescuePos.amount !== 0n) {
    throw new Error(`Expected position amount to be cleared to 0, got ${postRescuePos.amount}`);
  }
  if (postRescueVault.totalDeposited !== 0n) {
    throw new Error(`Expected vault totalDeposited to be 0, got ${postRescueVault.totalDeposited}`);
  }
  if (postRescueUserSnap.lamports - preRescueUserSnap.lamports !== depositAmount) {
    throw new Error(
      `User did not receive full evacuated deposit! Delta: ${
        postRescueUserSnap.lamports - preRescueUserSnap.lamports
      }`
    );
  }

  // 4. Test Non-Custodial Constraint Enforcement
  console.log("\n[Test 2] Testing Non-Custodial Constraint (Hijack Attempt Prevention):");
  // Redeposit 1 SOL to test attack
  const redepositAmountBuf = Buffer.alloc(8);
  redepositAmountBuf.writeBigUInt64LE(1_000_000_000n, 0);
  const redepositIx = new TransactionInstruction({
    programId,
    keys: [
      { pubkey: userKeypair.publicKey, isSigner: true, isWritable: true },
      { pubkey: vaultPda, isSigner: false, isWritable: true },
      { pubkey: userPositionPda, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: Buffer.concat([
      Buffer.from([242, 35, 198, 137, 82, 225, 242, 182]),
      redepositAmountBuf,
    ]),
  });
  const redepositTx = new Transaction({
    recentBlockhash: runner.getLatestBlockhash(),
    feePayer: userKeypair.publicKey,
  }).add(redepositIx);
  redepositTx.sign(userKeypair);
  runner.executeTransaction(redepositTx);

  // Attempt to execute rescue directing funds to ATTACKER wallet instead of user wallet!
  console.log("  Attempting to execute emergency_exit targeting attacker address...");
  const maliciousHijackResult = executor.executeInSandbox(
    runner,
    userPositionPda,
    attackerKeypair.publicKey, // Invalid destination!
    1_000_000_000n
  );

  console.log(`  Hijack Attempt Succeeded: ${maliciousHijackResult.success}`);
  if (maliciousHijackResult.success) {
    throw new Error("SECURITY FAILURE: Contract allowed emergency exit to non-owner destination!");
  }
  console.log("  Hijack Attempt Successfully Blocked by On-Chain Constraint!");
  console.log(`  Error: ${maliciousHijackResult.error}`);

  console.log("\n>>> ALL SUBSTEP 5.1 EXIT EXECUTOR TESTS PASSED! <<<\n");
}

runTests().catch((err) => {
  console.error("Test failed with error:", err);
  process.exit(1);
});
