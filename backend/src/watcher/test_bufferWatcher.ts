import * as fs from "fs";
import * as path from "path";
import { Connection, PublicKey } from "@solana/web3.js";
import { BufferWatcher } from "./bufferWatcher";
import { WatcherEvent, ParsedElfBytecode } from "./types";

// Helper to construct a mock BPF buffer account data buffer
function createMockBufferAccount(authority: PublicKey, elfBytes: Buffer): Buffer {
  const header = Buffer.alloc(37);
  header.writeUInt32LE(1, 0); // UpgradeableLoaderState::Buffer
  header.writeUInt8(1, 4); // Option::Some
  authority.toBuffer().copy(header, 5); // Authority at offset 5..37
  return Buffer.concat([header, elfBytes]);
}

async function runTests() {
  console.log("=== ElfZero: Substep 3.2 Buffer Watcher Verification ===");

  const payloadsDir = path.resolve(__dirname, "../../../payloads");
  const cleanElf = fs.readFileSync(path.join(payloadsDir, "vault_v1_clean.so"));
  const maliciousElf = fs.readFileSync(
    path.join(payloadsDir, "vault_v2_malicious.so")
  );

  const mockAuthority = new PublicKey(
    "38exe61HseYjzaw3fyebML3hXaf8QENViQEcvzB1QSDU"
  );
  const mockBufferPubkey = new PublicKey(
    "11111111111111111111111111111112"
  );

  // Mock Connection (no live network call needed for unit test)
  const mockConnection = new Connection("https://api.devnet.solana.com", "confirmed");

  const watcher = new BufferWatcher({
    connection: mockConnection,
    targetAuthority: mockAuthority,
    pollIntervalMs: 0, // Disable background poller for deterministic test
    enableWs: false, // Disable WS for unit test
  });

  // Test 1: Verify filters
  console.log("\n[Test 1] Verifying filter generation:");
  const filters = watcher.buildFilters();
  console.log("  Filters count:", filters.length);
  if (filters.length !== 2) {
    throw new Error(`Expected 2 filters (discriminant + authority), got ${filters.length}`);
  }
  console.log("  Discriminant filter offset:", (filters[0] as any).memcmp.offset);
  console.log("  Authority filter offset:", (filters[1] as any).memcmp.offset);
  if ((filters[1] as any).memcmp.offset !== 5) {
    throw new Error("Authority filter must be at offset 5");
  }

  // Event tracking
  const detectedEvents: WatcherEvent[] = [];
  const bytecodeEvents: { event: WatcherEvent; elf: ParsedElfBytecode }[] = [];
  const invariantEvents: { event: WatcherEvent; elf: ParsedElfBytecode }[] = [];
  const closedEvents: string[] = [];

  watcher.on("bufferDetected", (ev) => {
    detectedEvents.push(ev);
    console.log(`  [Event] bufferDetected: ${ev.type} for buffer ${ev.bufferAddress}`);
  });

  watcher.on("bytecodeExtracted", (ev, elf) => {
    bytecodeEvents.push({ event: ev, elf });
    console.log(
      `  [Event] bytecodeExtracted: ${elf.bytecodeSize} bytes, SHA256: ${elf.sha256.slice(0, 16)}...`
    );
  });

  watcher.on("invariantTriggerReady", (ev, elf) => {
    invariantEvents.push({ event: ev, elf });
    console.log(`  [Event] invariantTriggerReady: Payload ready for LiteSVM simulation!`);
  });

  watcher.on("bufferClosed", (addr) => {
    closedEvents.push(addr);
    console.log(`  [Event] bufferClosed: Buffer account ${addr} closed`);
  });

  // Test 2: Ingest clean V1 buffer
  console.log("\n[Test 2] Ingesting newly detected clean V1 buffer account:");
  const v1AccountData = createMockBufferAccount(mockAuthority, cleanElf);
  await watcher.processBufferAccount(mockBufferPubkey, v1AccountData, 100);

  if (detectedEvents.length !== 1 || detectedEvents[0].type !== "BUFFER_DETECTED") {
    throw new Error("Failed to emit initial BUFFER_DETECTED event");
  }
  if (bytecodeEvents.length !== 1 || !bytecodeEvents[0].elf.isValidSbf) {
    throw new Error("Failed to extract valid SBF bytecode on initial detection");
  }
  if (invariantEvents.length !== 1) {
    throw new Error("Failed to emit invariantTriggerReady on initial detection");
  }
  console.log("  Initial buffer detection succeeded!");

  // Test 3: Deduplication test (re-sending identical buffer should NOT re-trigger invariant)
  console.log("\n[Test 3] Testing deduplication with identical buffer data:");
  await watcher.processBufferAccount(mockBufferPubkey, v1AccountData, 101);
  if (invariantEvents.length !== 1) {
    throw new Error("Deduplication failed: invariantTriggerReady was re-emitted for identical bytecode");
  }
  console.log("  Deduplication verified: duplicate buffer ignored.");

  // Test 4: Ingest buffer update with malicious payload
  console.log("\n[Test 4] Testing buffer update with modified (malicious) bytecode:");
  const v2AccountData = createMockBufferAccount(mockAuthority, maliciousElf);
  await watcher.processBufferAccount(mockBufferPubkey, v2AccountData, 105);

  if (detectedEvents.length !== 2 || detectedEvents[1].type !== "BUFFER_MODIFIED") {
    throw new Error("Failed to emit BUFFER_MODIFIED on bytecode update");
  }
  if (invariantEvents.length !== 2) {
    throw new Error("Failed to emit invariantTriggerReady on buffer modification");
  }
  console.log("  Buffer modification detected and new invariant trigger fired!");
  console.log(`  New payload hash: ${invariantEvents[1].elf.sha256}`);

  // Test 5: Verify cache state
  console.log("\n[Test 5] Verifying internal buffer cache:");
  const known = watcher.getKnownBuffers();
  console.log("  Cached buffers count:", known.size);
  const entry = known.get(mockBufferPubkey.toBase58());
  if (!entry || entry.sha256 !== invariantEvents[1].elf.sha256) {
    throw new Error("Cache entry does not match latest bytecode hash");
  }
  console.log("  Cache state verified!");

  console.log("\n>>> ALL SUBSTEP 3.2 TESTS PASSED SUCCESSFULLY! <<<\n");
}

runTests();
