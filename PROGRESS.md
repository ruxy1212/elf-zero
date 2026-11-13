# ElfZero: Engineering Progress & State Checkpoint

**Date:** November 13, 2026  
**Branch:** `dev`  
**Current Milestone:** Phase 3 Complete (Autonomous Buffer Watcher & Event Pipeline Verified)

---

## 1. Executive Summary & Status

ElfZero is an Autonomous Upgradability Guardian and Program-Level Rollback Engine on Solana. It continuously monitors program upgrade buffers on-chain, replicates the proposed ELF bytecode into an isolated local LiteSVM environment, executes differential invariant sweeps against pre-upgrade state snapshots, and automatically triggers non-custodial emergency exits (`emergency_exit`) if invariant violations or unauthorized drains are detected.

**Phase 3 is now fully completed:**
1. **Substep 3.1 (`e8daaa6`):** ELF Bytecode Parser & Buffer Layout Decoder (`backend/src/watcher/elfParser.ts` and `types.ts`).
2. **Substep 3.2:** Real-Time Buffer Watcher & Event Pipeline (`backend/src/watcher/bufferWatcher.ts` and `test_bufferWatcher.ts`).

---

## 2. Phase 3 Architecture: Buffer Watcher Service

### Core Components
- **`backend/src/watcher/types.ts`:** Typed interfaces for parsed SBF ELF headers, bytecode summaries, on-chain buffer metadata, and watcher event streams.
- **`backend/src/watcher/elfParser.ts`:**
  - Decodes on-chain `UpgradeableLoaderState::Buffer` accounts (discriminator `[1, 0, 0, 0]`, authority `Option<Pubkey>` at offset 4..37).
  - Dynamically discovers the start of the ELF binary using magic bytes `\x7fELF` (`0x7f, 0x45, 0x4c, 0x46`).
  - Validates SBF architecture (`e_machine = 263` for `EM_SBF` or `247` for `EM_BPF`, 64-bit, little-endian).
  - Calculates deterministic SHA-256 digests and extracts program entry points.
- **`backend/src/watcher/bufferWatcher.ts`:**
  - Dual-mode hybrid architecture:
    1. **WebSocket Listener (`onProgramAccountChange`):** Zero-latency detection of buffer initialization and bytecode writes.
    2. **Resilient Polling Fallback (`getProgramAccounts`):** Periodic scan with server-side `memcmp` filters (offset 0 discriminant + offset 5 authority) to prevent missed blocks.
  - Ingests accounts, decodes ELF binaries, deduplicates identical payloads, and maintains an in-memory cache of known buffers.
  - Emits typed events:
    - `bufferDetected` (`BUFFER_DETECTED` / `BUFFER_MODIFIED`)
    - `bytecodeExtracted` (`BYTECODE_EXTRACTED`)
    - `invariantTriggerReady` (`INVARIANT_TRIGGER_READY` -> feeds Phase 4 LiteSVM sandbox)
    - `bufferClosed`

### Verification Results
```text
=== ElfZero: Substep 3.2 Buffer Watcher Verification ===
[Test 1] Verifying filter generation:
  Filters count: 2 (Discriminant offset 0, Authority offset 5)
[Test 2] Ingesting newly detected clean V1 buffer account:
  [Event] bufferDetected: BUFFER_DETECTED for buffer 11111111111111111111111111111112
  [Event] bytecodeExtracted: 184840 bytes, SHA256: e0f8a3a24acc56c3...
  [Event] invariantTriggerReady: Payload ready for LiteSVM simulation!
[Test 3] Testing deduplication with identical buffer data:
  Deduplication verified: duplicate buffer ignored.
[Test 4] Testing buffer update with modified (malicious) bytecode:
  [Event] bufferDetected: BUFFER_MODIFIED for buffer 11111111111111111111111111111112
  [Event] bytecodeExtracted: 186848 bytes, SHA256: 46299c59b06a12fc...
  [Event] invariantTriggerReady: Payload ready for LiteSVM simulation!
[Test 5] Verifying internal buffer cache:
  Cached buffers count: 1 (consistent)
>>> ALL SUBSTEP 3.2 TESTS PASSED SUCCESSFULLY! <<<
```

---

## 3. Next Phase: Phase 4 (LiteSVM Sandbox Differential Execution & Invariant Engine)

Following Phase 3 completion:
- **Phase 4:**
  - **4.1:** LiteSVM Program Loader & State Duplicator (`backend/src/sandbox/litesvmRunner.ts`)
  - **4.2:** Pre-Upgrade Scenario Builder & Differential Invariant Engine (`backend/src/sandbox/invariantEngine.ts`)
  - **4.3:** LLM Audit / Report Generator (`backend/src/sandbox/llmReporter.ts`)
- **Phase 5:** Guardian Auto-Exit Executor (`backend/src/guardian/`) & Attack Orchestrator
- **Phase 6:** Frontend Dashboard & WebSocket Live Feed
