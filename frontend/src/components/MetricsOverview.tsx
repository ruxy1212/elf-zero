import { FC } from "react";
import { Coins, Users, Lock, ShieldCheck } from "lucide-react";
import { ProtocolStatus } from "../types";

interface MetricsOverviewProps {
  status: ProtocolStatus | null;
}

export const MetricsOverview: FC<MetricsOverviewProps> = ({ status }) => {
  const vaultSol = status ? (status.vaultLamports / 1_000_000_000).toFixed(4) : "2.5000";
  const userSol = status ? (status.userLamports / 1_000_000_000).toFixed(4) : "9.9985";

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Metric 1: Vault Total Deposited */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs transition-shadow hover:shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Vault Collateral
          </span>
          <div className="w-8 h-8 rounded-lg bg-violet-50 text-violet-700 flex items-center justify-center">
            <Coins className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold tracking-tight text-slate-900 font-mono">
            {vaultSol}
          </span>
          <span className="text-sm font-medium text-slate-500">SOL</span>
        </div>
        <div className="mt-1 text-xs text-slate-500 font-mono truncate">
          PDA: {status?.vaultPda.slice(0, 8)}...{status?.vaultPda.slice(-6)}
        </div>
      </div>

      {/* Metric 2: User Position */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs transition-shadow hover:shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Active Protected Positions
          </span>
          <div className="w-8 h-8 rounded-lg bg-violet-50 text-violet-700 flex items-center justify-center">
            <Users className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold tracking-tight text-slate-900 font-mono">
            1
          </span>
          <span className="text-sm font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded font-sans text-xs">
            100% Covered
          </span>
        </div>
        <div className="mt-1 text-xs text-slate-500 truncate">
          Owner: {status?.demoUser.slice(0, 6)}... ({userSol} SOL in wallet)
        </div>
      </div>

      {/* Metric 3: Minimum Rent Floor */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs transition-shadow hover:shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Rent Floor Invariant
          </span>
          <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
            <Lock className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold tracking-tight text-slate-900 font-mono">
            0.00145
          </span>
          <span className="text-sm font-medium text-slate-500">SOL</span>
        </div>
        <div className="mt-1 text-xs text-slate-500">
          Enforced by on-chain invariant assertions
        </div>
      </div>

      {/* Metric 4: Guardian Status */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs transition-shadow hover:shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Guardian Rollback
          </span>
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <ShieldCheck className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-lg font-bold tracking-tight text-emerald-700">
            Armed & Watching
          </span>
        </div>
        <div className="mt-1 text-xs text-slate-500">
          LiteSVM differential runtime active
        </div>
      </div>
    </div>
  );
};
