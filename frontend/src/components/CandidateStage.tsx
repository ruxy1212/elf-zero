import { FC } from "react";
import { AlertTriangle, ShieldCheck, Loader2, CheckCircle2, ArrowRight } from "lucide-react";
import { SimulationRunResult } from "../types";

interface CandidateStageProps {
  isSimulating: boolean;
  activeSimulation: SimulationRunResult | null;
  onTriggerSimulation: (type: "BENIGN_V2" | "MALICIOUS_V2") => void;
}

export const CandidateStage: FC<CandidateStageProps> = ({
  isSimulating,
  activeSimulation,
  onTriggerSimulation,
}) => {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-6">
      {/* Studio Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-100 gap-2">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">
              Pre-Upgrade Defense Testing Lab
            </h2>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-violet-50 text-violet-700 border border-violet-100">
              LiteSVM Isolated Sandbox
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Choose a candidate program upgrade below. ElfZero intercepts the code before it reaches production, tests it against unauthorized drain attempts, and automatically rescues depositor funds if an exploit is caught.
          </p>
        </div>
      </div>

      {/* Two Scenario Cards Side-by-Side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Scenario 1: Benign Routine Upgrade */}
        <div className="rounded-xl border border-slate-200 p-5 bg-slate-50/60 flex flex-col justify-between space-y-4 hover:border-slate-300 transition-colors">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                Scenario 1: Routine Update
              </span>
              <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                Safe Candidate
              </span>
            </div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Standard Protocol Upgrade (V2)
            </h3>
            <p className="mt-1 text-xs text-slate-600 leading-relaxed">
              Simulates a legitimate code update with performance improvements. All 4 security invariants remain satisfied and user funds remain fully intact.
            </p>
          </div>

          <div className="pt-2">
            <button
              onClick={() => onTriggerSimulation("BENIGN_V2")}
              disabled={isSimulating}
              className={`w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold transition-all shadow-xs border ${
                isSimulating
                  ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                  : "bg-white hover:bg-slate-50 text-slate-800 border-slate-300 hover:border-slate-400 active:scale-98"
              }`}
            >
              {isSimulating ? (
                <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
              ) : (
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
              )}
              <span>Run Safe Upgrade Test</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
            </button>
          </div>
        </div>

        {/* Scenario 2: Rogue Deployer Backdoor Attack */}
        <div className="rounded-xl border border-violet-200 p-5 bg-violet-50/40 flex flex-col justify-between space-y-4 hover:border-violet-300 transition-colors">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                Scenario 2: Malicious Deployer
              </span>
              <span className="text-xs font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                Exploit Hazard
              </span>
            </div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              Unauthorized Vault Drain Backdoor
            </h3>
            <p className="mt-1 text-xs text-slate-600 leading-relaxed">
              Simulates a rogue deployer pushing an upgrade with a hidden instruction designed to siphon all vault deposits without user authorization.
            </p>
          </div>

          <div className="pt-2">
            <button
              onClick={() => onTriggerSimulation("MALICIOUS_V2")}
              disabled={isSimulating}
              className={`w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold transition-all shadow-xs text-white ${
                isSimulating
                  ? "bg-slate-300 cursor-not-allowed"
                  : "bg-violet-700 hover:bg-violet-800 active:scale-98"
              }`}
            >
              {isSimulating ? (
                <Loader2 className="w-4 h-4 animate-spin text-white" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-300" />
              )}
              <span>Simulate Backdoor Attack & Auto-Rescue</span>
              <ArrowRight className="w-3.5 h-3.5 text-violet-300" />
            </button>
          </div>
        </div>
      </div>

      {/* Live Outcome Banner */}
      {isSimulating ? (
        <div className="p-4 rounded-xl bg-violet-50 border border-violet-200 flex items-center gap-3">
          <Loader2 className="w-5 h-5 text-violet-700 animate-spin shrink-0" />
          <div className="text-xs text-violet-950">
            <div className="font-semibold">Executing Differential Sandbox Analysis...</div>
            <div className="text-violet-700 text-[11px] mt-0.5">
              Replicating candidate code into isolated LiteSVM runtime • Testing unauthorized drain vectors • Querying Gemini AI advisory
            </div>
          </div>
        </div>
      ) : activeSimulation ? (
        <div
          className={`p-5 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-4 ${
            activeSimulation.isSafeToUpgrade
              ? "bg-emerald-50/70 border-emerald-200"
              : "bg-rose-50/70 border-rose-200"
          }`}
        >
          <div className="flex items-start gap-3">
            {activeSimulation.isSafeToUpgrade ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            )}
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-900">
                  {activeSimulation.isSafeToUpgrade
                    ? "Safe to Upgrade: Routine Update Approved"
                    : "Backdoor Detected: Autonomous Emergency Rescue Executed!"}
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    activeSimulation.isSafeToUpgrade
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-rose-100 text-rose-800"
                  }`}
                >
                  {activeSimulation.isSafeToUpgrade ? "VERIFIED SAFE" : "EXPLOIT INTERCEPTED"}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-700 leading-relaxed">
                {activeSimulation.isSafeToUpgrade
                  ? "All 4 security invariants satisfied in LiteSVM differential sandbox. The upgrade contains no unauthorized fund extraction logic and is safe for deployment."
                  : "The candidate binary contained an unauthorized drain instruction violating invariant INV_UNAUTHORIZED_DRAIN. The Guardian immediately dispatched an autonomous non-custodial emergency exit, returning 100% of user collateral directly to the owner wallet."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="text-right text-xs">
              <span className="text-slate-500 block text-[11px]">AI Safety Score:</span>
              <span
                className={`font-mono font-bold text-base ${
                  activeSimulation.isSafeToUpgrade ? "text-emerald-700" : "text-rose-700"
                }`}
              >
                {activeSimulation.advisory.riskScore === 0 ? "100 / 100 (Safe)" : "0 / 100 (Critical Hazard)"}
              </span>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
