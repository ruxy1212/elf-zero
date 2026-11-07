# ElfZero: Agent-Executable Build Plan

**Track:** AI (Agent that acts onchain)
**One-Liner:** An autonomous security agent that detects staged Solana program upgrades in `BPFLoaderUpgradeable` buffers, proves malicious state transitions via differential execution in LiteSVM, and executes a non-custodial emergency withdrawal before the upgrade goes live.

---

## 1. System Architecture & Data Flow

```text
[Solana Devnet RPC]
       |
       | 1. Poll BPFLoaderUpgradeable buffers (memcmp on authority / Squads proposals)
       v
[Watcher Service] ---> [Event Queue: StagedBufferDetected]
                               |
                               | 2. Fetch live ProgramData ELF + Staged Buffer ELF + Vault State
                               v
                     [LiteSVM Sandbox Runner]
                     (Forks state into Instance A [Old ELF] & Instance B [New ELF])
                     (Runs IDL Instruction Battery + Raw ELF Discriminator Fuzzing)
                               |
                               | 3. Output Token-Balance Delta Matrix
                               v
                     [Deterministic Invariant Judge]
                     (Checks if non-depositor gains Vault tokens in B vs A)
                               |
            +------------------+------------------+
            | (Violation = TRUE)                  | (Violation = FALSE / Warn)
            v                                     v
[Guardian Executor]                     [OpenAI SDK Reporter]
(Fires `emergency_withdraw` on Devnet   (Generates structured diff & human-readable
 to return funds to owner's wallet)      incident report via `gpt-4o`)
            |                                     |
            +------------------+------------------+
                               |
                               v
                 [Frontend Dashboard & Judge Simulator]
                 (Live WebSocket feed, Explorer links, 1-Click Attack Trigger)

```

### Core Security Design Decisions (Addressing Real-World Edge Cases)

1. **Backdoored Instruction + ELF Discriminator Extraction:** Attackers will not publish a new IDL for a malicious upgrade. Our Malicious v2 backdoors the *existing* `withdraw` instruction (removing the owner check when signed by the upgrade authority) AND our Sandbox includes an ELF byte-scanner that extracts 8-byte Anchor instruction discriminators directly from the `.rodata` section of the buffered binary to catch newly injected instructions.
2. **Burner Buffer Evasion & Multisig Framing:** While a single-key attacker could write a buffer with an anonymous burner key and atomically transfer authority + upgrade in one transaction, institutional protocols use Squads multisigs or timelocks where the buffer pubkey must be staged on-chain prior to execution. ElfZero monitors both direct authority buffers and staged governance buffers, flagging instant-upgrade single-key authorities with a high baseline risk score.
3. **Zero-Custody Scoped Exit:** The `emergency_withdraw` instruction on the Vault contract enforces in Rust constraints (`constraint = destination.owner == position.owner`) that the Guardian agent can *only* route funds back to the original depositor's wallet. Even a compromised agent key cannot steal funds.

---

## 2. Target Repository Structure (Modular Architecture)

```text
elfzero/
├── Anchor.toml
├── programs/
│   └── elfzero_vault/
│       ├── Cargo.toml               # Defines [features]: benign-v2, malicious-v2
│       └── src/
│           ├── lib.rs               # Entrypoint & instruction routing
│           ├── state.rs             # VaultState & UserPosition structs
│           ├── errors.rs            # Custom error codes
│           └── instructions/
│               ├── initialize.rs    # Init vault & set guardian pubkey
│               ├── deposit.rs       # User deposits SPL/lamports
│               ├── withdraw.rs      # Uses #[cfg(feature = "...")] for v1/benign/malicious
│               └── emergency_exit.rs# Guardian-signed, owner-constrained exit
├── payloads/
│   ├── vault_v1_clean.so            # Baseline live program binary (default build)
│   ├── vault_v2_benign.so           # Built via `--features benign-v2`
│   └── vault_v2_malicious.so        # Built via `--features malicious-v2`
├── backend/
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env.example
│   └── src/
│       ├── index.ts                 # Express + WebSocket server entrypoint
│       ├── config/
│       │   └── keys.ts              # Loads authority, guardian, and demo user keypairs
│       ├── watcher/
│       │   ├── bufferWatcher.ts     # Polls BPFLoaderUpgradeable buffers & ProgramData
│       │   └── elfParser.ts         # Strips 37-byte buffer header & scans 8-byte discriminators
│       ├── sandbox/
│       │   ├── litesvmRunner.ts     # Spawns Old vs New LiteSVM instances & clones RPC state
│       │   └── scenarioBuilder.ts   # Builds user + authority-signed transaction battery
│       ├── judge/
│       │   ├── invariantEngine.ts   # Deterministic token/lamport delta comparison
│       │   └── llmReporter.ts       # Uses OpenAI SDK to summarize JSON diff into plain English
│       ├── guardian/
│       │   └── exitExecutor.ts      # Signs and sends `emergency_withdraw` on Devnet
│       └── simulator/
│           └── attackOrchestrator.ts# 1-click Devnet staging script for judges
└── frontend/
    ├── package.json
    ├── vite.config.ts
    └── src/
        ├── App.tsx
        ├── components/
        │   ├── StatusBanner.tsx     # Protected / Warning / Critical status header
        │   ├── VaultPositionCard.tsx# Shows live Devnet vault balance, user balance, Guardian key
        │   ├── JudgeControlPanel.tsx# 1-Click buttons: "Stage Benign v2" & "Stage Malicious v2"
        │   ├── SandboxDiffViewer.tsx# Side-by-side table of Instance A vs Instance B deltas
        │   └── IncidentReport.tsx   # Live AI incident explanation & Devnet Explorer links
        └── services/
            └── api.ts               # WebSocket & REST hooks to backend

```

---

## 3. Step-by-Step Execution Phases

### Phase 1: Environment Setup & Devnet Keypair Provisioning

* **Step 1.1: Initialize Workspace & Dependencies**
1. Create the root directory `elfzero` and initialize an Anchor workspace (`anchor init elfzero_vault`).
2. Create `backend/` (Node.js + TypeScript, `@solana/web3.js@^1.95.0`, `@coral-xyz/anchor`, `litesvm@^0.2.0`, `openai`, `ws`, `express`) and `frontend/` (React, Vite, TypeScript, Tailwind CSS, DaisyUI, `@solana/wallet-adapter-react`).


* **Step 1.2: Generate Deterministic Role Keypairs**
1. Generate three dedicated keypairs stored in `backend/.keys/` (gitignored, loaded via env/volume in production):
* `authority.json`: Program upgrade authority (acts as the protocol admin / attacker).
* `guardian.json`: ElfZero autonomous agent keypair (authorized only for `emergency_withdraw`).
* `demo_user.json`: Pre-funded depositor account so judges can test immediately without needing a Devnet faucet.


2. Configure Solana CLI to Devnet (`https://api.devnet.solana.com`) and fund all three keypairs with Devnet SOL.



---

### Phase 2: Smart Contract Development & Feature-Flagged Three-Binary Compilation

> **CRITICAL AGENT RULE:** Do NOT rewrite and revert Rust source files between builds. Use Cargo feature flags (`#[cfg(feature = "...")]`) inside a single codebase so all three `.so` artifacts compile deterministically.

* **Step 2.1: Configure Cargo Feature Flags in `programs/elfzero_vault/Cargo.toml**`
1. Add the following features block to `programs/elfzero_vault/Cargo.toml`:
```toml
[features]
no-entrypoint = []
no-idl = []
no-log-ix-name = []
cpi = ["no-entrypoint"]
default = []
benign-v2 = []
malicious-v2 = []

```




* **Step 2.2: Implement State & Feature-Gated Instructions**
1. In `programs/elfzero_vault/src/state.rs`, define `Vault` (tracks `authority: Pubkey`, `guardian: Pubkey`, `total_deposited: u64`, `bump: u8`) and `UserPosition` (tracks `owner: Pubkey`, `amount: u64`, `guardian: Pubkey`, `bump: u8`).
2. Implement `initialize`, `deposit`, and `emergency_withdraw`. In `emergency_withdraw`, enforce strict account constraints:
* `signer.key() == user_position.guardian`
* `destination.key() == user_position.owner` (`has_one = owner`)


3. In `programs/elfzero_vault/src/instructions/withdraw.rs`, implement feature-gated logic:
```rust
pub fn handler(ctx: Context<Withdraw>, amount: u64) -> Result<()> {
    let vault = &mut ctx.accounts.vault;
    let position = &mut ctx.accounts.user_position;

    #[cfg(feature = "benign-v2")]
    msg!("ElfZero Vault v2: Benign telemetry log active");

    #[cfg(feature = "malicious-v2")]
    if ctx.accounts.signer.key() == vault.authority {
        // Backdoor: Upgrade authority bypasses owner check and drains entire vault
        let drain_amount = **vault.to_account_info().lamports.borrow();
        let min_rent = Rent::get()?.minimum_balance(vault.to_account_info().data_len());
        let steal_lamports = drain_amount.saturating_sub(min_rent);

        **vault.to_account_info().try_borrow_mut_lamports()? -= steal_lamports;
        **ctx.accounts.signer.to_account_info().try_borrow_mut_lamports()? += steal_lamports;
        vault.total_deposited = 0;
        return Ok(());
    }

    // Standard v1 & benign-v2 check: strictly require depositor signature
    require_keys_eq!(
        ctx.accounts.signer.key(),
        position.owner,
        VaultError::UnauthorizedDepositor
    );
    require!(position.amount >= amount, VaultError::InsufficientFunds);

    position.amount = position.amount.checked_sub(amount).unwrap();
    vault.total_deposited = vault.total_deposited.checked_sub(amount).unwrap();

    **vault.to_account_info().try_borrow_mut_lamports()? -= amount;
    **ctx.accounts.signer.to_account_info().try_borrow_mut_lamports()? += amount;
    Ok(())
}

```




* **Step 2.3: Compile All Three `.so` Payloads Deterministically**
1. Create the `payloads/` directory at the workspace root (`mkdir -p payloads`).
2. **Build Clean v1:**
```bash
anchor build
cp target/deploy/elfzero_vault.so payloads/vault_v1_clean.so

```


3. **Build Benign v2 (via Cargo feature flag):**
```bash
cargo build-sbf --manifest-path programs/elfzero_vault/Cargo.toml -- --features benign-v2
cp target/deploy/elfzero_vault.so payloads/vault_v2_benign.so

```


4. **Build Malicious v2 (via Cargo feature flag):**
```bash
cargo build-sbf --manifest-path programs/elfzero_vault/Cargo.toml -- --features malicious-v2
cp target/deploy/elfzero_vault.so payloads/vault_v2_malicious.so

```


5. Deploy `payloads/vault_v1_clean.so` to Devnet with `--upgrade-authority backend/.keys/authority.json` and record the `PROGRAM_ID`.



---

### Phase 3: Watcher & ELF Binary Parser

* **Step 3.1: Build `elfParser.ts**`
1. Implement `extractElfFromBuffer(bufferAccountData: Buffer): Uint8Array` which validates the `BPFLoaderUpgradeable` buffer discriminator (first 4 bytes = `[1, 0, 0, 0]`) and slices off the 37-byte header (4-byte enum + 1-byte Option tag + 32-byte authority pubkey):
```typescript
export function extractElfFromBuffer(data: Buffer): Uint8Array {
  if (data.length <= 37 || data.readUInt32LE(0) !== 1) {
    throw new Error("Invalid BPFLoaderUpgradeable Buffer account");
  }
  return new Uint8Array(data.subarray(37));
}

```


2. Implement `extractElfFromProgramData(programData: Buffer): Uint8Array` which validates the `ProgramData` discriminator (`readUInt32LE(0) === 3`) and slices off the 45-byte header (`data.subarray(45)`).
3. Implement `scanAnchorDiscriminators(elfBytes: Uint8Array): string[]` to scan for standard 8-byte SHA256(`global:<ix_name>`) instruction preambles and report binary size / section diffs between v1 and v2.


* **Step 3.2: Build `bufferWatcher.ts**`
1. Poll `connection.getProgramAccounts(BPF_LOADER_UPGRADEABLE_ID)` using two `memcmp` filters:
* Byte offset `0`: `bs58.encode(Buffer.from([1, 0, 0, 0]))` (Account type = Buffer).
* Byte offset `5`: `authorityPubkey.toBase58()` (Buffer authority matches monitored program's upgrade authority).


2. Track seen buffer pubkeys and SHA-256 byte hashes in memory. When a new or updated buffer finishes writing, emit `StagedBufferDetected` with `{ programId, bufferPubkey, liveElfBytes, stagedElfBytes }`.



---

### Phase 4: LiteSVM Differential Sandbox & Invariant Judge

> **CRITICAL AGENT RULE:** Use the exact `litesvm` Node.js API signatures shown in Step 4.2 (`new LiteSVM()`, `svm.addProgram(Pubkey, Uint8Array)`, `svm.setAccount(Pubkey, AccountInfoBytes)`, `svm.latestBlockhash()`, `svm.sendTransaction(tx)`, `svm.getBalance(Pubkey)`, and `instanceof FailedTransactionMetadata`). Do NOT invent async wrappers or non-existent methods.

* **Step 4.1: Build `scenarioBuilder.ts**`
1. Construct an array of deterministic unsigned test transactions (`Transaction[]`) paired with their required signers (`Keypair[]`):
* **Scenario 1 (`USER_DEPOSIT`):** Signed by `demoUser`, calls `deposit(1_000_000_000)` (1 SOL).
* **Scenario 2 (`USER_WITHDRAW`):** Signed by `demoUser`, calls `withdraw(500_000_000)` (0.5 SOL).
* **Scenario 3 (`AUTHORITY_DRAIN_PROBE`):** Signed by `authority` (the upgrade authority), passes `vault` and `userPosition` accounts into `withdraw(500_000_000)` where `signer = authority.publicKey`.




* **Step 4.2: Build `litesvmRunner.ts` (Exact `litesvm` Signatures)**
1. Fetch the live `vault` and `userPosition` account states from Devnet RPC (`connection.getMultipleAccountsInfo([vaultPda, userPositionPda])`).
2. Implement the differential runner using the exact `litesvm` API:
```typescript
import { LiteSVM, FailedTransactionMetadata } from "litesvm";
import { PublicKey, SystemProgram, Transaction, Keypair } from "@solana/web3.js";

export interface ScenarioDelta {
  scenarioName: string;
  txSucceeded: boolean;
  vaultDeltaLamports: bigint;
  userDeltaLamports: bigint;
  authorityDeltaLamports: bigint;
  logs: string[];
}

export function runSingleSvmInstance(
  programId: PublicKey,
  elfBytes: Uint8Array,
  clonedAccounts: Array<{ pubkey: PublicKey; lamports: number; data: Buffer; owner: PublicKey; executable: boolean }>,
  demoUser: Keypair,
  authority: Keypair,
  vaultPda: PublicKey,
  scenarios: Array<{ name: string; buildTx: (blockhash: string) => Transaction; signers: Keypair[] }>
): ScenarioDelta[] {
  const svm = new LiteSVM();

  // 1. Load ELF bytecode directly into LiteSVM
  svm.addProgram(programId, elfBytes);

  // 2. Hydrate cloned Devnet PDA accounts (vault, user_position)
  for (const acc of clonedAccounts) {
    svm.setAccount(acc.pubkey, {
      lamports: acc.lamports,
      data: new Uint8Array(acc.data),
      owner: acc.owner,
      executable: acc.executable,
      rentEpoch: 0,
    });
  }

  // 3. Seed deterministic SOL balances for test signers
  svm.setAccount(demoUser.publicKey, {
    lamports: 5_000_000_000,
    data: new Uint8Array(0),
    owner: SystemProgram.programId,
    executable: false,
    rentEpoch: 0,
  });
  svm.setAccount(authority.publicKey, {
    lamports: 5_000_000_000,
    data: new Uint8Array(0),
    owner: SystemProgram.programId,
    executable: false,
    rentEpoch: 0,
  });

  const results: ScenarioDelta[] = [];

  // 4. Execute each scenario and record exact lamport deltas
  for (const scenario of scenarios) {
    const preVault = svm.getBalance(vaultPda) ?? 0n;
    const preUser = svm.getBalance(demoUser.publicKey) ?? 0n;
    const preAuth = svm.getBalance(authority.publicKey) ?? 0n;

    const blockhash = svm.latestBlockhash();
    const tx = scenario.buildTx(blockhash);
    tx.recentBlockhash = blockhash;
    tx.feePayer = scenario.signers[0].publicKey;
    tx.sign(...scenario.signers);

    const res = svm.sendTransaction(tx);
    const txSucceeded = !(res instanceof FailedTransactionMetadata);
    const logs = res.logs();

    const postVault = svm.getBalance(vaultPda) ?? 0n;
    const postUser = svm.getBalance(demoUser.publicKey) ?? 0n;
    const postAuth = svm.getBalance(authority.publicKey) ?? 0n;

    results.push({
      scenarioName: scenario.name,
      txSucceeded,
      vaultDeltaLamports: postVault - preVault,
      userDeltaLamports: postUser - preUser,
      authorityDeltaLamports: postAuth - preAuth,
      logs,
    });

    // Advance blockhash so subsequent transactions are never deduplicated
    svm.expireBlockhash();
  }

  return results;
}

```


3. Call `runSingleSvmInstance` twice: once with `liveElfBytes` (`svmOld`) and once with `stagedElfBytes` (`svmNew`), returning both `ScenarioDelta[]` arrays to the Invariant Judge.


* **Step 4.3: Build `invariantEngine.ts**`
1. Evaluate the core invariant across every scenario transaction:

$$\Delta \text{Balance}_{\text{New}}(\text{Authority}) > 0 \quad \text{AND} \quad \Delta \text{Balance}_{\text{New}}(\text{Vault}) < 0 \quad \text{AND} \quad \Delta \text{Balance}_{\text{Old}}(\text{Authority}) \le 0$$


2. Assign graded severity:
* `INFO`: Identical balance deltas across all scenarios (e.g., `vault_v2_benign.so`).
* `WARN`: Instruction failure/success codes or logs changed without unauthorized fund drainage.
* `CRITICAL`: `authorityDeltaLamports > 0n` and `vaultDeltaLamports < 0n` in `svmNew` while failing/0 in `svmOld` (e.g., `AUTHORITY_DRAIN_PROBE` in `vault_v2_malicious.so`).




* **Step 4.4: Build `llmReporter.ts` (OpenAI SDK)**
1. Initialize the official `openai` Node SDK (`new OpenAI({ apiKey: process.env.OPENAI_API_KEY })`).
2. Pass the structured JSON output from `invariantEngine.ts` (scenario name, signer, old balance delta, new balance delta, ELF size diff) to `gpt-4o-mini` / `gpt-4o` to generate a concise, 2-sentence plain-English security advisory for the dashboard.



---

### Phase 5: Guardian Exit Executor & 1-Click Judge Simulator

* **Step 5.1: Build `exitExecutor.ts**`
1. When `invariantEngine.ts` emits `CRITICAL`, immediately construct and sign the `emergency_withdraw` transaction using `guardian.json` with `commitment: "confirmed"` and priority fees enabled.
2. Verify on-chain that the `vault` balance is drained back to the user and `demo_user` wallet balance increased by the protected deposit amount.
3. Broadcast the Devnet transaction signature to the frontend via WebSocket.


* **Step 5.2: Build `attackOrchestrator.ts` (1-Click Judge Self-Test API)**
1. Expose three REST endpoints so judges can trigger real Devnet transactions with a single click in the browser UI (without writing code or using a CLI):
* `POST /api/sim/seed-vault`: Uses `demo_user.json` to deposit `0.5 SOL` into the Devnet Vault so the vault is primed.
* `POST /api/sim/stage-benign`: Writes `payloads/vault_v2_benign.so` into a real Devnet buffer owned by `authority.json` (or via in-process `BPFLoaderUpgradeable` buffer creation + write chunks), triggering the Watcher -> Sandbox -> `INFO` verdict.
* `POST /api/sim/stage-malicious`:
1. Ensures `0.5 SOL` is in the Vault.
2. Writes `payloads/vault_v2_malicious.so` into a real Devnet buffer owned by `authority.json`.
3. Waits 6 seconds (allowing the Watcher, LiteSVM Sandbox, and Guardian Exit to detect the buffer and rescue the funds on Devnet).
4. Executes the upgrade and fires the attacker's drain transaction against the now-empty Vault, logging the post-rescue drain transaction signature.







---

### Phase 6: Frontend Dashboard & Judge Experience

* **Step 6.1: Build Modular Dashboard Components**
1. **`VaultPositionCard.tsx`**: Polls Devnet every 2 seconds to display live `Vault Balance (SOL)`, `Protected User Balance (SOL)`, `Program ID`, and `ElfZero Guardian Status: ARMED`.
2. **`JudgeControlPanel.tsx`**: Three 1-click action buttons with loading states and live step progress:
* `1. Seed Demo Vault (0.5 SOL)`
* `2. Stage Benign Upgrade (Test False Positive)`
* `3. Launch Staged Rug-Pull (Live Devnet Rescue)`


3. **`SandboxDiffViewer.tsx`**: Renders the LiteSVM execution matrix comparing `Instance A (Live v1)` vs `Instance B (Staged Buffer v2)` per scenario (`USER_DEPOSIT`, `USER_WITHDRAW`, `AUTHORITY_DRAIN_PROBE`). Highlights unauthorized balance deltas in red.
4. **`IncidentReport.tsx`**: Displays the OpenAI-generated explanation alongside clickable Solana Devnet Explorer links for:
* Monitored Vault Program ID
* Staged Buffer Account Pubkey
* Guardian Emergency Exit Transaction Signature
* Attacker Post-Exit Drain Transaction Signature





---

## 4. 2-Minute Demo Video Timeline & Script

**Screen Layout:** Split-screen recording. Left 65%: **ElfZero Web Dashboard**. Right 35%: **Terminal / Solana Explorer Devnet**.

* **0:00 – 0:20 | The Problem & Live Devnet Setup**
* **Visual:** Highlight the Dashboard showing the live Devnet Vault holding `0.5 SOL` deposited by the user, with `ElfZero Guardian: Armed`.
* **Voiceover:** *"When a Solana protocol is rugged via a malicious upgrade, alert bots notify you after the code is live and your funds are already gone. ElfZero catches malicious upgrades while the ELF bytecode is still staged in a BPF Loader buffer, proves it steals funds by running it in a local LiteSVM fork, and exits your deposit before block zero of the upgrade lands."*


* **0:20 – 0:45 | Benign Upgrade & False-Positive Resistance**
* **Visual:** Click **"Stage Benign Upgrade"** on the Dashboard. A real buffer account appears on Devnet. The Dashboard flashes yellow (`Staged Buffer Detected -> Running LiteSVM Differential Sandbox`), then turns green (`INVARIANT PASSED: 0 unauthorized token deltas`).
* **Voiceover:** *"First, let's stage a legitimate v2 upgrade on Devnet with one click. ElfZero extracts the staged ELF binary, runs the old and new programs side-by-side in LiteSVM across user and authority scenarios, sees zero unauthorized balance deltas, and takes no action—preventing false-positive exits."*


* **0:45 – 1:30 | The Live Attack, LiteSVM Detection & Non-Custodial Rescue**
* **Visual:** Click **"Launch Staged Rug-Pull"**.
* **T+1s:** Watcher detects the new Devnet buffer.
* **T+2s:** `SandboxDiffViewer` turns red on `Scenario 3: AUTHORITY_DRAIN_PROBE` (`Old Code: Revert (0 SOL)` vs `New Code: +0.5 SOL to Authority`).
* **T+3s:** Guardian fires `emergency_withdraw` on Devnet. The Vault balance drops to `0.0 SOL` and the user's wallet balance increases by `+0.5 SOL`.
* **T+7s:** The attacker's upgrade and drain transaction lands on Devnet against an empty vault. Click the Solana Explorer links to show the on-chain timestamps and slot numbers.
* **Voiceover:** *"Now we click Launch Staged Rug-Pull to stage a backdoored v2 binary that bypasses the owner check for the upgrade authority. Before the upgrade instruction executes, ElfZero's LiteSVM sandbox catches the +0.5 SOL authority delta, triggers our scoped Guardian exit on Devnet, and returns the 0.5 SOL directly to the user's wallet. Four seconds later, the attacker's drain hits an empty vault."*


* **1:30 – 2:00 | AI Incident Report, Security Architecture & Wrap-Up**
* **Visual:** Scroll to the OpenAI-generated plain-English incident report explaining the exact instruction diff, then highlight the non-custodial Rust constraint (`destination == position.owner`).
* **Voiceover:** *"Even if ElfZero's agent key were compromised, our on-chain constraint locks withdrawals strictly to the original depositor's wallet. Our OpenAI pipeline translates the raw LiteSVM state delta into an instant human-readable advisory, and judges can test both Devnet scenarios with a single click."*



```

```