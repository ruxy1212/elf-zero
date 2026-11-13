import * as fs from "fs";
import * as path from "path";
import { PublicKey } from "@solana/web3.js";
import {
  parseElfBytecode,
  parseOnChainBufferAccount,
  decodeBufferAccountToElf,
} from "./elfParser";

function runTests() {
  console.log("=== ElfZero: Substep 3.1 ELF Parser Verification ===");

  const payloadsDir = path.resolve(__dirname, "../../../payloads");
  const testFiles = [
    {
      name: "vault_v1_clean.so",
      expectedSha: "e0f8a3a24acc56c3e316ca073e26db0c90ba09a5fa193b1c917a52fb1b49db50",
    },
    {
      name: "vault_v2_benign.so",
      expectedSha: "2aa51e3406751b8eab49fb14b7ca0070e9994fb760a31fee42ee907895958796",
    },
    {
      name: "vault_v2_malicious.so",
      expectedSha: "46299c59b06a12fc9d617976cf8d256ac9029220c4c4ef5353247b32d49f461f",
    },
  ];

  // Test 1: Direct ELF file parsing
  console.log("\n[Test 1] Parsing precompiled payload binaries directly:");
  for (const item of testFiles) {
    const filePath = path.join(payloadsDir, item.name);
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const fileBuf = fs.readFileSync(filePath);
    const parsed = parseElfBytecode(fileBuf);

    console.log(`  -> File: ${item.name}`);
    console.log(`     Size: ${parsed.bytecodeSize} bytes`);
    console.log(`     SHA-256: ${parsed.sha256}`);
    console.log(`     Machine Code: ${parsed.header.machine} (SBF)`);
    console.log(`     Is Valid SBF: ${parsed.isValidSbf}`);
    console.log(`     Entry Point: 0x${parsed.header.entryPoint.toString(16)}`);

    if (parsed.sha256.toLowerCase() !== item.expectedSha.toLowerCase()) {
      throw new Error(
        `SHA-256 mismatch for ${item.name}! Expected ${item.expectedSha}, got ${parsed.sha256}`
      );
    }
    if (!parsed.isValidSbf) {
      throw new Error(`Expected valid SBF for ${item.name}`);
    }
  }

  // Test 2: Mock On-Chain UpgradeableLoaderState::Buffer account
  console.log("\n[Test 2] Simulating On-Chain UpgradeableLoaderState::Buffer account layout:");
  const mockAuthority = new PublicKey("38exe61HseYjzaw3fyebML3hXaf8QENViQEcvzB1QSDU");
  const sampleElf = fs.readFileSync(path.join(payloadsDir, "vault_v2_malicious.so"));

  // Layout: 4 bytes discriminant (1) + 1 byte option (1) + 32 bytes authority + ELF bytes
  const bufferHeader = Buffer.alloc(37);
  bufferHeader.writeUInt32LE(1, 0); // UpgradeableLoaderState::Buffer
  bufferHeader.writeUInt8(1, 4); // Some(authority)
  mockAuthority.toBuffer().copy(bufferHeader, 5);

  const mockOnChainAccountData = Buffer.concat([bufferHeader, sampleElf]);
  console.log(`  Mock Account Total Data Length: ${mockOnChainAccountData.length} bytes`);

  const mockBufferPubkey = new PublicKey("BuffEr1111111111111111111111111111111111111");
  const parsedAccount = parseOnChainBufferAccount(mockOnChainAccountData, mockBufferPubkey);

  console.log(`  Decoded Authority: ${parsedAccount.authority?.toBase58()}`);
  if (parsedAccount.authority?.toBase58() !== mockAuthority.toBase58()) {
    throw new Error(
      `Decoded authority mismatch! Expected ${mockAuthority.toBase58()}, got ${parsedAccount.authority?.toBase58()}`
    );
  }

  const decodedElf = decodeBufferAccountToElf(
    mockOnChainAccountData,
    mockBufferPubkey.toBase58()
  );

  console.log(`  Decoded Bytecode SHA-256: ${decodedElf.sha256}`);
  console.log(`  Decoded Bytecode Size: ${decodedElf.bytecodeSize} bytes`);

  if (decodedElf.sha256 !== testFiles[2].expectedSha) {
    throw new Error(
      `Decoded bytecode hash mismatch! Expected ${testFiles[2].expectedSha}, got ${decodedElf.sha256}`
    );
  }

  console.log("\n>>> ALL SUBSTEP 3.1 TESTS PASSED SUCCESSFULLY! <<<\n");
}

runTests();
