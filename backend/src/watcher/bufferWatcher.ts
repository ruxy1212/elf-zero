import {
  Connection,
  PublicKey,
  Commitment,
  GetProgramAccountsFilter,
  AccountInfo,
} from "@solana/web3.js";
import { EventEmitter } from "events";
import bs58 from "bs58";
import {
  BPF_LOADER_UPGRADEABLE_ID,
  BUFFER_STATE_DISCRIMINANT,
  decodeBufferAccountToElf,
} from "./elfParser";
import { ParsedElfBytecode, WatcherEvent } from "./types";

/**
 * Configuration for BufferWatcher
 */
export interface BufferWatcherConfig {
  connection: Connection;
  targetAuthority?: PublicKey | string;
  pollIntervalMs?: number;
  enableWs?: boolean;
  commitment?: Commitment;
}

/**
 * Cache entry for a known buffer account
 */
interface BufferCacheEntry {
  bufferAddress: string;
  authority: string | null;
  sha256: string;
  bytecodeSize: number;
  lastUpdatedSlot?: number;
  lastSeenTimestamp: number;
}

export declare interface BufferWatcher {
  on(event: "bufferDetected", listener: (event: WatcherEvent) => void): this;
  on(
    event: "bytecodeExtracted",
    listener: (event: WatcherEvent, elf: ParsedElfBytecode) => void
  ): this;
  on(
    event: "invariantTriggerReady",
    listener: (event: WatcherEvent, elf: ParsedElfBytecode) => void
  ): this;
  on(event: "bufferClosed", listener: (bufferAddress: string) => void): this;
  on(event: "error", listener: (err: Error) => void): this;
  on(event: "status", listener: (status: string) => void): this;
}

/**
 * BufferWatcher monitors on-chain BPF Upgradeable Loader buffer accounts
 * targeting a specific authority or program.
 */
export class BufferWatcher extends EventEmitter {
  private connection: Connection;
  private targetAuthority: PublicKey | null = null;
  private pollIntervalMs: number;
  private enableWs: boolean;
  private commitment: Commitment;

  private isRunning: boolean = false;
  private pollTimer: NodeJS.Timeout | null = null;
  private wsSubscriptionId: number | null = null;

  private knownBuffers: Map<string, BufferCacheEntry> = new Map();

  constructor(config: BufferWatcherConfig) {
    super();
    this.connection = config.connection;
    if (config.targetAuthority) {
      this.targetAuthority =
        typeof config.targetAuthority === "string"
          ? new PublicKey(config.targetAuthority)
          : config.targetAuthority;
    }
    this.pollIntervalMs = config.pollIntervalMs ?? 5000;
    this.enableWs = config.enableWs ?? true;
    this.commitment = config.commitment ?? "confirmed";
  }

  /**
   * Starts the watcher service (WebSocket listener + fallback polling loop).
   */
  public async start(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    this.emit("status", "Starting BufferWatcher...");

    // 1. Initial scan of existing buffers
    try {
      await this.scanBuffers();
    } catch (err: any) {
      this.emit("error", new Error(`Initial buffer scan failed: ${err.message}`));
    }

    // 2. Setup WebSocket live listener if enabled
    if (this.enableWs) {
      this.setupWsSubscription();
    }

    // 3. Setup fallback interval polling
    if (this.pollIntervalMs > 0) {
      this.pollTimer = setInterval(async () => {
        if (!this.isRunning) return;
        try {
          await this.scanBuffers();
        } catch (err: any) {
          this.emit("error", new Error(`Polling scan error: ${err.message}`));
        }
      }, this.pollIntervalMs);
    }

    this.emit(
      "status",
      `BufferWatcher active (Target Authority: ${
        this.targetAuthority?.toBase58() ?? "ALL"
      }, WS: ${this.enableWs}, Poll Interval: ${this.pollIntervalMs}ms)`
    );
  }

  /**
   * Stops the watcher service and cleans up subscriptions/timers.
   */
  public async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;

    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }

    if (this.wsSubscriptionId !== null) {
      try {
        await this.connection.removeProgramAccountChangeListener(
          this.wsSubscriptionId
        );
      } catch (err) {
        // ignore cleanup error
      }
      this.wsSubscriptionId = null;
    }

    this.emit("status", "BufferWatcher stopped.");
  }

  /**
   * Returns current running status.
   */
  public getIsRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Returns copy of all currently tracked buffers.
   */
  public getKnownBuffers(): Map<string, BufferCacheEntry> {
    return new Map(this.knownBuffers);
  }

  /**
   * Builds the server-side RPC filters for BPF Upgradeable Loader buffer accounts.
   */
  public buildFilters(): GetProgramAccountsFilter[] {
    const filters: GetProgramAccountsFilter[] = [
      // Filter 1: Buffer discriminant u32 = 1 (bytes: [1, 0, 0, 0])
      {
        memcmp: {
          offset: 0,
          bytes: bs58.encode(Buffer.from([1, 0, 0, 0])),
        },
      },
    ];

    // Filter 2: If target authority is specified, match authority at offset 5 (after 4 byte discriminant + 1 byte Option tag)
    if (this.targetAuthority) {
      filters.push({
        memcmp: {
          offset: 5,
          bytes: this.targetAuthority.toBase58(),
        },
      });
    }

    return filters;
  }

  /**
   * Scans on-chain accounts for upgrade buffers matching criteria.
   */
  public async scanBuffers(): Promise<void> {
    const filters = this.buildFilters();

    const accounts = await this.connection.getProgramAccounts(
      BPF_LOADER_UPGRADEABLE_ID,
      {
        commitment: this.commitment,
        filters,
      }
    );

    const currentAddresses = new Set<string>();

    for (const { pubkey, account } of accounts) {
      currentAddresses.add(pubkey.toBase58());
      await this.processBufferAccount(pubkey, account.data);
    }

    // Detect closed buffers
    for (const [knownAddress] of this.knownBuffers) {
      if (!currentAddresses.has(knownAddress)) {
        this.knownBuffers.delete(knownAddress);
        this.emit("bufferClosed", knownAddress);
      }
    }
  }

  /**
   * Processes a buffer account buffer, extracts bytecode, and emits events.
   */
  public async processBufferAccount(
    bufferPubkey: PublicKey,
    accountData: Buffer,
    slot?: number
  ): Promise<ParsedElfBytecode | null> {
    const bufferAddress = bufferPubkey.toBase58();

    // Verify minimum length & discriminant
    if (accountData.length < 37) {
      return null;
    }

    const discriminant = accountData.readUInt32LE(0);
    if (discriminant !== BUFFER_STATE_DISCRIMINANT) {
      return null;
    }

    let parsedElf: ParsedElfBytecode;
    try {
      parsedElf = decodeBufferAccountToElf(accountData, bufferAddress);
    } catch (err: any) {
      // Buffer may still be writing / partially streamed on-chain
      this.emit(
        "status",
        `Buffer ${bufferAddress} partially written or invalid ELF: ${err.message}`
      );
      return null;
    }

    // Check authority filter if set
    if (
      this.targetAuthority &&
      parsedElf.authority !== this.targetAuthority.toBase58()
    ) {
      return null;
    }

    const existing = this.knownBuffers.get(bufferAddress);

    // If identical bytecode already processed, update timestamp and skip
    if (existing && existing.sha256 === parsedElf.sha256) {
      existing.lastSeenTimestamp = Date.now();
      return parsedElf;
    }

    const isNew = !existing;
    const cacheEntry: BufferCacheEntry = {
      bufferAddress,
      authority: parsedElf.authority,
      sha256: parsedElf.sha256,
      bytecodeSize: parsedElf.bytecodeSize,
      lastUpdatedSlot: slot,
      lastSeenTimestamp: Date.now(),
    };
    this.knownBuffers.set(bufferAddress, cacheEntry);

    const baseEvent: WatcherEvent = {
      type: isNew ? "BUFFER_DETECTED" : "BUFFER_MODIFIED",
      timestamp: Date.now(),
      bufferAddress,
      authority: parsedElf.authority,
      bytecodeHash: parsedElf.sha256,
      bytecodeSize: parsedElf.bytecodeSize,
      slot,
      rawBytecode: parsedElf.bytecode,
    };

    // Emit BUFFER_DETECTED / BUFFER_MODIFIED
    this.emit("bufferDetected", baseEvent);

    // Emit BYTECODE_EXTRACTED
    this.emit(
      "bytecodeExtracted",
      { ...baseEvent, type: "BYTECODE_EXTRACTED" },
      parsedElf
    );

    // Emit INVARIANT_TRIGGER_READY: signals sandbox runner to begin simulation
    this.emit(
      "invariantTriggerReady",
      { ...baseEvent, type: "INVARIANT_TRIGGER_READY" },
      parsedElf
    );

    return parsedElf;
  }

  /**
   * Sets up real-time WebSocket subscription.
   */
  private setupWsSubscription(): void {
    const filters = this.buildFilters();

    try {
      this.wsSubscriptionId = this.connection.onProgramAccountChange(
        BPF_LOADER_UPGRADEABLE_ID,
        async (keyedAccountInfo, context) => {
          try {
            await this.processBufferAccount(
              keyedAccountInfo.accountId,
              keyedAccountInfo.accountInfo.data,
              context.slot
            );
          } catch (err: any) {
            this.emit(
              "error",
              new Error(`WS account update error: ${err.message}`)
            );
          }
        },
        this.commitment,
        filters
      );
    } catch (err: any) {
      this.emit(
        "error",
        new Error(`Failed to establish WS subscription: ${err.message}`)
      );
    }
  }

  /**
   * Manually inspects an on-chain buffer address on demand.
   */
  public async manualInspectBuffer(
    bufferAddress: PublicKey | string
  ): Promise<ParsedElfBytecode> {
    const pubkey =
      typeof bufferAddress === "string"
        ? new PublicKey(bufferAddress)
        : bufferAddress;

    const accountInfo = await this.connection.getAccountInfo(
      pubkey,
      this.commitment
    );
    if (!accountInfo) {
      throw new Error(`Buffer account ${pubkey.toBase58()} not found on-chain`);
    }

    if (!accountInfo.owner.equals(BPF_LOADER_UPGRADEABLE_ID)) {
      throw new Error(
        `Account ${pubkey.toBase58()} is not owned by BPF Upgradeable Loader`
      );
    }

    const elf = decodeBufferAccountToElf(accountInfo.data, pubkey.toBase58());
    return elf;
  }
}
