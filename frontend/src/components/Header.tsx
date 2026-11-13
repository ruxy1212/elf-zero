import { FC, useState } from "react";
import { Shield, Copy, Check, Radio } from "lucide-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useRole, PRECONFIGURED_ROLES } from "../context/WalletProvider";
import { Role } from "../types";

interface HeaderProps {
  programId: string;
  wsConnected: boolean;
}

export const Header: FC<HeaderProps> = ({ programId, wsConnected }) => {
  const { activeRole, setActiveRole } = useRole();
  const [copied, setCopied] = useState(false);

  const handleCopyProgramId = () => {
    navigator.clipboard.writeText(programId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left: Brand & Wordmark */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-700 flex items-center justify-center text-white shadow-sm">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold tracking-tight text-slate-900">
                  ElfZero
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-violet-50 text-violet-700 border border-violet-100">
                  Autonomous Guardian
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span>Program:</span>
                <button
                  onClick={handleCopyProgramId}
                  className="font-mono text-slate-700 hover:text-violet-700 inline-flex items-center gap-1 transition-colors"
                  title="Click to copy full Program ID"
                >
                  {programId.slice(0, 6)}...{programId.slice(-6)}
                  {copied ? (
                    <Check className="w-3 h-3 text-emerald-600" />
                  ) : (
                    <Copy className="w-3 h-3 text-slate-400" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Center: Cluster & Feed Status */}
          <div className="hidden md:flex items-center gap-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
              <span className="w-2 h-2 rounded-full bg-violet-600" />
              <span>Solana Devnet</span>
            </div>

            <div
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${
                wsConnected
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-amber-50 text-amber-700 border-amber-200"
              }`}
            >
              <Radio
                className={`w-3 h-3 ${wsConnected ? "text-emerald-600" : "text-amber-600"}`}
              />
              <span>{wsConnected ? "Live Telemetry" : "Reconnecting..."}</span>
            </div>
          </div>

          {/* Right: Role Switcher & Wallet */}
          <div className="flex items-center gap-3">
            {/* Role Switcher Pill Bar */}
            <div className="hidden lg:flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200">
              {(Object.keys(PRECONFIGURED_ROLES) as Role[]).map((r) => {
                const isSelected = activeRole === r;
                return (
                  <button
                    key={r}
                    onClick={() => setActiveRole(r)}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                      isSelected
                        ? "bg-white text-violet-900 shadow-xs border border-slate-200 font-semibold"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    {r === "GUARDIAN" && "Guardian"}
                    {r === "AUTHORITY" && "Authority"}
                    {r === "USER" && "User"}
                  </button>
                );
              })}
            </div>

            {/* Wallet Connect Button */}
            <div className="wallet-btn-wrapper">
              <WalletMultiButton className="!bg-violet-700 hover:!bg-violet-800 !text-white !font-medium !text-xs !py-2 !px-4 !rounded-lg !h-auto !shadow-xs !transition-colors" />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
