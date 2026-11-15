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
    error,
    triggerSimulation,
  } = useDashboardState();

  const programId =
    status?.programId || "D8r3d2uXQn9wYE96BRjyYqmqReFbziK5rfSwdYvHEtkT";

  const isOnline = Boolean(status?.success);

  return (
    <div className="min-h-screen bg-[#FAFAFD] text-slate-900 flex flex-col font-sans selection:bg-violet-100 selection:text-violet-900">
      <Header programId={programId} isOnline={isOnline} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Error Notification Banner if any */}
        {error && (
          <div className="rounded-xl bg-rose-50 border border-rose-200 p-4 flex items-center gap-3 text-rose-800 text-sm shadow-xs">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <div className="flex-1 font-medium">{error}</div>
          </div>
        )}

        {/* Hero Explainer: What is ElfZero and How Does it Protect You? */}
        <div className="bg-gradient-to-r from-violet-900 via-indigo-900 to-slate-900 rounded-2xl p-6 sm:p-8 text-white shadow-sm">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-violet-500/20 text-violet-200 border border-violet-400/30">
              Autonomous Upgradability Security
            </span>
            <h1 className="mt-3 text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Zero-Trust Protection Against Malicious Smart Contract Upgrades
            </h1>
            <p className="mt-2 text-sm text-slate-300 leading-relaxed">
              On Solana, protocol deployers can upgrade program bytecode at any time. If an admin key is compromised or rogue code is deployed, user funds could be drained instantly. ElfZero monitors candidate upgrade buffers, differential-fuzzes the new code in an isolated sandbox, and rescues your collateral before an exploit can execute.
            </p>
          </div>

          <div className="mt-6 pt-6 border-t border-white/10 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-lg bg-violet-500/20 border border-violet-400/30 flex items-center justify-center font-bold text-xs text-violet-300 shrink-0">
                1
              </div>
              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">Intercept Staged Code</h4>
                <p className="mt-0.5 text-xs text-slate-300">Catches candidate bytecode in Solana BPF loader buffers before deployment.</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-lg bg-violet-500/20 border border-violet-400/30 flex items-center justify-center font-bold text-xs text-violet-300 shrink-0">
                2
              </div>
              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">Sandbox & Verify</h4>
                <p className="mt-0.5 text-xs text-slate-300">Differential engine tests for unauthorized fund drains and invariant breaches.</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-lg bg-violet-500/20 border border-violet-400/30 flex items-center justify-center font-bold text-xs text-violet-300 shrink-0">
                3
              </div>
              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">Autonomous Auto-Rescue</h4>
                <p className="mt-0.5 text-xs text-slate-300">Dispatches non-custodial emergency exits to return 100% of collateral to user wallets.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Section 1: Protocol Metrics Bar */}
        <MetricsOverview status={status} />

        {/* Section 2: Interactive Testing Studio */}
        <CandidateStage
          isSimulating={isSimulating}
          activeSimulation={activeSimulation}
          onTriggerSimulation={triggerSimulation}
        />

        {/* Section 3: Dual Grid: Invariant Matrix & Defense Timeline */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          <div className="lg:col-span-2">
            <InvariantMatrixTable
              auditReport={activeSimulation?.auditReport ?? null}
              isSimulating={isSimulating}
            />
          </div>

          <div className="lg:col-span-1">
            <TelemetryTimeline
              timeline={timeline}
              isSimulating={isSimulating}
              isOnline={isOnline}
            />
          </div>
        </div>

        {/* Section 4: AI Security Advisory */}
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
