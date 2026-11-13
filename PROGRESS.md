# ElfZero: Engineering Progress & State Checkpoint

**Date:** November 13, 2026  
**Branch:** `dev`  
**Current Milestone:** Substep 4.2 Complete (Differential Invariant Engine Verified Across All 3 Binaries)

---

## 1. Executive Summary & Status

ElfZero is an Autonomous Upgradability Guardian and Program-Level Rollback Engine on Solana. It continuously monitors program upgrade buffers on-chain, replicates the proposed ELF bytecode into an isolated local LiteSVM environment, executes differential invariant sweeps against pre-upgrade state snapshots, and automatically triggers non-custodial emergency exits (`emergency_exit`) if invariant violations or unauthorized drains are detected.

**Phase 4 Progress:**
- **Substep 4.1 (`8ab4b7d`):** In-Memory Program Loader & State Cloner (`backend/src/sandbox/litesvmRunner.ts` and `types.ts`).
- **Substep 4.2:** Pre-Upgrade Scenario Matrix & Differential Invariant Engine (`backend/src/sandbox/invariantEngine.ts` and `test_invariantEngine.ts`).

---

## 2. Invariant Rules & Scenario Matrix (Substep 4.2)

### Invariant Checks Implemented
1. **`INV_RENT_FLOOR` (Rent Exemption Floor Protection):**
   - Asserts that the vault account balance never drops below the minimum rent floor (`1,454,640` lamports).
2. **`INV_CONSERVATION` (Deposit Conservation):**
   - Asserts that any balance reduction in the vault matches the exact balance reduction of the requesting user's `UserPosition` account.
3. **`INV_UNAUTHORIZED_DRAIN` (Backdoor Drain Detection):**
   - Asserts that authority or third-party callers cannot extract funds without debiting a corresponding user position.
   - Detects the exact unauthorized drain backdoor compiled into `vault_v2_malicious.so`.
4. **`INV_NON_CUSTODIAL_EXIT` (Guardian Rescue Guarantee):**
   - Asserts that guardian emergency exits return funds strictly to `userPosition.owner`, preventing custodial redirects.

### Audit Test Matrix Results Across Payloads
```text
=== ElfZero: Substep 4.2 Differential Invariant Engine Verification ===

[Test 1] Auditing Baseline Payload (vault_v1_clean.so):
  Verdict: SAFE
  Is Safe To Upgrade: true
  Violations Count: 0
  Recommended Action: PROCEED_WITH_UPGRADE

[Test 2] Auditing Benign Upgrade Candidate (vault_v2_benign.so):
  Verdict: SAFE
  Is Safe To Upgrade: true
  Violations Count: 0
  Recommended Action: PROCEED_WITH_UPGRADE

[Test 3] Auditing Malicious Exploit Upgrade (vault_v2_malicious.so):
  Verdict: MALICIOUS_BACKDOOR_DETECTED
  Is Safe To Upgrade: false
  Violations Count: 1
  Recommended Action: TRIGGER_EMERGENCY_EXIT_AND_ABORT
    - [CRITICAL] Unauthorized Authority Drain Protection: CRITICAL BACKDOOR DETECTED: Upgrade authority was able to drain 2,000,000,000 lamports from the vault!

>>> ALL SUBSTEP 4.2 INVARIANT ENGINE TESTS PASSED! <<<
```

---

## 3. Next Substeps

- **Substep 4.3:** LLM Differential Security Reporter (`backend/src/sandbox/llmReporter.ts`)
  - Generates plain-English security advisories and exploit explanations using Google Gemini (`gemini-2.5-flash-lite` via OpenAI SDK).
- **Phase 5:** Guardian Auto-Exit Executor (`backend/src/guardian/exitExecutor.ts`) & Attack Orchestrator
- **Phase 6:** Frontend React Dashboard & WebSocket Live Feed
