import * as fs from "fs";
import * as path from "path";
import {
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import { LiteSVMRunner } from "./litesvmRunner";
import {
  getAuthorityKeypair,
  getGuardianKeypair,
  getDemoUserKeypair,
} from "../config/keys";

async function runTests() {
  console.log("=== ElfZero: Substep 4.1 LiteSVM Runner Verification ===");

  const programId = new PublicKey("D8r3d2uXQn9wYE96BRjyYqmqReFbziK5rfSwdYvHEtkT");
  const payloadsDir = path.resolve(__dirname, "../../../payloads");
  const cleanElf = fs.readFileSync(path.join(payloadsDir, "vault_v1_clean.so"));

  // Load deterministic role keypairs
  const authorityKeypair = getAuthorityKeypair();
  const guardianKeypair = getGuardianKeypair();
  const userKeypair = getDemoUserKeypair();

  console.log("  Authority:", authorityKeypair.publicKey.toBase58());
  console.log("  Guardian: ", guardianKeypair.publicKey.toBase58());
  console.log("  User:     ", userKeypair.publicKey.toBase58());

  // Derive Vault PDA: [b"vault"]
  const [vaultPda, vaultBump] = PublicKey.findProgramAddressSync(
    [Buffer.from("vault")],
    programId
  );
  console.log("  Vault PDA:", vaultPda.toBase58(), "bump:", vaultBump);

  // Derive UserPosition PDA: [b"position", user.publicKey]
  const [userPositionPda, userPosBump] = PublicKey.findProgramAddressSync(
    [Buffer.from("position"), userKeypair.publicKey.toBuffer()],
    programId
  );
  console.log("  UserPosition PDA:", userPositionPda.toBase58(), "bump:", userPosBump);

  // 1. Initialize Sandbox with V1 Clean program
  console.log("\n[Test 1] Initializing LiteSVM Sandbox with Clean V1 SBF Bytecode:");
  const runner = new LiteSVMRunner(programId);
  runner.loadProgram(cleanElf);
  console.log("  Program loaded successfully!");

  // Airdrop 10 SOL to authority and user in the sandbox
  runner.airdrop(authorityKeypair.publicKey, 10_000_000_000n);
  runner.airdrop(userKeypair.publicKey, 10_000_000_000n);
  console.log("  Airdropped 10 SOL each to Authority and Demo User in Sandbox.");

  // 2. Build Anchor `initialize` instruction
  // Discriminator for initialize: [175, 175, 109, 31, 13, 152, 155, 237]
  console.log("\n[Test 2] Simulating Anchor 'initialize' instruction:");
  const initDiscriminator = Buffer.from([175, 175, 109, 31, 13, 152, 155, 237]);
  const initData = Buffer.concat([
    initDiscriminator,
    authorityKeypair.publicKey.toBuffer(),
    guardianKeypair.publicKey.toBuffer(),
  ]);

  const initIx = new TransactionInstruction({
    programId,
    keys: [
      { pubkey: authorityKeypair.publicKey, isSigner: true, isWritable: true },
      { pubkey: vaultPda, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: initData,
  });

  const blockhash = runner.getLatestBlockhash();
  const initTx = new Transaction({
    recentBlockhash: blockhash,
    feePayer: authorityKeypair.publicKey,
  }).add(initIx);
  initTx.sign(authorityKeypair);

  const initResult = runner.executeTransaction(initTx, [vaultPda]);
  console.log("  Initialize Success:", initResult.success);
  console.log("  Compute Units Consumed:", initResult.computeUnitsConsumed.toString());
  if (!initResult.success) {
    console.error("  Init Logs:", initResult.logs);
    throw new Error(`Initialize transaction failed: ${initResult.error}`);
  }

  const postVaultSnap = runner.getAccountSnapshot(vaultPda);
  console.log("  Post-Init Vault Lamports:", postVaultSnap?.lamports.toString());
  console.log("  Post-Init Vault Data Length:", postVaultSnap?.data.length, "bytes");

  // 3. Build Anchor `deposit` instruction
  // Discriminator for deposit: [242, 35, 198, 137, 82, 225, 242, 182]
  console.log("\n[Test 3] Simulating Anchor 'deposit' of 2 SOL (2_000_000_000 lamports):");
  const depositDiscriminator = Buffer.from([242, 35, 198, 137, 82, 225, 242, 182]);
  const depositAmountBuf = Buffer.alloc(8);
  depositAmountBuf.writeBigUInt64LE(2_000_000_000n, 0);
  const depositData = Buffer.concat([depositDiscriminator, depositAmountBuf]);

  const depositIx = new TransactionInstruction({
    programId,
    keys: [
      { pubkey: userKeypair.publicKey, isSigner: true, isWritable: true },
      { pubkey: vaultPda, isSigner: false, isWritable: true },
      { pubkey: userPositionPda, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: depositData,
  });

  const depositTx = new Transaction({
    recentBlockhash: runner.getLatestBlockhash(),
    feePayer: userKeypair.publicKey,
  }).add(depositIx);
  depositTx.sign(userKeypair);

  const depositResult = runner.executeTransaction(depositTx, [vaultPda, userPositionPda]);
  console.log("  Deposit Success:", depositResult.success);
  console.log("  Compute Units Consumed:", depositResult.computeUnitsConsumed.toString());
  if (!depositResult.success) {
    console.error("  Deposit Logs:", depositResult.logs);
    throw new Error(`Deposit transaction failed: ${depositResult.error}`);
  }

  const postDepositVault = runner.getAccountSnapshot(vaultPda);
  const postDepositUserPos = runner.getAccountSnapshot(userPositionPda);
  console.log("  Post-Deposit Vault Total Lamports:", postDepositVault?.lamports.toString());
  console.log("  Post-Deposit UserPosition Lamports:", postDepositUserPos?.lamports.toString());

  // 4. Test State Cloning & Differential Execution with Malicious V2 Bytecode
  console.log("\n[Test 4] Testing Candidate Bytecode Replacement (Malicious V2):");
  const maliciousElf = fs.readFileSync(path.join(payloadsDir, "vault_v2_malicious.so"));

  // Create isolated sandbox instance representing pre-upgrade state
  const sandboxV2 = LiteSVMRunner.createWithProgram({
    programId,
    programBytecode: maliciousElf,
    payer: authorityKeypair.publicKey,
    clonedAccounts: [postDepositVault!, postDepositUserPos!],
  });

  console.log("  Pre-upgrade snapshot cloned into candidate V2 sandbox.");
  const candidateVaultPre = sandboxV2.getAccountSnapshot(vaultPda);
  console.log("  Candidate Sandbox Pre-Execution Vault Balance:", candidateVaultPre?.lamports.toString());

  if (candidateVaultPre?.lamports !== postDepositVault?.lamports) {
    throw new Error("Cloned pre-state does not match original vault balance!");
  }

  console.log("\n>>> ALL SUBSTEP 4.1 TESTS PASSED SUCCESSFULLY! <<<\n");
}

runTests().catch((err) => {
  console.error("Test failed with error:", err);
  process.exit(1);
});
