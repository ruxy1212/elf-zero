import { DifferentialAuditReport, LlmSecurityAdvisory } from "../sandbox/types";
import { EmergencyExitSummary } from "../guardian/types";

export interface SimulationTimelineEvent {
  stage:
    | "STAGE_PAYLOAD_DETECTED"
    | "STAGE_SANDBOX_INITIALIZED"
    | "STAGE_DIFFERENTIAL_EVALUATION"
    | "STAGE_SECURITY_ADVISORY"
    | "STAGE_EMERGENCY_RESCUE_TRIGGERED"
    | "STAGE_SIMULATION_COMPLETED";
  timestamp: number;
  message: string;
  data?: any;
}

export interface SimulationRunResult {
  simulationId: string;
  simulationType: "BENIGN_V2" | "MALICIOUS_V2";
  candidateSha256: string;
  candidateBytecodeSize: number;
  isSafeToUpgrade: boolean;
  auditReport: DifferentialAuditReport;
  advisory: LlmSecurityAdvisory;
  rescueSummary?: EmergencyExitSummary;
  timeline: SimulationTimelineEvent[];
  durationMs: number;
}
