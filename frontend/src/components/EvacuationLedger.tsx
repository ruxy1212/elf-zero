import { FC } from "react";
import {
  ExternalLink,
  CheckCircle,
  ShieldCheck,
} from "lucide-react";
import { EmergencyExitSummary } from "../types";

interface EvacuationLedgerProps {
  rescueSummary: EmergencyExitSummary | null | undefined;
  isSimulating: boolean;
}

export const EvacuationLedger: FC<EvacuationLedgerProps> = ({
  rescueSummary,
  isSimulating,
}) => {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-violet-50 text-violet-700 flex items-center justify-center">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-slate-900 tracking-tight">
                Non-Custodial Evacuation Ledger
              </h3>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-violet-50 text-violet-700 border border-violet-100">
                Automated On-Chain Execution
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Deterministic protocol evacuation triggered prior to candidate upgrade execution
            </p>
          </div>
        </div>

        {rescueSummary && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
            <span>EVACUATION DISPATCHED & VERIFIED</span>
          </span>
        )}
      </div>

      {rescueSummary ? (
        <div className="mt-5 space-y-4">
          {/* Summary Stats Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200/80">
              <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                Total Collateral Rescued
              </div>
              <div className="mt-1 flex items-baseline gap-1.5 font-mono text-xl font-bold text-slate-900">
                <span>{(Number(rescueSummary.totalLamportsRescued) / 1_000_000_000).toFixed(4)}</span>
                <span className="text-xs font-normal text-slate-500 font-sans">SOL</span>
              </div>
              <div className="mt-0.5 text-[10px] text-slate-500 font-mono">
                {Number(rescueSummary.totalLamportsRescued).toLocaleString()} lamports
              </div>
            </div>

            <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200/80">
              <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                Positions Saved
              </div>
              <div className="mt-1 flex items-baseline gap-1.5 font-mono text-xl font-bold text-slate-900">
                <span>{rescueSummary.totalPositionsRescued}</span>
                <span className="text-xs font-medium text-emerald-600 font-sans">
                  ({rescueSummary.totalPositionsRescued}/{rescueSummary.totalPositionsTargeted} - 100%)
                </span>
              </div>
              <div className="mt-0.5 text-[10px] text-slate-500">
                Non-custodial owner destination verified
              </div>
            </div>

            <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200/80">
              <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                Execution Latency
              </div>
              <div className="mt-1 flex items-baseline gap-1.5 font-mono text-xl font-bold text-slate-900">
                <span>{rescueSummary.durationMs}</span>
                <span className="text-xs font-normal text-slate-500 font-sans">ms</span>
              </div>
              <div className="mt-0.5 text-[10px] text-slate-500">
                Pre-upgrade intervention window
              </div>
            </div>
          </div>

          {/* Rescued Positions Table */}
          <div className="overflow-hidden rounded-lg border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-2.5 px-3">User Position (PDA)</th>
                  <th className="py-2.5 px-3">Owner Recipient</th>
                  <th className="py-2.5 px-3">Rescued Amount</th>
                  <th className="py-2.5 px-3">Devnet Signature</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white font-mono text-[11px]">
                {rescueSummary.rescuedPositions.map((pos, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3 text-slate-800 font-medium">
                      {pos.userPositionAddress.slice(0, 8)}...{pos.userPositionAddress.slice(-6)}
                    </td>
                    <td className="py-3 px-3 text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded text-[10px] font-sans font-semibold border border-emerald-100">
                          Direct Owner
                        </span>
                        <span>{pos.ownerAddress.slice(0, 6)}...{pos.ownerAddress.slice(-4)}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-900">
                      {(Number(pos.amountRescued) / 1_000_000_000).toFixed(4)} SOL
                    </td>
                    <td className="py-3 px-3">
                      {pos.signature ? (
                        <a
                          href={`https://explorer.solana.com/tx/${pos.signature}?cluster=devnet`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-violet-700 hover:text-violet-900 underline hover:no-underline font-medium"
                        >
                          <span>{pos.signature.slice(0, 8)}...{pos.signature.slice(-6)}</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <span className="text-slate-400">Simulated Dispatch</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="py-8 text-center text-slate-400 text-xs">
          {isSimulating ? (
            <span>Guardian monitoring differential results. Ready to trigger emergency exit...</span>
          ) : (
            <span>
              No evacuation event recorded. The auto-exit engine triggers when differential invariant violations or backdoor patterns are detected.
            </span>
          )}
        </div>
      )}
    </div>
  );
};