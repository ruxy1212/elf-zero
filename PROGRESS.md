# ElfZero: Engineering Progress & State Checkpoint

**Date:** November 12, 2026  
**Branch:** `dev`  
**Current Milestone:** Phase 2 Complete (Program, IDL, Deterministic Payloads, Deployment Instructions Ready)

---

## 1. Executive Summary & Status

ElfZero is an Autonomous Upgradability Guardian and Program-Level Rollback Engine on Solana. It continuously monitors program upgrade buffers on-chain, replicates the proposed ELF bytecode into an isolated local LiteSVM environment, executes differential invariant sweeps against pre-upgrade state snapshots, and automatically triggers non-custodial emergency exits (`emergency_exit`) if invariant violations or unauthorized drains are detected.

**Phase 2 is now fully completed:**
1. Base contract (`elfzero_vault`) implemented, reviewed, and compiled with Agave/Anchor SBF toolchain.
2. Three distinct upgrade `.so` binaries compiled and verified with SHA-256 hashes.
3. IDL generated via `anchor idl build` and distributed to `target/idl/`, `backend/src/idl/`, and `frontend/src/idl/`.
4. Manual deployment command prepared for Devnet using Helius RPC.

---

## 2. Deterministic Payloads & Checksums

All three test payloads are compiled and stored in `payloads/`:

| Payload | File | Size | SHA-256 Checksum | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **V1 Clean** | `payloads/vault_v1_clean.so` | 184,840 bytes | `E0F8A3A24ACC56C3E316CA073E26DB0C90BA09A5FA193B1C917A52FB1B49DB50` | Initial baseline contract for deployment |
| **V2 Benign** | `payloads/vault_v2_benign.so` | 184,960 bytes | `2AA51E3406751B8EAB49FB14B7CA0070E9994FB760A31FEE42EE907895958796` | Safe simulated upgrade (passes invariant tests) |
| **V2 Malicious** | `payloads/vault_v2_malicious.so` | 186,848 bytes | `46299C59B06A12FC9D617976CF8D256AC9029220C4C4EF5353247B32D49F461F` | Exploit upgrade (drains vault, triggers Guardian rescue) |

`target/deploy/elfzero_vault.so` is restored and verified to match `payloads/vault_v1_clean.so`.

---

## 3. Contract Keypairs & Identity

- **Program ID:** `D8r3d2uXQn9wYE96BRjyYqmqReFbziK5rfSwdYvHEtkT`
- **Program Keypair:** `target/deploy/elfzero_vault-keypair.json`
- **Authority (Upgrade Authority & Admin):** `38exe61HseYjzaw3fyebML3hXaf8QENViQEcvzB1QSDU` (`backend/.keys/authority.json`)
- **Guardian (Autonomous Security Agent):** `5EwpC6npjFbHtyHXtfVdsagTmJmwWzgh53EL66wagNod` (`backend/.keys/guardian.json`)
- **Demo User (Depositor):** `5RL7Z7qJb4LDwQi5xoaXDsr93oK8MnRPVidBb3opRuNc` (`backend/.keys/demo_user.json`)

---

## 4. Manual Devnet Deployment Instructions

To deploy the program manually to Devnet using your Helius RPC:

### Step 1: Ensure Deployer Has Sufficient SOL (~1.5 SOL for ~185 KB Program Rent)
```bash
# Check authority balance (or fund it from your personal CLI keypair):
solana balance 38exe61HseYjzaw3fyebML3hXaf8QENViQEcvzB1QSDU --url "<YOUR_HELIUS_DEVNET_RPC_URL>"
```

### Step 2: Execute Deployment Command
Run inside WSL from the project root (`C:\laragon\www\react\ideas\solana-grant\elf-zero`):
```bash
solana program deploy \
  --url "<YOUR_HELIUS_DEVNET_RPC_URL>" \
  --keypair backend/.keys/authority.json \
  --program-id target/deploy/elfzero_vault-keypair.json \
  --upgrade-authority backend/.keys/authority.json \
  target/deploy/elfzero_vault.so
```

---

## 5. Next Phase: Phase 3 (Buffer Watcher Service)

Following manual deployment:
- **Phase 3:** Build `backend/src/watcher/elfParser.ts` and `backend/src/watcher/bufferWatcher.ts` to monitor on-chain buffer accounts using Helius WebSocket / RPC.
- **Phase 4:** Build LiteSVM Sandbox differential runner & invariant engine.
- **Phase 5:** Build Guardian auto-exit executor & attack simulator.
- **Phase 6:** Build frontend React dashboard with live WebSocket feeds.
