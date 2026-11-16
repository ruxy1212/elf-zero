import { useState } from "react";
import { AppWalletProvider } from "./context/WalletProvider";
import { useDashboardState } from "./hooks/useDashboardState";
import { Header } from "./components/Header";
import { MetricsOverview } from "./components/MetricsOverview";
import { CandidateStage } from "./components/CandidateStage";
import { InvariantMatrixTable } from "./components/InvariantMatrixTable";
import { SecurityAdvisoryCard } from "./components/SecurityAdvisoryCard";
import { EvacuationLedger } from "./components/EvacuationLedger";
import { AuditHistoryLedger } from "./components/AuditHistoryLedger";
import { AlertCircle, ChevronDown, ChevronUp, FileCode } from "lucide-react";

function DashboardContent() {
  const {
    status,
    activeSimulation,
    isSimulating,
    isDepositing,
    error,
    history,
    triggerSimulation,
    depositToVault,
    resetDemo,
  } = useDashboardState();

  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);

  const programId =
    status?.programId || "D8r3d2uXQn9wYE96BRjyYqmqReFbziK5rfSwdYvHEtkT";

  const isOnline = Boolean(status?.success);

  return (
    <div className="min-h-screen bg-[#FAFAFD] text-slate-900 flex flex-col font-sans selection:bg-violet-100 selection:text-violet-900">
      <Header
        programId={programId}
        isOnline={isOnline}
        onResetDemo={resetDemo}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Error Notification Banner if any */}
        {error && (
          <div className="rounded-xl bg-rose-50 border border-rose-200 p-4 flex items-center gap-3 text-rose-800 text-sm shadow-xs">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <div className="flex-1 font-medium">{error}</div>
          </div>
        )}

        {/* Top 2-Column Main Stage */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
          {/* Left Column: Your Protected Assets */}
          <MetricsOverview
            status={status}
            isDepositing={isDepositing}
            onDeposit={depositToVault}
          />

          {/* Right Column: Pre-Upgrade Defense Testing Lab */}
          <CandidateStage
            isSimulating={isSimulating}
            activeSimulation={activeSimulation}
            onTriggerSimulation={triggerSimulation}
          />
        </div>

        {/* Live Rescue Receipt (Appears when active simulation is present) */}
        {activeSimulation && (
          <div className="space-y-4">
            <EvacuationLedger
              rescueSummary={activeSimulation.rescueSummary}
              isSimulating={isSimulating}
            />

            {/* Collapsible Deep-Dive Accordion for Judges & Developers */}
            <div className="pt-2">
              <button
                onClick={() => setShowTechnicalDetails((prev) => !prev)}
                className="w-full inline-flex items-center justify-between p-4 rounded-xl bg-white border border-slate-200 hover:border-slate-300 shadow-xs transition-colors text-xs font-semibold text-slate-700"
              >
                <div className="flex items-center gap-2">
                  <FileCode className="w-4 h-4 text-violet-700" />
                  <span>
                    {showTechnicalDetails ? "Hide" : "Inspect"} AI Security Intelligence & LiteSVM Invariant Assertions
                  </span>
                </div>
                {showTechnicalDetails ? (
                  <ChevronUp className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                )}
              </button>

              {showTechnicalDetails && (
                <div className="mt-4 space-y-6 animate-in fade-in duration-300">
                  <SecurityAdvisoryCard
                    advisory={activeSimulation.advisory}
                    isSimulating={isSimulating}
                  />

                  <InvariantMatrixTable
                    auditReport={activeSimulation.auditReport}
                    isSimulating={isSimulating}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Persistent Audit History */}
        <AuditHistoryLedger history={history} />
      </main>

      {/* Clean Enterprise Footer */}
      <footer className="mt-auto border-t border-slate-200 bg-white py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-700">ElfZero</span>
            <span>—</span>
            <span>Autonomous Upgradability Guardian & Rollback Engine on Solana</span>
          </div>
          <div className="flex items-center gap-4 font-mono text-[11px]">
            <span>Contract: D8r3d...HEtkT</span>
            <span>Cluster: Solana Devnet</span>
            <span className="text-violet-700 font-semibold">LiteSVM Runtime</span>
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
