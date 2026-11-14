import { FC } from "react";
import { CheckCircle2, Clock, Loader2, Radio, Terminal } from "lucide-react";
import { SimulationTimelineEvent } from "../types";

interface TelemetryTimelineProps {
  timeline: SimulationTimelineEvent[];
  isSimulating: boolean;
  wsConnected: boolean;
}

const PIPELINE_STAGES = [
  { key: "STAGE_PAYLOAD_DETECTED", label: "ELF Payload Staged" },
  { key: "STAGE_SANDBOX_INITIALIZED", label: "LiteSVM Sandbox Boot" },
  { key: "STAGE_DIFFERENTIAL_EVALUATION", label: "Differential Assertions" },
  { key: "STAGE_SECURITY_ADVISORY", label: "Gemini AI Advisory" },
  { key: "STAGE_EMERGENCY_RESCUE_TRIGGERED", label: "Guardian Auto-Exit" },
  { key: "STAGE_SIMULATION_COMPLETED", label: "Cycle Complete" },
];

export const TelemetryTimeline: FC<TelemetryTimelineProps> = ({
  timeline,
  isSimulating,
  wsConnected,
}) => {
  // Determine completed stages
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
            <h3 className="text-base font-semibold text-slate-900 tracking-tight">
              Guardian Telemetry Feed
            </h3>
            <p className="text-xs text-slate-500">Live WebSocket event trace</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-xs">
          <Radio
            className={`w-3 h-3 ${wsConnected ? "text-emerald-500 animate-pulse" : "text-amber-500"}`}
          />
          <span className="font-mono text-slate-500 text-[11px]">
            {wsConnected ? "ws://localhost:3001" : "Disconnected"}
          </span>
        </div>
      </div>

      {/* Stage Checklist Stepper */}
      <div className="py-4 border-b border-slate-100">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {PIPELINE_STAGES.map((s) => {
            const isCompleted = executedStages.has(s.key as any);
            return (
              <div
                key={s.key}
                className={`flex items-center gap-2 p-2 rounded-lg border text-xs transition-colors ${
                  isCompleted
                    ? "bg-violet-50/60 border-violet-200 text-violet-900 font-medium"
                    : isSimulating
                    ? "bg-slate-50 border-slate-200 text-slate-400"
                    : "bg-white border-slate-100 text-slate-400"
                }`}
              >
                {isCompleted ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-violet-700 shrink-0" />
                ) : isSimulating ? (
                  <Loader2 className="w-3.5 h-3.5 text-violet-400 animate-spin shrink-0" />
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
          <span>Execution Log ({timeline.length} events)</span>
          {isSimulating && (
            <span className="text-violet-600 font-normal inline-flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" /> Streaming...
            </span>
          )}
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[380px]">
          {timeline.length > 0 ? (
            timeline.map((evt, idx) => (
              <div
                key={idx}
                className="p-3 rounded-lg bg-slate-50 border border-slate-200/70 text-xs transition-all hover:border-slate-300"
              >
                <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono mb-1">
                  <span className="font-semibold text-violet-700 bg-violet-50 px-1.5 py-0.5 rounded border border-violet-100">
                    {evt.stage}
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
                <div className="text-slate-800 font-mono text-[11px] leading-relaxed">
                  {evt.message}
                </div>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400 text-xs text-center">
              <Clock className="w-6 h-6 mb-2 text-slate-300" />
              <span>Awaiting telemetry broadcast signals from daemon...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};