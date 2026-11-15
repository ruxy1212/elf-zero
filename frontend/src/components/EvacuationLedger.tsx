import { FC } from "react";
import {
  ExternalLink,
  CheckCircle,
  ShieldCheck,
  Lock,
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
              <h3 className="text-base font-bold text-slate-900 tracking-tight">
                Non-Custodial Rescue Receipt
              </h3>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-violet-50 text-violet-700 border border-violet-100">
                On-Chain Verification
              </span>
            </div>
            <p className="text-xs text-slate-500">
              When an exploit is detected, user funds are automatically evacuated directly back to their personal wallet
            </p>
          </div>
        </div>

        {rescueSummary && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
            <span>100% COLLATERAL RESCUED</span>
          </span>
        )}
      </div>

      {rescueSummary ? (
        <div className="mt-5 space-y-4">
          {/* Summary Stats Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 rounded-lg bg-emerald-50/60 border border-emerald-200">
              <div className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider">
                Total Collateral Rescued
              </div>
              <div className="mt-2 flex items-baseline gap-1.5 font-mono text-2xl font-bold text-slate-900">
                <span>{(Number(rescueSummary.totalLamportsRescued) / 1_000_000_000).toFixed(2)}</span>
                <span className="text-sm font-semibold text-slate-500 font-sans">SOL</span>
              </div>
              <div className="mt-1 text-[11px] text-emerald-700 font-sans">
                {Number(rescueSummary.totalLamportsRescued).toLocaleString()} lamports safely evacuated
              </div>
            </div>

            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Protected Accounts Saved
              </div>
              <div className="mt-2 flex items-baseline gap-1.5 font-mono text-2xl font-bold text-slate-900">
                <span>{rescueSummary.totalPositionsRescued || 1}</span>
                <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-sans">
                  100% Recovered
                </span>
              </div>
              <div className="mt-1 text-[11px] text-slate-500 font-sans">
                Zero funds lost to malicious upgrade
              </div>
            </div>

            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Intervention Reaction Time
              </div>
              <div className="mt-2 flex items-baseline gap-1.5 font-mono text-2xl font-bold text-slate-900">
                <span>{rescueSummary.durationMs}</span>
                <span className="text-sm font-semibold text-slate-500 font-sans">ms</span>
              </div>
              <div className="mt-1 text-[11px] text-slate-500 font-sans">
                Rescued before upgrade could execute
              </div>
            </div>
          </div>

          {/* Non-Custodial Destination Notice */}
          <div className="p-3.5 rounded-lg bg-violet-50/60 border border-violet-200 text-xs flex items-center gap-3">
            <Lock className="w-4 h-4 text-violet-700 shrink-0" />
            <div className="text-violet-950 font-sans text-xs">
              <span className="font-semibold">Non-Custodial Guarantee:</span> Under the smart contract's Anchor constraints, rescued funds can <span className="font-semibold underline">only</span> be returned to the original depositor's wallet. The Guardian has zero authority to redirect collateral.
            </div>
          </div>

          {/* Rescued Positions Table */}
          {rescueSummary.rescuedPositions.length > 0 && (
            <div className="overflow-hidden rounded-lg border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="py-2.5 px-3">Escrow Position</th>
                    <th className="py-2.5 px-3">Recipient Owner Wallet</th>
                    <th className="py-2.5 px-3">Rescued Amount</th>
                    <th className="py-2.5 px-3">On-Chain Proof</th>
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
                            Depositor
                          </span>
                          <span>{pos.ownerAddress.slice(0, 6)}...{pos.ownerAddress.slice(-4)}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 font-semibold text-slate-900">
                        {(Number(pos.amountRescued) / 1_000_000_000).toFixed(2)} SOL
                      </td>
                      <td className="py-3 px-3">
                        {pos.signature ? (
                          <a
                            href={`https://explorer.solana.com/tx/${pos.signature}?cluster=devnet`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-violet-700 hover:text-violet-900 underline hover:no-underline font-medium font-sans"
                          >
                            <span>View on Solana Explorer</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          <span className="text-slate-400 font-sans">Simulated on Devnet</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div className="py-8 text-center text-slate-400 text-xs font-sans">
          {isSimulating ? (
            <span>Guardian monitoring differential results. Ready to trigger emergency rescue...</span>
          ) : (
            <span>
              No emergency rescue active. The Guardian triggers autonomous collateral rescue only when an unauthorized fund drain or backdoor is detected.
            </span>
          )}
        </div>
      )}
    </div>
  );
};
