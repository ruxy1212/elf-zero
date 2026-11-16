import { FC, useState } from "react";
import { History, ExternalLink, ShieldCheck, AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";
import { AuditHistoryEntry } from "../types";

interface AuditHistoryLedgerProps {
  history: AuditHistoryEntry[];
}

export const AuditHistoryLedger: FC<AuditHistoryLedgerProps> = ({ history }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-violet-50 text-violet-700 flex items-center justify-center">
            <History className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight">
              Persistent Audit History
            </h3>
            <p className="text-xs text-slate-500">
              Immutable ledger of intercepted upgrade candidates, AI evaluations, and on-chain rescue receipts
            </p>
          </div>
        </div>

        <span className="text-xs font-semibold text-slate-500 font-mono">
          {history.length} {history.length === 1 ? "entry" : "entries"} recorded
        </span>
      </div>

      <div className="mt-4">
        {history.length > 0 ? (
          <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden">
            {history.map((entry) => {
              const isMalicious = entry.verdict === "MALICIOUS_BACKDOOR_DETECTED";
              const isExpanded = expandedId === entry.id;

              return (
                <div key={entry.id} className="bg-white hover:bg-slate-50/70 transition-colors">
                  <div
                    onClick={() => toggleExpand(entry.id)}
                    className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      {isMalicious ? (
                        <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center shrink-0">
                          <AlertTriangle className="w-4 h-4" />
                        </div>
                      ) : (
                        <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center shrink-0">
                          <ShieldCheck className="w-4 h-4" />
                        </div>
                      )}

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-xs">
                            {entry.simulationType === "BENIGN_V2"
                              ? "Routine Protocol Upgrade (V2)"
                              : "Rogue Deployer Backdoor Attack"}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                              isMalicious
                                ? "bg-rose-100 text-rose-800"
                                : "bg-emerald-100 text-emerald-800"
                            }`}
                          >
                            {isMalicious ? "INTERCEPTED & RESCUED" : "VERIFIED SAFE"}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {entry.summary}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-xs shrink-0 self-end sm:self-center">
                      <div className="text-right">
                        <span className="font-mono text-[11px] text-slate-400 block">
                          {new Date(entry.timestamp).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                          })}
                        </span>
                        {entry.signature && (
                          <a
                            href={`https://explorer.solana.com/tx/${entry.signature}?cluster=devnet`}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 text-[11px] text-violet-700 hover:text-violet-900 font-semibold underline hover:no-underline"
                          >
                            <span>Solana TX Proof</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>

                      <button
                        type="button"
                        className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                      >
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {isExpanded && entry.advisory && (
                    <div className="px-4 pb-4 pt-1 bg-slate-50/90 border-t border-slate-100 text-xs">
                      <div className="p-3 rounded-lg bg-white border border-slate-200 space-y-2">
                        <div className="font-bold text-slate-900 text-xs flex items-center justify-between">
                          <span>{entry.advisory.title}</span>
                          <span className="font-mono text-slate-500 text-[10px]">
                            Candidate Hash: {entry.candidateSha256.slice(0, 8)}...{entry.candidateSha256.slice(-6)}
                          </span>
                        </div>
                        <p className="text-slate-700 leading-relaxed font-sans text-[11px]">
                          {entry.advisory.executiveSummary}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-8 text-center text-slate-400 text-xs">
            No past simulations recorded yet. Run a scenario above to test the autonomous defense.
          </div>
        )}
      </div>
    </div>
  );
};
