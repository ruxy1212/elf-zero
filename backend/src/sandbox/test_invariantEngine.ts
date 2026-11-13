import * as fs from "fs";
import * as path from "path";
import { PublicKey } from "@solana/web3.js";
import { InvariantEngine } from "./invariantEngine";

async function runTests() {
  console.log("=== ElfZero: Substep 4.2 Differential Invariant Engine Verification ===");

  const programId = new PublicKey("D8r3d2uXQn9wYE96BRjyYqmqReFbziK5rfSwdYvHEtkT");
  const payloadsDir = path.resolve(__dirname, "../../../payloads");
  const engine = new InvariantEngine(programId);

  // 1. Audit V1 Clean
  console.log("\n[Test 1] Auditing Baseline Payload (vault_v1_clean.so):");
  const cleanElf = fs.readFileSync(path.join(payloadsDir, "vault_v1_clean.so"));
  const reportV1 = await engine.evaluateCandidateBytecode(cleanElf, "v1_clean_hash");
  console.log(`  Verdict: ${reportV1.verdict}`);
  console.log(`  Is Safe To Upgrade: ${reportV1.isSafeToUpgrade}`);
  console.log(`  Violations Count: ${reportV1.violations.length}`);
  for (const v of reportV1.violations) {
    console.log(`    - [${v.severity}] ${v.name}: ${v.details}`);
  }
  console.log(`  Recommended Action: ${reportV1.recommendedAction}`);

  if (reportV1.verdict !== "SAFE" || !reportV1.isSafeToUpgrade) {
    throw new Error(`Expected V1 Clean to be SAFE, got ${reportV1.verdict}`);
  }

  // 2. Audit V2 Benign
  console.log("\n[Test 2] Auditing Benign Upgrade Candidate (vault_v2_benign.so):");
  const benignElf = fs.readFileSync(path.join(payloadsDir, "vault_v2_benign.so"));
  const reportV2Benign = await engine.evaluateCandidateBytecode(benignElf, "v2_benign_hash");
  console.log(`  Verdict: ${reportV2Benign.verdict}`);
  console.log(`  Is Safe To Upgrade: ${reportV2Benign.isSafeToUpgrade}`);
  console.log(`  Violations Count: ${reportV2Benign.violations.length}`);
  console.log(`  Recommended Action: ${reportV2Benign.recommendedAction}`);

  if (reportV2Benign.verdict !== "SAFE" || !reportV2Benign.isSafeToUpgrade) {
    throw new Error(`Expected V2 Benign to be SAFE, got ${reportV2Benign.verdict}`);
  }

  // 3. Audit V2 Malicious
  console.log("\n[Test 3] Auditing Malicious Exploit Upgrade (vault_v2_malicious.so):");
  const maliciousElf = fs.readFileSync(path.join(payloadsDir, "vault_v2_malicious.so"));
  const reportV2Malicious = await engine.evaluateCandidateBytecode(maliciousElf, "v2_malicious_hash");
  console.log(`  Verdict: ${reportV2Malicious.verdict}`);
  console.log(`  Is Safe To Upgrade: ${reportV2Malicious.isSafeToUpgrade}`);
  console.log(`  Violations Count: ${reportV2Malicious.violations.length}`);
  console.log(`  Recommended Action: ${reportV2Malicious.recommendedAction}`);

  for (const violation of reportV2Malicious.violations) {
    console.log(`    - [${violation.severity}] ${violation.name}: ${violation.details}`);
  }

  if (reportV2Malicious.verdict !== "MALICIOUS_BACKDOOR_DETECTED") {
    throw new Error(
      `Expected V2 Malicious to be flagged as MALICIOUS_BACKDOOR_DETECTED, got ${reportV2Malicious.verdict}`
    );
  }
  if (reportV2Malicious.isSafeToUpgrade) {
    throw new Error("Malicious payload must NOT be safe to upgrade!");
  }
  if (reportV2Malicious.recommendedAction !== "TRIGGER_EMERGENCY_EXIT_AND_ABORT") {
    throw new Error("Recommended action must be TRIGGER_EMERGENCY_EXIT_AND_ABORT!");
  }

  console.log("\n>>> ALL SUBSTEP 4.2 INVARIANT ENGINE TESTS PASSED! <<<\n");
}

runTests().catch((err) => {
  console.error("Test failed with error:", err);
  process.exit(1);
});
