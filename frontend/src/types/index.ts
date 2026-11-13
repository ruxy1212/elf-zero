export type Role = "USER" | "GUARDIAN" | "AUTHORITY";

export interface RoleInfo {
  role: Role;
  name: string;
  address: string;
  description: string;
}

export interface InvariantCheckResult {
  invariantId: string;
  name: string;
  passed: boolean;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO";
  details: string;
  observedDelta?: {
    expected: string;
    actual: string;
  };
}

export interface ScenarioResult {
  scenarioId: string;
  name: string;
  description: string;
  passed: boolean;
  txResult: {
    success: boolean;
    computeUnitsConsumed: string;
    logs: string[];
    error?: string;
  };
  invariantChecks: InvariantCheckResult[];
}

export interface DifferentialAuditReport {
  programId: string;
  candidateSha256: string;
  candidateBytecodeSize: number;
  isSafeToUpgrade: boolean;
  verdict: "SAFE" | "MALICIOUS_BACKDOOR_DETECTED" | "INVARIANT_VIOLATION";
  scenarios: ScenarioResult[];
  violations: InvariantCheckResult[];
  recommendedAction: "PROCEED_WITH_UPGRADE" | "TRIGGER_EMERGENCY_EXIT_AND_ABORT";
  timestamp: number;
}

export interface LlmSecurityAdvisory {
  title: string;
  verdict: "SAFE" | "MALICIOUS_BACKDOOR_DETECTED" | "INVARIANT_VIOLATION";
  riskScore: number;
  executiveSummary: string;
  technicalAnalysis: string;
  economicRisk: string;
  recommendedAction: string;
  rawMarkdown: string;
  generatedBy: string;
  timestamp: number;
}

export interface RescuedPosition {
  userPositionAddress: string;
  ownerAddress: string;
  amountRescued: string;
  signature?: string;
  success: boolean;
  error?: string;
}

export interface EmergencyExitSummary {
  rescueId: string;
  triggerReason: string;
  candidateBytecodeSha256: string;
  totalPositionsTargeted: number;
  totalPositionsRescued: number;
  totalLamportsRescued: string;
  rescuedPositions: RescuedPosition[];
  startedAt: number;
  completedAt: number;
  durationMs: number;
}

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

export interface ProtocolStatus {
  success: boolean;
  programId: string;
  vaultPda: string;
  userPositionPda: string;
  vaultLamports: number;
  userLamports: number;
  authority: string;
  guardian: string;
  demoUser: string;
  lastSimulationResult: SimulationRunResult | null;
}
