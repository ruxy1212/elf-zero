import React from "react";
import { Shield, Radio, Terminal, Cpu } from "lucide-react";

export default function App() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              ElfZero <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-mono">ARMED</span>
            </h1>
            <p className="text-xs text-slate-400">Autonomous Pre-Upgrade Differential Security Agent</p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/80 border border-slate-700">
            <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span>Devnet Watcher: Polling</span>
          </div>
        </div>
      </header>

      <main className="flex-1 p-6 max-w-7xl mx-auto w-full grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-6">
          <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/40">
            <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-indigo-400" /> Monitored Vault State
            </h2>
            <div className="space-y-3 font-mono text-sm">
              <div className="flex justify-between py-2 border-b border-slate-800/60">
                <span className="text-slate-400">Vault Balance</span>
                <span className="text-white font-semibold">0.50 SOL</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-800/60">
                <span className="text-slate-400">Protected User</span>
                <span className="text-emerald-400 font-semibold">0.50 SOL</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-slate-400">Status</span>
                <span className="text-emerald-400">Protected</span>
              </div>
            </div>
          </div>
        </div>

        <div className="md:col-span-2 space-y-6">
          <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/40">
            <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Terminal className="w-4 h-4 text-emerald-400" /> LiteSVM Differential Sandbox Matrix
            </h2>
            <p className="text-xs text-slate-400">
              Awaiting staged BPF loader buffer on Devnet to execute Old vs New differential fuzzing battery...
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
