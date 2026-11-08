# ElfZero: Engineering Progress & State Checkpoint

**Date:** November 8, 2026  
**Branch:** `dev`  
**Current Milestone:** Phase 2.1 Complete (Anchor Smart Contract & SBF Compilation Verified)

---

## 1. Executive Summary & Status

ElfZero is an Autonomous Upgradability Guardian and Program-Level Rollback Engine on Solana. It continuously monitors program upgrade buffers on-chain, replicates the proposed ELF bytecode into an isolated local LiteSVM environment, executes differential invariant sweeps against pre-upgrade state snapshots, and automatically triggers non-custodial emergency exits (`emergency_exit`) if invariant violations or unauthorized drains are detected.

Today's session established the repository foundation, environment tooling, deterministic role keypairs, Anchor 1.x smart contract code, and completed the 21-minute initial SBF compilation (`cargo-build-sbf`) with zero build errors.

---

## 2. Environment & Tooling Architecture

### Runtime Environment Mapping
- **Host OS:** Windows 10/11 x64 (NTFS directory: `C:\laragon\www\react\ideas\solana-grant\elf-zero`).
- **Build / SBF Environment:** WSL2 Ubuntu (`wsl -d Ubuntu bash -l -c "..."`).
  - Required for Solana SBF toolchain (Agave 3.1.10 / Anchor 1.2.1) and native Linux bindings required by `litesvm@0.2.0`.
  - Toolchain version: `--tools-version v1.52` (Rust 1.89.0-dev sbpf), pre-cached locally in `~/.cache/solana/v1.52/platform-tools`.
- **Package Manager:** `pnpm` (Windows: `pnpm.cmd`, Linux: `pnpm`).

### Network & RPC Configuration
- **Cluster:** Solana Devnet.
- **RPC Endpoint Requirement:** Must use **Helius RPC** (`https://devnet.helius-rpc.com/?api-key=...`) per user specification; do NOT use standard public `api.devnet.solana.com` due to aggressive rate limits and drop rates.

---

## 3. Work Completed

### Phase 1: Workspace Scaffolding & Setup (`0defafd`)
1. **Root Workspace Configs:**
   - Root `Cargo.toml` configured with `resolver = "2"` and members `["programs/*"]`.
   - `Anchor.toml` configured for Agave / Anchor 1.2.x.
   - Comprehensive `.gitignore` protecting secrets, `target/`, node modules, and `.keys/`.
2. **Backend Setup (`backend/`):**
   - Package setup with `@anchor-lang/core@1.2.2`, `@solana/web3.js@1.99.0`, `litesvm@0.2.0`, `openai@7.53.0`.
   - Installed via `pnpm.cmd install`.
   - Setup `tsconfig.json`, `.env.example`, `.env`, and key loading helpers (`keys.ts`, `genKeys.ts`).
3. **Frontend Setup (`frontend/`):**
   - React 19 + Vite + Tailwind CSS v4 + `@solana/wallet-adapter-react`.
   - Installed via `pnpm.cmd install`.
4. **Deterministic Role Keypairs Generated:**
   - Saved in `backend/.keys/` (gitignored, file permissions protected):
     - **Authority (Upgrade & Vault Admin):** `38exe61HseYjzaw3fyebML3hXaf8QENViQEcvzB1QSDU`
     - **Guardian (Autonomous Security Agent):** `5EwpC6npjFbHtyHXtfVdsagTmJmwWzgh53EL66wagNod`
     - **Demo User (Depositor):** `5RL7Z7qJb4LDwQi5xoaXDsr93oK8MnRPVidBb3opRuNc`
5. **Role Account Funding (0.5 SOL Each on Devnet):**
   - Transferred from CLI keypair (`~/.config/solana/id.json`):
     - Authority TX: `4gCTgoBKwUHvDGK2qCH2CKJe931sEqkdzzNe5j9mBcHYSaMzJcmzD7SkaaMZeaPejUG7EoaFHGBghfu2MN7NwSk6`
     - Guardian TX: `5aetX15Ysb5DcZB77qUTWh9M1WTn6FMiq9nAaZ5x6xKDmKR5yGbJtz7y7Z6xqTZUx5mEgY9cv6Rky2TL3hx6FYpc`
     - Demo User TX: `4nGAdKVMHJWk4Zw3XMhSavhdTCjacU2yWJSJkhpcyz5DfRe1Vteso7KqMGqQuZeEvMHVJXsoMvMBTZ2rWykqgHrs`

### Phase 2.1: Smart Contract Implementation & SBF Compilation (`1a5c95a`)
1. **Program ID & Keypair:**
   - Generated `target/deploy/elfzero_vault-keypair.json`.
   - **Program ID:** `D8r3d2uXQn9wYE96BRjyYqmqReFbziK5rfSwdYvHEtkT`.
   - Configured in `Anchor.toml`, `backend/.env`, and `declare_id!("D8r3d2uXQn9wYE96BRjyYqmqReFbziK5rfSwdYvHEtkT")`.
2. **Contract Architecture (`programs/elfzero_vault/`):**
   - `src/state.rs`:
     - `Vault`: Seeds `[b"vault"]`, tracks `authority`, `guardian`, `total_deposits`, `bump`.
     - `UserPosition`: Seeds `[b"user-position", owner.as_ref()]`, tracks `owner`, `deposited_amount`, `bump`.
   - `src/errors.rs`: Structured error codes (`Unauthorized`, `InsufficientFunds`, `MathOverflow`, `InvalidGuardian`, `EmergencyExitRestrictedToOwner`).
   - `src/instructions/initialize.rs`: Vault initialization, stores authority and guardian.
   - `src/instructions/deposit.rs`: User deposit with CPI transfer (`CpiContext::new(system_program.key(), ...)`).
   - `src/instructions/withdraw.rs`: Standard user withdrawal with feature-flagged variations:
     - Default: Standard withdraw.
     - Feature `benign-v2`: Gas/computation optimizations.
     - Feature `malicious-v2`: Authority drain backdoor bypassing position checks.
   - `src/instructions/emergency_exit.rs`: Guardian-triggered emergency exit.
     - **Non-custodial Guarantee:** Explicitly constrained by Anchor:
       `constraint = destination.key() == user_position.owner @ VaultError::EmergencyExitRestrictedToOwner`
       Funds can **only** ever be returned to the original position depositor.
3. **Compilation Verification:**
   - Executed `cargo-build-sbf --tools-version v1.52 --manifest-path programs/elfzero_vault/Cargo.toml`.
   - Compilation completed in 21m 19s.
   - Output binary verified: `target/deploy/elfzero_vault.so` (184,840 bytes).

---

## 4. Key Learnings & Technical Nuances

1. **Agave / Anchor 1.x Syntax Updates:**
   - Package `@anchor-lang/core@1.2.2` replaces older `@coral-xyz/anchor`.
   - `CpiContext::new` requires `ctx.accounts.system_program.key()`, NOT `.to_account_info()`.
   - `cargo-build-sbf` requires `--tools-version v1.52` to use the pre-downloaded platform-tools cached on WSL, avoiding GitHub tarball download timeouts.
2. **PowerShell vs WSL:**
   - Windows PowerShell has script execution restrictions for `npm.ps1`/`pnpm.ps1` (use `pnpm.cmd`).
   - SBF compilation and LiteSVM execution must run under WSL Ubuntu.

---

## 5. Next Steps for Next Session

### Immediate: Phase 2.2 Execution
1. **Compile the 3 Payload Variants:**
   - Clean V1: copy `target/deploy/elfzero_vault.so` -> `payloads/vault_v1_clean.so`.
   - Benign V2: compile with `--features benign-v2` -> `payloads/vault_v2_benign.so`.
   - Malicious V2: compile with `--features malicious-v2` -> `payloads/vault_v2_malicious.so`.
   - Record SHA-256 hashes to guarantee binary differentiation.
2. **Deploy V1 to Devnet via Helius RPC:**
   - Configure Helius API key in `Anchor.toml` and `backend/.env`.
   - Deploy `target/deploy/elfzero_vault.so` with upgrade authority `backend/.keys/authority.json`.
   - Initialize Vault on-chain using Authority & Guardian public keys.

### Subsequent Phases:
- **Phase 3:** Buffer Watcher (`backend/src/watcher/`) to detect buffer write/deploy transactions.
- **Phase 4:** LiteSVM Sandbox Differential Runner (`backend/src/sandbox/`) & Invariant Engine.
- **Phase 5:** Guardian Auto-Exit Executor (`backend/src/guardian/`) & Attack Orchestrator.
- **Phase 6:** Frontend Dashboard with live WebSocket feeds and real-time alerts.
