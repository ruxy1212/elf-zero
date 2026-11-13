import { PublicKey } from "@solana/web3.js";

/**
 * Metadata extracted from an ELF header of a Solana SBF binary.
 */
export interface ElfHeaderInfo {
  is64Bit: boolean;
  isLittleEndian: boolean;
  elfVersion: number;
  osAbi: number;
  eType: number; // 3 = ET_DYN (.so)
  machine: number; // 263 (0x0107) = EM_SBF, or 247 = EM_BPF
  entryPoint: bigint;
}

/**
 * Result of parsing and validating an ELF bytecode payload.
 */
export interface ParsedElfBytecode {
  bytecode: Buffer;
  bytecodeSize: number;
  sha256: string;
  header: ElfHeaderInfo;
  isValidSbf: boolean;
  authority: string | null;
  bufferAddress?: string;
  detectedAt: number;
}

/**
 * Raw on-chain UpgradeableLoaderState::Buffer account representation.
 */
export interface UpgradeableBufferAccount {
  pubkey: PublicKey;
  authority: PublicKey | null;
  lamports: number;
  dataLength: number;
  rawBytecode: Buffer;
  slot?: number;
}

/**
 * Watcher event emitted when an upgrade buffer is detected or updated.
 */
export type WatcherEventType =
  | "BUFFER_DETECTED"
  | "BUFFER_MODIFIED"
  | "BYTECODE_EXTRACTED"
  | "INVARIANT_TRIGGER_READY"
  | "BUFFER_CLOSED";

export interface WatcherEvent {
  type: WatcherEventType;
  timestamp: number;
  bufferAddress: string;
  authority: string | null;
  bytecodeHash: string;
  bytecodeSize: number;
  slot?: number;
  rawBytecode?: Buffer;
}
