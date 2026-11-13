import {
  Connection,
  PublicKey,
  Transaction,
  VersionedTransaction,
} from "@solana/web3.js";
import { LiteSVM } from "litesvm";
import * as crypto from "crypto";
import {
  AccountSnapshot,
  SandboxExecutionResult,
  SandboxRunConfig,
} from "./types";

/**
 * LiteSVMRunner executes and analyzes SBF programs in an isolated, in-memory Solana runtime.
 */
export class LiteSVMRunner {
  private svm: LiteSVM;
  private programId: PublicKey;
  private bytecodeSha256: string = "";
  private bytecodeSize: number = 0;

  constructor(programId: PublicKey | string) {
    this.programId =
      typeof programId === "string" ? new PublicKey(programId) : programId;
    this.svm = new LiteSVM();
  }

  /**
   * Resets the runtime instance with a clean state.
   */
  public reset(): void {
    this.svm = new LiteSVM();
  }

  /**
   * Returns the underlying LiteSVM instance.
   */
  public getSvm(): LiteSVM {
    return this.svm;
  }

  /**
   * Gets the current simulated blockhash.
   */
  public getLatestBlockhash(): string {
    return this.svm.latestBlockhash();
  }

  /**
   * Loads an SBF program binary directly into the LiteSVM runtime from memory.
   */
  public loadProgram(bytecode: Buffer | Uint8Array): void {
    const rawBytes =
      bytecode instanceof Buffer ? new Uint8Array(bytecode) : bytecode;

    this.bytecodeSize = rawBytes.length;
    this.bytecodeSha256 = crypto
      .createHash("sha256")
      .update(rawBytes)
      .digest("hex");

    this.svm.addProgram(this.programId, rawBytes);
  }

  /**
   * Airdrops lamports to an account in the sandbox.
   */
  public airdrop(address: PublicKey | string, lamports: bigint): void {
    const pubkey =
      typeof address === "string" ? new PublicKey(address) : address;
    this.svm.airdrop(pubkey, lamports);
  }

  /**
   * Sets or overrides an account's state in LiteSVM.
   */
  public setAccount(
    address: PublicKey | string,
    lamports: bigint,
    owner: PublicKey | string,
    data: Buffer | Uint8Array,
    executable: boolean = false
  ): void {
    const pubkey =
      typeof address === "string" ? new PublicKey(address) : address;
    const ownerPubkey =
      typeof owner === "string" ? new PublicKey(owner) : owner;
    const rawData = data instanceof Buffer ? new Uint8Array(data) : data;

    this.svm.setAccount(pubkey, {
      lamports: Number(lamports),
      data: rawData,
      owner: ownerPubkey,
      executable,
    });
  }

  /**
   * Ingests a pre-existing AccountSnapshot into the runtime.
   */
  public loadAccountSnapshot(snapshot: AccountSnapshot): void {
    this.setAccount(
      new PublicKey(snapshot.address),
      snapshot.lamports,
      new PublicKey(snapshot.owner),
      snapshot.data,
      snapshot.executable
    );
  }

  /**
   * Reads an account's current snapshot from LiteSVM.
   */
  public getAccountSnapshot(address: PublicKey | string): AccountSnapshot | null {
    const pubkey =
      typeof address === "string" ? new PublicKey(address) : address;
    const account = this.svm.getAccount(pubkey);
    if (!account) {
      return null;
    }

    return {
      address: pubkey.toBase58(),
      lamports: BigInt(account.lamports),
      owner: account.owner.toBase58(),
      data: Buffer.from(account.data),
      executable: account.executable,
    };
  }

  /**
   * Clones an on-chain account from a live Solana RPC connection into LiteSVM.
   */
  public async cloneFromRpc(
    connection: Connection,
    address: PublicKey | string
  ): Promise<AccountSnapshot | null> {
    const pubkey =
      typeof address === "string" ? new PublicKey(address) : address;
    const accountInfo = await connection.getAccountInfo(pubkey, "confirmed");

    if (!accountInfo) {
      return null;
    }

    const snapshot: AccountSnapshot = {
      address: pubkey.toBase58(),
      lamports: BigInt(accountInfo.lamports),
      owner: accountInfo.owner.toBase58(),
      data: accountInfo.data,
      executable: accountInfo.executable,
    };

    this.loadAccountSnapshot(snapshot);
    return snapshot;
  }

  /**
   * Clones multiple on-chain accounts into LiteSVM.
   */
  public async cloneMultipleFromRpc(
    connection: Connection,
    addresses: (PublicKey | string)[]
  ): Promise<Map<string, AccountSnapshot>> {
    const results = new Map<string, AccountSnapshot>();
    for (const addr of addresses) {
      const snap = await this.cloneFromRpc(connection, addr);
      if (snap) {
        results.set(snap.address, snap);
      }
    }
    return results;
  }

  /**
   * Executes a transaction in the sandbox, capturing pre/post states and metadata.
   */
  public executeTransaction(
    tx: Transaction | VersionedTransaction,
    watchedAddresses: (PublicKey | string)[] = []
  ): SandboxExecutionResult {
    const startTime = Date.now();

    // 1. Snapshot pre-execution states of watched accounts
    const preState = new Map<string, AccountSnapshot>();
    for (const addr of watchedAddresses) {
      const snap = this.getAccountSnapshot(addr);
      if (snap) {
        preState.set(snap.address, snap);
      }
    }

    // 2. Execute transaction
    const result = this.svm.sendTransaction(tx);
    const executionDurationMs = Date.now() - startTime;

    // Check if result is FailedTransactionMetadata (has .err() function)
    const isFailed = typeof (result as any).err === "function";
    const meta = isFailed ? (result as any).meta() : result;
    const logs = meta && typeof meta.logs === "function" ? meta.logs() : [];
    const computeUnitsConsumed =
      meta && typeof meta.computeUnitsConsumed === "function"
        ? meta.computeUnitsConsumed()
        : 0n;
    const error = isFailed && typeof (result as any).err === "function"
      ? JSON.stringify((result as any).err())
      : undefined;

    // 3. Snapshot post-execution states of watched accounts
    const postState = new Map<string, AccountSnapshot>();
    for (const addr of watchedAddresses) {
      const snap = this.getAccountSnapshot(addr);
      if (snap) {
        postState.set(snap.address, snap);
      }
    }

    return {
      success: !isFailed,
      programId: this.programId.toBase58(),
      bytecodeSha256: this.bytecodeSha256,
      bytecodeSize: this.bytecodeSize,
      preState,
      postState,
      logs,
      computeUnitsConsumed,
      error,
      executionDurationMs,
    };
  }

  /**
   * Helper to initialize a sandbox environment with a program and initial accounts.
   */
  public static createWithProgram(
    config: SandboxRunConfig
  ): LiteSVMRunner {
    const runner = new LiteSVMRunner(config.programId);
    runner.loadProgram(config.programBytecode);

    if (config.payer) {
      runner.airdrop(config.payer, config.airdropAmount ?? 10_000_000_000n);
    }

    if (config.clonedAccounts) {
      for (const account of config.clonedAccounts) {
        runner.loadAccountSnapshot(account);
      }
    }

    return runner;
  }
}
