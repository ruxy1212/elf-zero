import { FC } from "react";
import { AlertTriangle, ShieldCheck, Loader2, CheckCircle2, ArrowRight, Zap } from "lucide-react";
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
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-5">
      {/* Studio Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900 tracking-tight">
              Pre-Upgrade Defense Testing Lab
            </h2>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-violet-50 text-violet-700 border border-violet-100">
              LiteSVM Sandbox Active
            </span>
          </div>
          <p className="mt-0.5 text-xs text-slate-500">
            Fuzz test candidate upgrade binaries in an isolated runtime before deployment to Solana Devnet.
          </p>
        </div>
      </div>

      {/* Two Scenario Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {/* Scenario 1: Clean Routine Upgrade */}
        <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/70 flex flex-col justify-between space-y-3.5 hover:border-slate-300 transition-colors">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                Scenario 1
              </span>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                Clean Release
              </span>
            </div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              Standard Protocol Upgrade (V2)
            </h3>
            <ul className="mt-2 space-y-1 text-xs text-slate-600 font-sans">
              <li className="flex items-center gap-1.5 text-slate-600">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Standard performance optimizations
              </li>
              <li className="flex items-center gap-1.5 text-slate-600">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                All 4 safety invariants fully satisfied
              </li>
            </ul>
          </div>

          <button
            onClick={() => onTriggerSimulation("BENIGN_V2")}
            disabled={isSimulating}
            className={`w-full inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-lg text-xs font-semibold transition-all shadow-xs border ${
              isSimulating
                ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                : "bg-white hover:bg-slate-50 text-slate-800 border-slate-300 hover:border-slate-400 active:scale-98"
            }`}
          >
            {isSimulating ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />
            ) : (
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            )}
            <span>Run Safe Check</span>
            <ArrowRight className="w-3 h-3 text-slate-400" />
          </button>
        </div>

        {/* Scenario 2: Rogue Deployer Backdoor Attack */}
        <div className="rounded-xl border border-violet-200 p-4 bg-violet-50/40 flex flex-col justify-between space-y-3.5 hover:border-violet-300 transition-colors">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                Scenario 2
              </span>
              <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                Exploit Hazard
              </span>
            </div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              Unauthorized Drain Backdoor
            </h3>
            <ul className="mt-2 space-y-1 text-xs text-slate-600 font-sans">
              <li className="flex items-center gap-1.5 text-slate-600">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                Rogue bytecode siphons vault deposits
              </li>
              <li className="flex items-center gap-1.5 text-slate-600">
                <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />
                Triggers autonomous auto-exit evacuation
              </li>
            </ul>
          </div>

          <button
            onClick={() => onTriggerSimulation("MALICIOUS_V2")}
            disabled={isSimulating}
            className={`w-full inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-lg text-xs font-semibold transition-all shadow-xs text-white ${
              isSimulating
                ? "bg-slate-300 cursor-not-allowed"
                : "bg-violet-700 hover:bg-violet-800 active:scale-98 shadow-sm"
            }`}
          >
            {isSimulating ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
            ) : (
              <Zap className="w-3.5 h-3.5 text-amber-300" />
            )}
            <span>Simulate Backdoor Attack & Auto-Rescue</span>
            <ArrowRight className="w-3 h-3 text-violet-300" />
          </button>
        </div>
      </div>

      {/* Live Outcome Strip */}
      {isSimulating ? (
        <div className="p-3.5 rounded-xl bg-violet-50 border border-violet-200 flex items-center gap-3">
          <Loader2 className="w-4 h-4 text-violet-700 animate-spin shrink-0" />
          <div className="text-xs text-violet-950">
            <span className="font-semibold">Executing Differential Sandbox Analysis...</span>
            <span className="text-violet-700 text-[11px] ml-2">
              Replicating bytecode into isolated LiteSVM • Fuzzing drain scenarios • Querying Gemini AI advisory
            </span>
          </div>
        </div>
      ) : activeSimulation ? (
        <div
          className={`p-4 rounded-xl border ${
            activeSimulation.isSafeToUpgrade
              ? "bg-emerald-50/70 border-emerald-200"
              : "bg-rose-50/70 border-rose-200"
          }`}
        >
          {/* Header & Badges */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b gap-2 border-slate-200/60">
            <div className="flex items-center gap-2">
              {activeSimulation.isSafeToUpgrade ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span className="text-xs font-bold text-slate-900">
                {activeSimulation.isSafeToUpgrade
                  ? "Routine Upgrade Verified Safe"
                  : "Exploit Intercepted: Backdoor Drain Caught"}
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                  activeSimulation.isSafeToUpgrade
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-rose-100 text-rose-800"
                }`}
              >
                {activeSimulation.isSafeToUpgrade ? "SAFE CANDIDATE" : "CRITICAL HAZARD"}
              </span>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-500 font-medium text-[11px]">Threat Level:</span>
              <span
                className={`font-mono font-bold text-xs px-2 py-0.5 rounded ${
                  activeSimulation.isSafeToUpgrade
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-rose-100 text-rose-800"
                }`}
              >
                {activeSimulation.isSafeToUpgrade ? "0 / 100 (Safe)" : "100 / 100 (Critical Exploit)"}
              </span>
            </div>
          </div>

          {/* 3-Step Live Chain Reaction Strip */}
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
            <div className="p-2.5 rounded-lg bg-white/80 border border-slate-200/60">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                1. Staged Buffer
              </span>
              <span className="font-mono text-slate-900 text-[11px] block mt-0.5 truncate">
                SHA: {activeSimulation.candidateSha256.slice(0, 12)}...
              </span>
              <span className="text-[10px] text-slate-500">
                {(activeSimulation.candidateBytecodeSize / 1024).toFixed(1)} KB SBF binary
              </span>
            </div>

            <div className="p-2.5 rounded-lg bg-white/80 border border-slate-200/60">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                2. Sandbox Intercept
              </span>
              <span
                className={`text-[11px] font-bold block mt-0.5 ${
                  activeSimulation.isSafeToUpgrade ? "text-emerald-700" : "text-rose-700"
                }`}
              >
                {activeSimulation.isSafeToUpgrade ? "4 / 4 Invariants Passed" : "INV_UNAUTHORIZED_DRAIN"}
              </span>
              <span className="text-[10px] text-slate-500">
                {activeSimulation.isSafeToUpgrade ? "Zero exploit vectors" : "Unauthorized drain detected"}
              </span>
            </div>

            <div className="p-2.5 rounded-lg bg-white/80 border border-slate-200/60">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                3. Autonomous Action
              </span>
              <span
                className={`text-[11px] font-bold block mt-0.5 ${
                  activeSimulation.isSafeToUpgrade ? "text-emerald-700" : "text-violet-700"
                }`}
              >
                {activeSimulation.isSafeToUpgrade
                  ? "Approved For Deploy"
                  : "0.10 SOL Evacuated to Owner"}
              </span>
              <span className="text-[10px] text-slate-500">
                {activeSimulation.isSafeToUpgrade ? "No funds at risk" : "100% non-custodial return"}
              </span>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
