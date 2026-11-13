import * as fs from "fs";
import * as path from "path";
import { Connection, PublicKey, Keypair } from "@solana/web3.js";
import { AttackOrchestrator } from "./attackOrchestrator";
import { LiteSVMRunner } from "../sandbox/litesvmRunner";
import {
  getAuthorityKeypair,
  getGuardianKeypair,
  getDemoUserKeypair,
} from "../config/keys";

async function runTests() {
  console.log("=== ElfZero: Substep 5.2 Attack Orchestrator Verification ===");

  const programId = new PublicKey("D8r3d2uXQn9wYE96BRjyYqmqReFbziK5rfSwdYvHEtkT");
  const dummyConnection = new Connection("https://api.devnet.solana.com", "confirmed");

  const orchestrator = new AttackOrchestrator({
    connection: dummyConnection,
    programId,
  });

  // Track timeline events
  const recordedEvents: string[] = [];
  orchestrator.on("timeline", (ev) => {
    recordedEvents.push(ev.stage);
    console.log(`  [Timeline] ${ev.stage}: ${ev.message}`);
  });

  // 1. Run Benign V2 Simulation
  console.log("\n[Test 1] Running Benign V2 Simulation Pipeline:");
  const benignResult = await orchestrator.runSimulation("BENIGN_V2");

  console.log(`  Simulation ID: ${benignResult.simulationId}`);
  console.log(`  Verdict: ${benignResult.auditReport.verdict}`);
  console.log(`  Is Safe: ${benignResult.isSafeToUpgrade}`);
  console.log(`  Risk Score: ${benignResult.advisory.riskScore}/100`);
  console.log(`  Emergency Rescue Triggered: ${benignResult.rescueSummary !== undefined}`);

  if (benignResult.auditReport.verdict !== "SAFE" || !benignResult.isSafeToUpgrade) {
    throw new Error(`Expected benign simulation to be SAFE, got ${benignResult.auditReport.verdict}`);
  }
  if (benignResult.rescueSummary !== undefined) {
    throw new Error("Emergency rescue must NOT be triggered for benign upgrade!");
  }

  // 2. Setup Sandbox for Malicious V2 Rescue Simulation
  console.log("\n[Test 2] Running Malicious V2 Attack & Autonomous Defense Pipeline:");
  const payloadsDir = path.resolve(__dirname, "../../../payloads");
  const cleanElf = fs.readFileSync(path.join(payloadsDir, "vault_v1_clean.so"));

  const authority = getAuthorityKeypair();
  const guardian = getGuardianKeypair();
  const user = getDemoUserKeypair();

  const [vaultPda] = PublicKey.findProgramAddressSync([Buffer.from("vault")], programId);
  const [userPositionPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("position"), user.publicKey.toBuffer()],
    programId
  );

  // Prepare sandbox with 2 SOL deposited
  const sandbox = new LiteSVMRunner(programId);
  sandbox.loadProgram(cleanElf);
  sandbox.airdrop(authority.publicKey, 10_000_000_000n);
  sandbox.airdrop(guardian.publicKey, 10_000_000_000n);
  sandbox.airdrop(user.publicKey, 10_000_000_000n);

  // Initialize vault in sandbox
  const { Transaction, TransactionInstruction, SystemProgram } = await import("@solana/web3.js");
  const initTx = new Transaction({
    recentBlockhash: sandbox.getLatestBlockhash(),
    feePayer: authority.publicKey,
  }).add(
    new TransactionInstruction({
      programId,
      keys: [
        { pubkey: authority.publicKey, isSigner: true, isWritable: true },
        { pubkey: vaultPda, isSigner: false, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data: Buffer.concat([
        Buffer.from([175, 175, 109, 31, 13, 152, 155, 237]),
        authority.publicKey.toBuffer(),
        guardian.publicKey.toBuffer(),
      ]),
    })
  );
  initTx.sign(authority);
  sandbox.executeTransaction(initTx);

  // Deposit 2 SOL
  const depositAmountBuf = Buffer.alloc(8);
  depositAmountBuf.writeBigUInt64LE(2_000_000_000n, 0);
  const depositTx = new Transaction({
    recentBlockhash: sandbox.getLatestBlockhash(),
    feePayer: user.publicKey,
  }).add(
    new TransactionInstruction({
      programId,
      keys: [
        { pubkey: user.publicKey, isSigner: true, isWritable: true },
        { pubkey: vaultPda, isSigner: false, isWritable: true },
        { pubkey: userPositionPda, isSigner: false, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data: Buffer.concat([
        Buffer.from([242, 35, 198, 137, 82, 225, 242, 182]),
        depositAmountBuf,
      ]),
    })
  );
  depositTx.sign(user);
  sandbox.executeTransaction(depositTx);

  // Run malicious simulation with sandboxRunner option
  const maliciousResult = await orchestrator.runSimulation("MALICIOUS_V2", {
    sandboxRunner: sandbox,
  });

  console.log(`\n  Simulation ID: ${maliciousResult.simulationId}`);
  console.log(`  Verdict: ${maliciousResult.auditReport.verdict}`);
  console.log(`  Is Safe: ${maliciousResult.isSafeToUpgrade}`);
  console.log(`  Risk Score: ${maliciousResult.advisory.riskScore}/100`);
  console.log(`  Emergency Rescue Triggered: ${maliciousResult.rescueSummary !== undefined}`);
  console.log(
    `  Positions Rescued: ${maliciousResult.rescueSummary?.totalPositionsRescued} / ${maliciousResult.rescueSummary?.totalPositionsTargeted}`
  );
  console.log(
    `  Total Lamports Rescued: ${maliciousResult.rescueSummary?.totalLamportsRescued.toString()} lamports`
  );

  if (maliciousResult.auditReport.verdict !== "MALICIOUS_BACKDOOR_DETECTED") {
    throw new Error(
      `Expected MALICIOUS_BACKDOOR_DETECTED, got ${maliciousResult.auditReport.verdict}`
    );
  }
  if (maliciousResult.isSafeToUpgrade) {
    throw new Error("Malicious simulation must NOT be safe to upgrade!");
  }
  if (!maliciousResult.rescueSummary || maliciousResult.rescueSummary.totalPositionsRescued !== 1) {
    throw new Error("Expected 1 position to be autonomously rescued!");
  }
  if (maliciousResult.rescueSummary.totalLamportsRescued !== 2_000_000_000n) {
    throw new Error("Expected exactly 2 SOL to be evacuated to user!");
  }

  console.log("\n>>> ALL SUBSTEP 5.2 ATTACK ORCHESTRATOR TESTS PASSED! <<<\n");
}

runTests().catch((err) => {
  console.error("Test failed with error:", err);
  process.exit(1);
});
