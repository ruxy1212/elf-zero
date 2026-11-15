import { FC } from "react";
import { CheckCircle2, Clock, Loader2, Terminal, Shield } from "lucide-react";
import { SimulationTimelineEvent } from "../types";

interface TelemetryTimelineProps {
  timeline: SimulationTimelineEvent[];
  isSimulating: boolean;
  isOnline: boolean;
}

const PIPELINE_STAGES = [
  { key: "STAGE_PAYLOAD_DETECTED", label: "Candidate Code Intercepted" },
  { key: "STAGE_SANDBOX_INITIALIZED", label: "LiteSVM Sandbox Boot" },
  { key: "STAGE_DIFFERENTIAL_EVALUATION", label: "Anti-Drain Invariant Tests" },
  { key: "STAGE_SECURITY_ADVISORY", label: "Gemini AI Threat Analysis" },
  { key: "STAGE_EMERGENCY_RESCUE_TRIGGERED", label: "Guardian Collateral Rescue" },
  { key: "STAGE_SIMULATION_COMPLETED", label: "Defense Cycle Complete" },
];

export const TelemetryTimeline: FC<TelemetryTimelineProps> = ({
  timeline,
  isSimulating,
  isOnline,
}) => {
  const executedStages = new Set(timeline.map((e) => e.stage));

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-violet-50 text-violet-700 flex items-center justify-center">
            <Terminal className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight">
              Guardian Defense Timeline
            </h3>
            <p className="text-xs text-slate-500">Live autonomous intervention trace</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-xs">
          <span className={`w-2 h-2 rounded-full ${isOnline ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`} />
          <span className="font-sans text-slate-600 font-medium text-[11px]">
            {isOnline ? "Watcher Active" : "Connecting"}
          </span>
        </div>
      </div>

      {/* Stage Checklist Stepper */}
      <div className="py-4 border-b border-slate-100">
        <div className="grid grid-cols-2 gap-2">
          {PIPELINE_STAGES.map((s) => {
            const isCompleted = executedStages.has(s.key as any);
            return (
              <div
                key={s.key}
                className={`flex items-center gap-2 p-2 rounded-lg border text-xs transition-colors ${
                  isCompleted
                    ? "bg-violet-50/70 border-violet-200 text-violet-950 font-semibold"
                    : isSimulating
                    ? "bg-slate-50 border-slate-200 text-slate-400"
                    : "bg-white border-slate-100 text-slate-400"
                }`}
              >
                {isCompleted ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-violet-700 shrink-0" />
                ) : isSimulating ? (
                  <Loader2 className="w-3.5 h-3.5 text-violet-500 animate-spin shrink-0" />
                ) : (
                  <span className="w-3.5 h-3.5 rounded-full border border-slate-300 shrink-0" />
                )}
                <span className="truncate text-[11px]">{s.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Event Stream Log */}
      <div className="mt-4 flex-1 flex flex-col min-h-0">
        <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center justify-between">
          <span>Intervention Log ({timeline.length} events)</span>
          {isSimulating && (
            <span className="text-violet-600 font-semibold text-xs inline-flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" /> Live Processing...
            </span>
          )}
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[320px]">
          {timeline.length > 0 ? (
            timeline.map((evt, idx) => (
              <div
                key={idx}
                className="p-3 rounded-lg bg-slate-50 border border-slate-200/80 text-xs transition-all"
              >
                <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono mb-1">
                  <span className="font-semibold text-violet-700 bg-violet-50 px-1.5 py-0.5 rounded border border-violet-100">
                    Step {idx + 1}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-400" />
                    {new Date(evt.timestamp).toLocaleTimeString([], {
                      hour12: false,
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                  </span>
                </div>
                <div className="text-slate-800 text-[11px] leading-relaxed font-sans">
                  {evt.message}
                </div>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-slate-400 text-xs text-center space-y-2">
              <Shield className="w-8 h-8 text-slate-300" />
              <span>Daemon is monitoring Solana Devnet upgrade buffers.</span>
              <span className="text-[11px] text-slate-500">
                Click a simulation button above to trigger an immediate test cycle.
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
