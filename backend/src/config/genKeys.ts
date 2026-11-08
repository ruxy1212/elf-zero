import { getAuthorityKeypair, getGuardianKeypair, getDemoUserKeypair } from "./keys.js";

async function main() {
  const authority = getAuthorityKeypair();
  const guardian = getGuardianKeypair();
  const demoUser = getDemoUserKeypair();

  console.log("=== ElfZero Deterministic Keypairs ===");
  console.log(`Authority (Protocol Admin / Attacker): ${authority.publicKey.toBase58()}`);
  console.log(`Guardian  (Autonomous Security Agent): ${guardian.publicKey.toBase58()}`);
  console.log(`Demo User (Depositor Account):         ${demoUser.publicKey.toBase58()}`);
}

main().catch(console.error);
