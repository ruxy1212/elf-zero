import { FC, useState } from "react";
import { Shield, Copy, Check, RotateCcw, Activity } from "lucide-react";

interface HeaderProps {
  programId: string;
  isOnline: boolean;
  onResetDemo: () => void;
}

export const Header: FC<HeaderProps> = ({ programId, isOnline, onResetDemo }) => {
  const [copied, setCopied] = useState(false);

  const handleCopyProgramId = () => {
    navigator.clipboard.writeText(programId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left: Brand */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-violet-700 flex items-center justify-center text-white shadow-xs">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold tracking-tight text-slate-900">
                  ElfZero
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-violet-50 text-violet-700 border border-violet-100">
                  Upgrade Defense Guardian
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <span>Contract:</span>
                <button
                  onClick={handleCopyProgramId}
                  className="font-mono text-slate-700 hover:text-violet-700 inline-flex items-center gap-1 transition-colors font-medium text-[11px]"
                  title="Click to copy full Program ID"
                >
                  {programId.slice(0, 6)}...{programId.slice(-6)}
                  {copied ? (
                    <Check className="w-3 h-3 text-emerald-600 ml-0.5" />
                  ) : (
                    <Copy className="w-3 h-3 text-slate-400 ml-0.5" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Right: Cluster status & Reset Demo */}
          <div className="flex items-center gap-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
              <span className="w-2 h-2 rounded-full bg-violet-600" />
              <span>Solana Devnet</span>
            </div>

            <div
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${
                isOnline
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-amber-50 text-amber-700 border-amber-200"
              }`}
            >
              <Activity className="w-3 h-3 text-emerald-600" />
              <span>{isOnline ? "Guardian Armed" : "Connecting..."}</span>
            </div>

            <button
              onClick={onResetDemo}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 shadow-xs transition-all active:scale-98"
              title="Reset simulation and audit history"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
              <span>Reset Demo</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
