import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import { EventEmitter } from "events";
import * as crypto from "crypto";
import { EmergencyExitSummary, RescuedPosition } from "./types";
import { decodeUserPositionState } from "../sandbox/invariantEngine";
import { LiteSVMRunner } from "../sandbox/litesvmRunner";

/**
 * Anchor account discriminator for UserPosition
 * sha256("account:UserPosition")[0..8]
 */
export const USER_POSITION_DISCRIMINATOR = Buffer.from([
  251, 248, 209, 245, 83, 234, 17, 27,
]);

/**
 * Anchor instruction discriminator for global:emergency_exit
 * sha256("global:emergency_exit")[0..8]
 */
export const EMERGENCY_EXIT_DISCRIMINATOR = Buffer.from([
  164, 174, 48, 163, 191, 65, 91, 245,
]);

export interface ExitExecutorConfig {
  connection: Connection;
  programId: PublicKey | string;
  guardianKeypair: Keypair;
}

export declare interface ExitExecutor {
  on(event: "rescueStarted", listener: (summary: Partial<EmergencyExitSummary>) => void): this;
  on(event: "positionEvacuated", listener: (pos: RescuedPosition) => void): this;
  on(event: "rescueCompleted", listener: (summary: EmergencyExitSummary) => void): this;
  on(event: "error", listener: (err: Error) => void): this;
}

/**
 * ExitExecutor autonomously triggers non-custodial emergency exits on-chain
 * when an exploit or critical invariant violation is detected.
 */
export class ExitExecutor extends EventEmitter {
  private connection: Connection;
  private programId: PublicKey;
  private guardianKeypair: Keypair;
  private vaultPda: PublicKey;

  constructor(config: ExitExecutorConfig) {
    super();
    this.connection = config.connection;
    this.programId =
      typeof config.programId === "string"
        ? new PublicKey(config.programId)
        : config.programId;
    this.guardianKeypair = config.guardianKeypair;

    const [vault] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault")],
      this.programId
    );
    this.vaultPda = vault;
  }

  /**
   * Discovers all active UserPosition accounts on-chain with deposited collateral (> 0 lamports).
   */
  public async discoverActivePositions(): Promise<
    { pubkey: PublicKey; owner: PublicKey; amount: bigint }[]
  > {
    const accounts = await this.connection.getProgramAccounts(this.programId, {
      filters: [{ dataSize: 81 }],
    });

    const activePositions: {
      pubkey: PublicKey;
      owner: PublicKey;
      amount: bigint;
    }[] = [];

    for (const { pubkey, account } of accounts) {
      if (account.data.length < 81) continue;

      const discriminator = account.data.subarray(0, 8);
      if (!discriminator.equals(USER_POSITION_DISCRIMINATOR)) continue;

      try {
        const decoded = decodeUserPositionState(account.data);
        if (decoded.amount > 0n) {
          activePositions.push({
            pubkey,
            owner: decoded.owner,
            amount: decoded.amount,
          });
        }
      } catch (err) {
        // Skip unparseable account
      }
    }

    return activePositions;
  }

  /**
   * Builds the non-custodial Anchor emergency_exit transaction instruction.
   *
   * Constraints enforced by smart contract:
   * - guardian must match vault.guardian
   * - destination.key() must match user_position.owner
   */
  public buildEmergencyExitInstruction(
    userPositionPda: PublicKey,
    ownerDestination: PublicKey
  ): TransactionInstruction {
    return new TransactionInstruction({
      programId: this.programId,
      keys: [
        {
          pubkey: this.guardianKeypair.publicKey,
          isSigner: true,
          isWritable: true,
        },
        { pubkey: this.vaultPda, isSigner: false, isWritable: true },
        { pubkey: userPositionPda, isSigner: false, isWritable: true },
        { pubkey: ownerDestination, isSigner: false, isWritable: true },
        {
          pubkey: SystemProgram.programId,
          isSigner: false,
          isWritable: false,
        },
      ],
      data: EMERGENCY_EXIT_DISCRIMINATOR,
    });
  }

  /**
   * Executes an emergency exit on a single position on-chain.
   */
  public async executePositionExit(
    userPositionPda: PublicKey,
    ownerDestination: PublicKey,
    amount: bigint
  ): Promise<RescuedPosition> {
    const ix = this.buildEmergencyExitInstruction(
      userPositionPda,
      ownerDestination
    );

    const tx = new Transaction().add(ix);

    try {
      const signature = await sendAndConfirmTransaction(
        this.connection,
        tx,
        [this.guardianKeypair],
        { commitment: "confirmed" }
      );

      const result: RescuedPosition = {
        userPositionAddress: userPositionPda.toBase58(),
        ownerAddress: ownerDestination.toBase58(),
        amountRescued: amount,
        signature,
        success: true,
      };

      this.emit("positionEvacuated", result);
      return result;
    } catch (err: any) {
      const result: RescuedPosition = {
        userPositionAddress: userPositionPda.toBase58(),
        ownerAddress: ownerDestination.toBase58(),
        amountRescued: 0n,
        success: false,
        error: err.message,
      };
      this.emit("positionEvacuated", result);
      return result;
    }
  }

  /**
   * Autonomously rescues all active depositor positions on-chain.
   */
  public async evacuateAllPositions(
    triggerReason: string,
    candidateBytecodeSha256: string
  ): Promise<EmergencyExitSummary> {
    const rescueId = "rescue_" + crypto.randomBytes(6).toString("hex");
    const startedAt = Date.now();

    this.emit("rescueStarted", {
      rescueId,
      triggerReason,
      candidateBytecodeSha256,
      startedAt,
    });

    const activePositions = await this.discoverActivePositions();
    const rescuedPositions: RescuedPosition[] = [];
    let totalLamportsRescued = 0n;

    for (const pos of activePositions) {
      const res = await this.executePositionExit(pos.pubkey, pos.owner, pos.amount);
      rescuedPositions.push(res);
      if (res.success) {
        totalLamportsRescued += res.amountRescued;
      }
    }

    const completedAt = Date.now();
    const summary: EmergencyExitSummary = {
      rescueId,
      triggerReason,
      candidateBytecodeSha256,
      totalPositionsTargeted: activePositions.length,
      totalPositionsRescued: rescuedPositions.filter((p) => p.success).length,
      totalLamportsRescued,
      rescuedPositions,
      startedAt,
      completedAt,
      durationMs: completedAt - startedAt,
    };

    this.emit("rescueCompleted", summary);
    return summary;
  }

  /**
   * Executes an emergency exit in a LiteSVM sandbox environment (used for simulation testing).
   */
  public executeInSandbox(
    runner: LiteSVMRunner,
    userPositionPda: PublicKey,
    ownerDestination: PublicKey,
    expectedAmount: bigint
  ): RescuedPosition {
    const ix = this.buildEmergencyExitInstruction(
      userPositionPda,
      ownerDestination
    );

    const tx = new Transaction({
      recentBlockhash: runner.getLatestBlockhash(),
      feePayer: this.guardianKeypair.publicKey,
    }).add(ix);
    tx.sign(this.guardianKeypair);

    const result = runner.executeTransaction(tx, [
      this.vaultPda,
      userPositionPda,
      ownerDestination,
    ]);

    const rescued: RescuedPosition = {
      userPositionAddress: userPositionPda.toBase58(),
      ownerAddress: ownerDestination.toBase58(),
      amountRescued: result.success ? expectedAmount : 0n,
      success: result.success,
      error: result.error,
    };

    if (result.success) {
      this.emit("positionEvacuated", rescued);
    }
    return rescued;
  }
}
