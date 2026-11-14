import { AppWalletProvider } from "./context/WalletProvider";
import { useDashboardState } from "./hooks/useDashboardState";
import { Header } from "./components/Header";
import { MetricsOverview } from "./components/MetricsOverview";
import { CandidateStage } from "./components/CandidateStage";
import { InvariantMatrixTable } from "./components/InvariantMatrixTable";
import { TelemetryTimeline } from "./components/TelemetryTimeline";
import { SecurityAdvisoryCard } from "./components/SecurityAdvisoryCard";
import { EvacuationLedger } from "./components/EvacuationLedger";
import { AlertCircle } from "lucide-react";

function DashboardContent() {
  const {
    status,
    timeline,
    activeSimulation,
    isSimulating,
    wsConnected,
    error,
    triggerSimulation,
  } = useDashboardState();

  const programId =
    status?.programId || "D8r3d2uXQn9wYE96BRjyYqmqReFbziK5rfSwdYvHEtkT";

  return (
    <div className="min-h-screen bg-[#FAFAFD] text-slate-900 flex flex-col font-sans selection:bg-violet-100 selection:text-violet-900">
      <Header programId={programId} wsConnected={wsConnected} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Error Notification Banner */}
        {error && (
          <div className="rounded-xl bg-rose-50 border border-rose-200 p-4 flex items-center gap-3 text-rose-800 text-sm shadow-xs">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <div className="flex-1 font-medium">{error}</div>
          </div>
        )}

        {/* Section 1: Protocol Metrics Bar */}
        <MetricsOverview status={status} />

        {/* Section 2: Candidate Staging & Attack Orchestration Actions */}
        <CandidateStage
          isSimulating={isSimulating}
          activeSimulation={activeSimulation}
          onTriggerSimulation={triggerSimulation}
        />

        {/* Section 3: Dual Grid: Invariant Matrix & Live Telemetry Checklist */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Invariant Matrix (2 cols on lg) */}
          <div className="lg:col-span-2">
            <InvariantMatrixTable
              auditReport={activeSimulation?.auditReport ?? null}
              isSimulating={isSimulating}
            />
          </div>

          {/* Telemetry Stream Checklist (1 col on lg) */}
          <div className="lg:col-span-1">
            <TelemetryTimeline
              timeline={timeline}
              isSimulating={isSimulating}
              wsConnected={wsConnected}
            />
          </div>
        </div>

        {/* Section 4: Gemini Security Advisory Analysis */}
        <SecurityAdvisoryCard
          advisory={activeSimulation?.advisory ?? null}
          isSimulating={isSimulating}
        />

        {/* Section 5: Non-Custodial Emergency Evacuation Ledger */}
        <EvacuationLedger
          rescueSummary={activeSimulation?.rescueSummary}
          isSimulating={isSimulating}
        />
      </main>

      {/* Subtle Footer */}
      <footer className="mt-auto border-t border-slate-200 bg-white py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">ElfZero</span>
            <span>—</span>
            <span>Autonomous Solana Upgradability Guardian & Non-Custodial Rollback Engine</span>
          </div>
          <div className="flex items-center gap-4 font-mono text-[11px]">
            <span>Target: D8r3d...HEtkT</span>
            <span>Cluster: Devnet</span>
            <span className="text-violet-700 font-medium">LiteSVM v0.2.0</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AppWalletProvider>
      <DashboardContent />
    </AppWalletProvider>
  );
}