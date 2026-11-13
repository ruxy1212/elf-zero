import { AppWalletProvider } from "./context/WalletProvider";
import { useDashboardState } from "./hooks/useDashboardState";
import { Header } from "./components/Header";
import { MetricsOverview } from "./components/MetricsOverview";
import { CandidateStage } from "./components/CandidateStage";
import { AlertCircle, Terminal, Shield, CheckCircle2, XCircle } from "lucide-react";

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
    <div className="min-h-screen bg-[#FAFAFD] text-slate-900 flex flex-col font-sans">
      <Header programId={programId} wsConnected={wsConnected} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Error Banner if any */}
        {error && (
          <div className="rounded-xl bg-rose-50 border border-rose-200 p-4 flex items-center gap-3 text-rose-800 text-sm">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <div className="flex-1 font-medium">{error}</div>
          </div>
        )}

        {/* Section 1: Protocol Metrics */}
        <MetricsOverview status={status} />

        {/* Section 2: Candidate Staging & Simulation Trigger */}
        <CandidateStage
          isSimulating={isSimulating}
          activeSimulation={activeSimulation}
          onTriggerSimulation={triggerSimulation}
        />

        {/* Section 3: Placeholder Area for Substep 6.2 Components */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Invariant Matrix (2 cols on lg) */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs min-h-[220px]">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-violet-700" />
                  <h3 className="text-sm font-semibold text-slate-900">
                    Differential Invariant Matrix
                  </h3>
                </div>
                <span className="text-xs text-slate-500 font-mono">
                  {activeSimulation
                    ? `${activeSimulation.auditReport.violations.length} violations`
                    : "Ready"}
                </span>
              </div>
              <div className="mt-4">
                {activeSimulation ? (
                  <div className="space-y-3">
                    {activeSimulation.auditReport.scenarios.map((sc, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100 text-xs"
                      >
                        <div className="flex items-center gap-2.5">
                          {sc.passed ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <XCircle className="w-4 h-4 text-rose-600" />
                          )}
                          <span className="font-medium text-slate-800 font-mono">
                            {sc.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-slate-500 font-mono">
                          <span>{sc.txResult.computeUnitsConsumed} CU</span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                              sc.passed
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-rose-50 text-rose-700 border border-rose-200"
                            }`}
                          >
                            {sc.passed ? "SAFE" : "FAIL"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-10 text-slate-400 text-xs">
                    Run a simulation to view differential assertion results.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Telemetry Stream (1 col on lg) */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs min-h-[220px]">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-violet-700" />
                  <h3 className="text-sm font-semibold text-slate-900">
                    Live Telemetry Feed
                  </h3>
                </div>
                <span className="text-xs text-slate-400 font-mono">
                  {timeline.length} events
                </span>
              </div>
              <div className="mt-4 space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {timeline.length > 0 ? (
                  timeline.map((event, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded bg-slate-50 border border-slate-100 text-xs"
                    >
                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono mb-1">
                        <span>{event.stage}</span>
                        <span>{new Date(event.timestamp).toLocaleTimeString()}</span>
                      </div>
                      <div className="text-slate-700">{event.message}</div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-10 text-slate-400 text-xs">
                    Awaiting telemetry signals...
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
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