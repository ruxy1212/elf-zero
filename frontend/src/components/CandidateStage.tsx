import { FC } from "react";
import { AlertTriangle, ShieldCheck, Cpu, Loader2, Sparkles, FileCode2 } from "lucide-react";
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
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-5 border-b border-slate-100 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-slate-900 tracking-tight">
              Pre-Upgrade Staging & Differential Testing Engine
            </h2>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-violet-50 text-violet-700 border border-violet-100">
              LiteSVM Isolated Sandbox
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Simulate staging an ELF candidate binary into a Solana BPF Upgradeable Buffer to trigger automated differential assertion batteries and guardian auto-exit.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => onTriggerSimulation("BENIGN_V2")}
            disabled={isSimulating}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all shadow-xs border ${
              isSimulating
                ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                : "bg-white hover:bg-slate-50 text-slate-700 border-slate-300 hover:border-slate-400 active:scale-98"
            }`}
          >
            {isSimulating ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />
            ) : (
              <ShieldCheck className="w-3.5 h-3.5 text-violet-600" />
            )}
            <span>Simulate Benign V2</span>
          </button>

          <button
            onClick={() => onTriggerSimulation("MALICIOUS_V2")}
            disabled={isSimulating}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all shadow-xs ${
              isSimulating
                ? "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
                : "bg-violet-700 hover:bg-violet-800 text-white active:scale-98"
            }`}
          >
            {isSimulating ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
            ) : (
              <AlertTriangle className="w-3.5 h-3.5 text-amber-300" />
            )}
            <span>Simulate Malicious V2 Attack</span>
          </button>
        </div>
      </div>

      {/* Candidate Buffer Status Row */}
      <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Active Payload Info */}
        <div className="p-4 rounded-lg bg-slate-50 border border-slate-200/80">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-medium flex items-center gap-1.5">
              <FileCode2 className="w-3.5 h-3.5 text-violet-600" /> Staged Candidate ELF
            </span>
            <span className="font-mono text-slate-600">
              {activeSimulation?.candidateBytecodeSize
                ? `${(activeSimulation.candidateBytecodeSize / 1024).toFixed(1)} KB`
                : "184.9 KB"}
            </span>
          </div>
          <div className="mt-2">
            <div className="text-xs font-mono font-semibold text-slate-800 truncate" title={activeSimulation?.candidateSha256 || "No payload staged"}>
              {activeSimulation?.candidateSha256
                ? `${activeSimulation.candidateSha256.slice(0, 16)}...${activeSimulation.candidateSha256.slice(-12)}`
                : "2aa51e340675...f89c (vault_v2_benign.so)"}
            </div>
            <div className="mt-1 text-[11px] text-slate-500">
              Architecture: SBF (machine id: 263, e_flags: 0x0)
            </div>
          </div>
        </div>

        {/* Sandbox Differential Status */}
        <div className="p-4 rounded-lg bg-slate-50 border border-slate-200/80">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-medium flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-violet-600" /> Sandbox State
            </span>
            <span className="font-medium">
              {isSimulating ? (
                <span className="text-violet-600 flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" /> Evaluating
                </span>
              ) : activeSimulation?.isSafeToUpgrade ? (
                <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-semibold text-[11px]">
                  PASS
                </span>
              ) : activeSimulation ? (
                <span className="text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 font-semibold text-[11px]">
                  VIOLATION
                </span>
              ) : (
                <span className="text-slate-500">Ready</span>
              )}
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-700">
            {isSimulating ? (
              <span className="text-slate-600">Running differential tests on LiteSVM clone...</span>
            ) : activeSimulation ? (
              <span className="font-mono text-slate-800">
                {activeSimulation.auditReport.scenarios.length} scenarios fuzzed in {activeSimulation.durationMs}ms
              </span>
            ) : (
              <span className="text-slate-500">Awaiting simulation trigger or Devnet buffer write</span>
            )}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            Fuzzing: Deposit, Withdraw, Emergency Exit, Drain Backdoor
          </div>
        </div>

        {/* Guardian Intervention Status */}
        <div className="p-4 rounded-lg bg-slate-50 border border-slate-200/80">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-medium flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-violet-600" /> Guardian Response
            </span>
            <span>
              {activeSimulation?.rescueSummary ? (
                <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 font-semibold text-[11px]">
                  EXIT DISPATCHED
                </span>
              ) : activeSimulation?.isSafeToUpgrade ? (
                <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-semibold text-[11px]">
                  CLEARED
                </span>
              ) : (
                <span className="text-slate-500">Standby</span>
              )}
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-700">
            {activeSimulation?.rescueSummary ? (
              <span className="font-semibold text-rose-700">
                100% user collateral evacuated to owner wallet
              </span>
            ) : activeSimulation?.isSafeToUpgrade ? (
              <span className="text-emerald-700">
                Upgrade approved for execution without intervention
              </span>
            ) : (
              <span className="text-slate-500">Auto-exit daemon armed to protect depositor accounts</span>
            )}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            Target: Non-custodial recipient validation
          </div>
        </div>
      </div>
    </div>
  );
};