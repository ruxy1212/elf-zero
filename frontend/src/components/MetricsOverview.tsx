import { FC } from "react";
import { Coins, Wallet, ShieldCheck, ArrowUpRight, Loader2, Lock } from "lucide-react";
import { ProtocolStatus } from "../types";

interface MetricsOverviewProps {
  status: ProtocolStatus | null;
  isDepositing: boolean;
  onDeposit: () => void;
}

export const MetricsOverview: FC<MetricsOverviewProps> = ({
  status,
  isDepositing,
  onDeposit,
}) => {
  const vaultSol = status ? (status.vaultLamports / 1_000_000_000).toFixed(2) : "0.10";
  const userSol = status ? (status.userLamports / 1_000_000_000).toFixed(2) : "0.40";

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between h-full">
      <div>
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Live On-Chain Escrow
            </span>
            <h3 className="text-base font-bold text-slate-900 tracking-tight mt-0.5">
              Your Protected Assets
            </h3>
          </div>
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Guardian Armed</span>
          </span>
        </div>

        {/* Balances Display */}
        <div className="mt-4 grid grid-cols-2 gap-3.5">
          {/* Vault Balance */}
          <div className="p-4 rounded-xl bg-violet-50/60 border border-violet-100">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="font-semibold text-violet-900 flex items-center gap-1.5">
                <Coins className="w-4 h-4 text-violet-700" /> In Vault Escrow
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-1.5 font-mono">
              <span className="text-3xl font-black text-slate-900">{vaultSol}</span>
              <span className="text-sm font-bold text-slate-500">SOL</span>
            </div>
            <div className="mt-1 text-[11px] text-slate-500 font-sans">
              Collateral at risk on Devnet
            </div>
          </div>

          {/* User Wallet Balance */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                <Wallet className="w-4 h-4 text-slate-600" /> In Your Wallet
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-1.5 font-mono">
              <span className="text-3xl font-black text-slate-900">{userSol}</span>
              <span className="text-sm font-bold text-slate-500">SOL</span>
            </div>
            <div className="mt-1 text-[11px] text-slate-500 font-sans truncate">
              Wallet: {status?.demoUser.slice(0, 6)}...{status?.demoUser.slice(-4)}
            </div>
          </div>
        </div>

        {/* Non-Custodial Rule Pill (Streamlined) */}
        <div className="mt-3.5 p-2.5 rounded-lg bg-slate-50 border border-slate-200/80 text-xs flex items-center justify-between gap-2">
          <span className="text-slate-600 font-sans text-[11px] flex items-center gap-2 truncate">
            <Lock className="w-3.5 h-3.5 text-violet-700 shrink-0" />
            <span className="truncate">Escrow locked to owner: <span className="font-mono text-slate-900">{status?.demoUser.slice(0, 6)}...{status?.demoUser.slice(-4)}</span></span>
          </span>
          <span className="text-[10px] font-semibold text-violet-700 bg-violet-50 px-2 py-0.5 rounded border border-violet-100 shrink-0">
            Non-Custodial
          </span>
        </div>
      </div>

      {/* Action Button */}
      <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-between gap-3">
        <span className="text-xs text-slate-500">
          Need to test funding the vault?
        </span>
        <button
          onClick={onDeposit}
          disabled={isDepositing}
          className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all shadow-xs border ${
            isDepositing
              ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
              : "bg-white hover:bg-slate-50 text-slate-800 border-slate-300 hover:border-slate-400 active:scale-98"
          }`}
        >
          {isDepositing ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />
          ) : (
            <ArrowUpRight className="w-3.5 h-3.5 text-violet-700" />
          )}
          <span>Deposit 0.10 SOL to Vault</span>
        </button>
      </div>
    </div>
  );
};
