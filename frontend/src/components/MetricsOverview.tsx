import { FC } from "react";
import { Coins, Users, Lock, ShieldCheck } from "lucide-react";
import { ProtocolStatus } from "../types";

interface MetricsOverviewProps {
  status: ProtocolStatus | null;
}

export const MetricsOverview: FC<MetricsOverviewProps> = ({ status }) => {
  const vaultSol = status ? (status.vaultLamports / 1_000_000_000).toFixed(2) : "2.50";
  const userSol = status ? (status.userLamports / 1_000_000_000).toFixed(2) : "9.99";

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Metric 1: Protected Vault Collateral */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs transition-shadow hover:shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Protected Vault Collateral
          </span>
          <div className="w-8 h-8 rounded-lg bg-violet-50 text-violet-700 flex items-center justify-center">
            <Coins className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-3xl font-bold tracking-tight text-slate-900 font-mono">
            {vaultSol}
          </span>
          <span className="text-base font-semibold text-slate-500">SOL</span>
        </div>
        <div className="mt-1 text-xs text-slate-500 font-sans">
          Total depositor funds held in escrow on Devnet
        </div>
      </div>

      {/* Metric 2: Depositor Accounts Covered */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs transition-shadow hover:shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Depositor Coverage
          </span>
          <div className="w-8 h-8 rounded-lg bg-violet-50 text-violet-700 flex items-center justify-center">
            <Users className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-3xl font-bold tracking-tight text-slate-900 font-mono">
            1 Account
          </span>
          <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
            100% Protected
          </span>
        </div>
        <div className="mt-1 text-xs text-slate-500 font-sans">
          Depositor Wallet: <span className="font-mono">{status?.demoUser.slice(0, 6)}...</span> ({userSol} SOL balance)
        </div>
      </div>

      {/* Metric 3: Minimum Vault Reserve */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs transition-shadow hover:shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Reserve Solvency Floor
          </span>
          <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
            <Lock className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-3xl font-bold tracking-tight text-slate-900 font-mono">
            0.00145
          </span>
          <span className="text-base font-semibold text-slate-500">SOL</span>
        </div>
        <div className="mt-1 text-xs text-slate-500 font-sans">
          Rent-exempt safety floor enforced on every upgrade
        </div>
      </div>

      {/* Metric 4: Guardian Status */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs transition-shadow hover:shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Guardian Rollback Daemon
          </span>
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <ShieldCheck className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-2xl font-bold tracking-tight text-emerald-700 font-sans">
            Armed & Watching
          </span>
        </div>
        <div className="mt-1 text-xs text-slate-500 font-sans">
          Autonomous sub-second rescue engine ready
        </div>
      </div>
    </div>
  );
};
