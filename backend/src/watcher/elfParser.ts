import { PublicKey } from "@solana/web3.js";
import * as crypto from "crypto";
import { ElfHeaderInfo, ParsedElfBytecode, UpgradeableBufferAccount } from "./types";

/**
 * Standard Solana BPF Upgradeable Loader program ID.
 */
export const BPF_LOADER_UPGRADEABLE_ID = new PublicKey(
  "BPFLoaderUpgradeab1e11111111111111111111111"
);

/**
 * Standard ELF header magic bytes: 0x7F, 'E', 'L', 'F'
 */
export const ELF_MAGIC = Buffer.from([0x7f, 0x45, 0x4c, 0x46]);

/**
 * Known e_machine values for Solana SBF/eBPF
 * 263 (0x0107) = EM_SBF (Solana SBF v2)
 * 247 (0x00F7) = EM_BPF (Classic Linux/Solana eBPF)
 */
export const SBF_MACHINE_CODES = [263, 247];

/**
 * Discriminant for UpgradeableLoaderState::Buffer
 * u32 little-endian: 1 = [1, 0, 0, 0]
 */
export const BUFFER_STATE_DISCRIMINANT = 1;

/**
 * Parses and extracts metadata from an ELF header buffer.
 */
export function parseElfHeader(data: Buffer): ElfHeaderInfo {
  if (data.length < 32) {
    throw new Error(
      `Insufficient buffer length for ELF header: ${data.length} bytes (minimum 32 bytes required)`
    );
  }

  // Verify magic header
  if (!data.subarray(0, 4).equals(ELF_MAGIC)) {
    throw new Error(
      `Invalid ELF magic header: expected [0x7f, 0x45, 0x4c, 0x46], received [${Array.from(
        data.subarray(0, 4)
      )
        .map((b) => "0x" + b.toString(16).padStart(2, "0"))
        .join(", ")}]`
    );
  }

  const is64Bit = data.readUInt8(4) === 2; // 1 = 32-bit, 2 = 64-bit
  const isLittleEndian = data.readUInt8(5) === 1; // 1 = LSB, 2 = MSB
  const elfVersion = data.readUInt8(6);
  const osAbi = data.readUInt8(7);

  if (!isLittleEndian) {
    throw new Error("ELF endianness must be little-endian for Solana SBF");
  }

  const eType = data.readUInt16LE(16); // 3 = ET_DYN (shared object)
  const machine = data.readUInt16LE(18); // 263 = EM_SBF, 247 = EM_BPF
  const entryPoint = is64Bit ? data.readBigUInt64LE(24) : BigInt(data.readUInt32LE(24));

  return {
    is64Bit,
    isLittleEndian,
    elfVersion,
    osAbi,
    eType,
    machine,
    entryPoint,
  };
}

/**
 * Parses and validates an ELF bytecode binary directly.
 */
export function parseElfBytecode(
  bytecode: Buffer,
  authority: string | null = null,
  bufferAddress?: string
): ParsedElfBytecode {
  const header = parseElfHeader(bytecode);
  const isValidSbf =
    header.is64Bit &&
    header.isLittleEndian &&
    SBF_MACHINE_CODES.includes(header.machine);

  const sha256 = crypto.createHash("sha256").update(bytecode).digest("hex");

  return {
    bytecode,
    bytecodeSize: bytecode.length,
    sha256,
    header,
    isValidSbf,
    authority,
    bufferAddress,
    detectedAt: Date.now(),
  };
}

/**
 * Locates the start offset of ELF magic bytes in a buffer within a search window.
 */
export function findElfOffset(data: Buffer, maxSearchOffset: number = 64): number {
  const limit = Math.min(data.length - 4, maxSearchOffset);
  for (let i = 0; i <= limit; i++) {
    if (
      data[i] === 0x7f &&
      data[i + 1] === 0x45 &&
      data[i + 2] === 0x4c &&
      data[i + 3] === 0x46
    ) {
      return i;
    }
  }
  return -1;
}

/**
 * Parses an on-chain UpgradeableLoaderState::Buffer account.
 *
 * Memory layout:
 * - Bytes 0..4: Discriminant (u32 LE: 1 = Buffer)
 * - Byte 4: Option<Pubkey> flag (0 = None, 1 = Some)
 * - Bytes 5..37: Authority Pubkey (32 bytes if flag == 1)
 * - Bytes 37..: ELF Bytecode
 */
export function parseOnChainBufferAccount(
  accountData: Buffer,
  bufferPubkey?: PublicKey
): UpgradeableBufferAccount {
  if (accountData.length < 37) {
    throw new Error(
      `Account data length (${accountData.length} bytes) is too small to be a BPF Upgradeable Buffer`
    );
  }

  const discriminant = accountData.readUInt32LE(0);
  if (discriminant !== BUFFER_STATE_DISCRIMINANT) {
    throw new Error(
      `Account is not in UpgradeableLoaderState::Buffer state. Expected discriminant ${BUFFER_STATE_DISCRIMINANT}, got ${discriminant}`
    );
  }

  const hasAuthority = accountData.readUInt8(4) === 1;
  let authority: PublicKey | null = null;
  if (hasAuthority) {
    authority = new PublicKey(accountData.subarray(5, 37));
  }

  // Find where the ELF starts
  const elfOffset = findElfOffset(accountData, 64);
  if (elfOffset === -1) {
    throw new Error(
      "No valid ELF magic header (\\x7fELF) found in buffer account within search window"
    );
  }

  const rawBytecode = accountData.subarray(elfOffset);

  return {
    pubkey: bufferPubkey || PublicKey.default,
    authority,
    lamports: 0,
    dataLength: accountData.length,
    rawBytecode,
  };
}

/**
 * End-to-end helper: decodes an on-chain buffer account directly into a ParsedElfBytecode.
 */
export function decodeBufferAccountToElf(
  accountData: Buffer,
  bufferAddress?: string
): ParsedElfBytecode {
  const parsedAccount = parseOnChainBufferAccount(
    accountData,
    bufferAddress ? new PublicKey(bufferAddress) : undefined
  );

  return parseElfBytecode(
    parsedAccount.rawBytecode,
    parsedAccount.authority ? parsedAccount.authority.toBase58() : null,
    bufferAddress
  );
}
