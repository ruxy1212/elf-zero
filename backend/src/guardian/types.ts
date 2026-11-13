import { PublicKey } from "@solana/web3.js";

/**
 * Information about a rescued user position
 */
export interface RescuedPosition {
  userPositionAddress: string;
  ownerAddress: string;
  amountRescued: bigint;
  signature?: string;
  success: boolean;
  error?: string;
}

/**
 * Summary of an autonomous emergency exit operation
 */
export interface EmergencyExitSummary {
  rescueId: string;
  triggerReason: string;
  candidateBytecodeSha256: string;
  totalPositionsTargeted: number;
  totalPositionsRescued: number;
  totalLamportsRescued: bigint;
  rescuedPositions: RescuedPosition[];
  startedAt: number;
  completedAt: number;
  durationMs: number;
}
