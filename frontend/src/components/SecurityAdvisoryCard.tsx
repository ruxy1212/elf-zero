import { FC } from "react";
import {
  Sparkles,
  AlertOctagon,
  TrendingDown,
  Cpu,
  CheckCircle,
} from "lucide-react";
import { LlmSecurityAdvisory } from "../types";

interface SecurityAdvisoryCardProps {
  advisory: LlmSecurityAdvisory | null;
  isSimulating: boolean;
}

export const SecurityAdvisoryCard: FC<SecurityAdvisoryCardProps> = ({
  advisory,
  isSimulating,
}) => {
  const isMalicious = advisory?.verdict === "MALICIOUS_BACKDOOR_DETECTED";
  const riskScore = advisory?.riskScore ?? 0;

  const getRiskColor = (score: number) => {
    if (score >= 80) return { text: "text-rose-700", bg: "bg-rose-500", lightBg: "bg-rose-50", border: "border-rose-200" };
    if (score >= 50) return { text: "text-amber-700", bg: "bg-amber-500", lightBg: "bg-amber-50", border: "border-amber-200" };
    return { text: "text-emerald-700", bg: "bg-emerald-500", lightBg: "bg-emerald-50", border: "border-emerald-200" };
  };

  const riskColor = getRiskColor(riskScore);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-violet-50 text-violet-700 flex items-center justify-center">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900 tracking-tight">
                AI Security Intelligence Report
              </h3>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-violet-50 text-violet-700 border border-violet-100">
                Google Gemini 2.5 Flash-Lite
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Autonomous decompiled bytecode inspection and exploit impact assessment
            </p>
          </div>
        </div>

        {advisory && (
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
                isMalicious
                  ? "bg-rose-50 text-rose-700 border-rose-200"
                  : "bg-emerald-50 text-emerald-700 border-emerald-200"
              }`}
            >
              {isMalicious ? (
                <>
                  <AlertOctagon className="w-3.5 h-3.5 text-rose-600" />
                  <span>CRITICAL HAZARD DETECTED</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                  <span>SECURITY ADVISORY: SAFE</span>
                </>
              )}
            </span>
          </div>
        )}
      </div>

      {advisory ? (
        <div className="mt-5 space-y-5">
          {/* Risk Score Meter & Executive Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-stretch">
            {/* Meter Card */}
            <div className={`p-4 rounded-xl border ${riskColor.border} ${riskColor.lightBg} flex flex-col justify-between`}>
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Exploit Risk Level
                </span>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className={`text-4xl font-black font-mono tracking-tight ${riskColor.text}`}>
                    {riskScore}
                  </span>
                  <span className="text-xs font-semibold text-slate-500">/ 100</span>
                </div>
              </div>

              <div className="mt-4">
                <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${riskColor.bg} transition-all duration-500`}
                    style={{ width: `${riskScore}%` }}
                  />
                </div>
                <div className="mt-1.5 flex justify-between text-[10px] text-slate-500 font-medium">
                  <span>0 (Safe)</span>
                  <span>100 (Critical Hazard)</span>
                </div>
              </div>
            </div>

            {/* Executive Summary Box */}
            <div className="md:col-span-3 p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Executive Summary
                  </h4>
                </div>
                <p className="text-xs text-slate-700 leading-relaxed font-sans">
                  {advisory.executiveSummary}
                </p>
              </div>

              <div className="mt-3 pt-3 border-t border-slate-200/60 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-1.5 text-slate-600 font-sans text-xs">
                  <span className="font-semibold">Autonomous Directive:</span>
                  <span
                    className={`font-semibold px-2 py-0.5 rounded text-[10px] ${
                      isMalicious
                        ? "bg-rose-100 text-rose-800"
                        : "bg-emerald-100 text-emerald-800"
                    }`}
                  >
                    {isMalicious ? "REJECT UPGRADE & RESCUE FUNDS" : "APPROVE UPGRADE DEPLOYMENT"}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 font-mono">
                  Engine: {advisory.generatedBy}
                </div>
              </div>
            </div>
          </div>

          {/* Technical Vulnerability & Economic Risk Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Technical Analysis */}
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200/80">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
                <Cpu className="w-3.5 h-3.5 text-violet-700" /> Technical Root Cause
              </div>
              <p className="text-xs text-slate-700 leading-relaxed font-sans text-[11px]">
                {advisory.technicalAnalysis}
              </p>
            </div>

            {/* Economic Impact */}
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200/80">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
                <TrendingDown className="w-3.5 h-3.5 text-rose-600" /> Economic Capital Risk
              </div>
              <p className="text-xs text-slate-700 leading-relaxed font-sans text-[11px]">
                {advisory.economicRisk}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="py-10 text-center text-slate-400 text-xs">
          {isSimulating ? (
            <div className="flex flex-col items-center justify-center gap-2 text-violet-700">
              <Sparkles className="w-5 h-5 animate-pulse" />
              <span className="font-medium">Google Gemini 2.5 synthesizing execution traces...</span>
            </div>
          ) : (
            <span>Run a simulation above to generate an automated AI security assessment.</span>
          )}
        </div>
      )}
    </div>
  );
};
