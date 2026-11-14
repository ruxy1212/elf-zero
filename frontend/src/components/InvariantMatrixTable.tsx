import { FC, useState } from "react";
import {
  ShieldCheck,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Cpu,
  FileCode,
  Layers,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { DifferentialAuditReport, ScenarioResult } from "../types";

interface InvariantMatrixTableProps {
  auditReport: DifferentialAuditReport | null;
  isSimulating: boolean;
}

export const InvariantMatrixTable: FC<InvariantMatrixTableProps> = ({
  auditReport,
  isSimulating,
}) => {
  const [expandedScenario, setExpandedScenario] = useState<string | null>(null);

  const toggleExpand = (scenarioId: string) => {
    setExpandedScenario((prev) => (prev === scenarioId ? null : scenarioId));
  };

  const coreInvariants = [
    {
      id: "INV_RENT_FLOOR",
      name: "Rent Floor Integrity",
      desc: "Target vault lamports must remain >= minimum rent-exempt balance (890,880 lamports).",
      status: auditReport
        ? !auditReport.violations.some((v) => v.invariantId === "INV_RENT_FLOOR")
        : true,
    },
    {
      id: "INV_CONSERVATION",
      name: "Lamport Conservation",
      desc: "Total lamports across all vault and user positions must remain strictly invariant across operations.",
      status: auditReport
        ? !auditReport.violations.some((v) => v.invariantId === "INV_CONSERVATION")
        : true,
    },
    {
      id: "INV_UNAUTHORIZED_DRAIN",
      name: "Anti-Drain Backdoor Check",
      desc: "No backdoor or arbitrary authority instruction may transfer vault collateral without depositor authority.",
      status: auditReport
        ? !auditReport.violations.some((v) => v.invariantId === "INV_UNAUTHORIZED_DRAIN")
        : true,
    },
    {
      id: "INV_NON_CUSTODIAL_EXIT",
      name: "Non-Custodial Destination",
      desc: "Collateral evacuated via emergency_exit must return exclusively to user_position.owner.",
      status: auditReport
        ? !auditReport.violations.some((v) => v.invariantId === "INV_NON_CUSTODIAL_EXIT")
        : true,
    },
  ];

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-violet-50 text-violet-700 flex items-center justify-center">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-900 tracking-tight">
              Differential Invariant Matrix
            </h3>
            <p className="text-xs text-slate-500">
              Dual-execution comparison in LiteSVM sandbox between on-chain V1 state and staged candidate ELF
            </p>
          </div>
        </div>

        {auditReport && (
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border ${
                auditReport.isSafeToUpgrade
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-rose-50 text-rose-700 border-rose-200"
              }`}
            >
              {auditReport.isSafeToUpgrade ? (
                <>
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                  <span>ALL INVARIANTS SATISFIED</span>
                </>
              ) : (
                <>
                  <XCircle className="w-3.5 h-3.5 text-rose-600" />
                  <span>{auditReport.violations.length} INVARIANT VIOLATION(S)</span>
                </>
              )}
            </span>
          </div>
        )}
      </div>

      {/* 4 Invariant Badges */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
        {coreInvariants.map((inv) => {
          const isFailing = auditReport && !inv.status;
          return (
            <div
              key={inv.id}
              className={`p-3 rounded-lg border transition-all ${
                isFailing
                  ? "bg-rose-50/60 border-rose-200"
                  : "bg-slate-50/70 border-slate-200"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono font-semibold text-slate-700">
                  {inv.id}
                </span>
                {isSimulating ? (
                  <span className="w-2 h-2 rounded-full bg-violet-400 animate-ping" />
                ) : isFailing ? (
                  <span className="text-[10px] font-semibold text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded">
                    BREACHED
                  </span>
                ) : (
                  <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                    SAFE
                  </span>
                )}
              </div>
              <div className="mt-1 text-xs font-medium text-slate-900">{inv.name}</div>
              <div className="mt-1 text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                {inv.desc}
              </div>
            </div>
          );
        })}
      </div>

      {/* Scenario Breakdown Table */}
      <div className="mt-6 overflow-hidden rounded-lg border border-slate-200">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-4">Test Vector / Scenario</th>
                <th className="py-3 px-3">LiteSVM Exec</th>
                <th className="py-3 px-3">Compute Units</th>
                <th className="py-3 px-3">Invariant Checks</th>
                <th className="py-3 px-3 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {auditReport && auditReport.scenarios.length > 0 ? (
                auditReport.scenarios.map((sc: ScenarioResult) => {
                  const isExpanded = expandedScenario === sc.scenarioId;
                  const failedChecks = sc.invariantChecks.filter((c) => !c.passed);

                  return (
                    <tbody key={sc.scenarioId} className="group">
                      <tr
                        onClick={() => toggleExpand(sc.scenarioId)}
                        className={`hover:bg-slate-50/80 cursor-pointer transition-colors ${
                          !sc.passed ? "bg-rose-50/30" : ""
                        }`}
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            {sc.passed ? (
                              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                            ) : (
                              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                            )}
                            <div>
                              <div className="font-semibold text-slate-900 font-mono">
                                {sc.name}
                              </div>
                              <div className="text-[11px] text-slate-500 font-sans">
                                {sc.description}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-0.5 rounded font-mono font-medium text-[11px] ${
                              sc.txResult.success
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-rose-50 text-rose-700 border border-rose-200"
                            }`}
                          >
                            {sc.txResult.success ? "SUCCESS" : "FAILED / REVERTED"}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-600">
                          {Number(sc.txResult.computeUnitsConsumed).toLocaleString()} CU
                        </td>
                        <td className="py-3 px-3">
                          {failedChecks.length === 0 ? (
                            <span className="text-emerald-700 font-medium inline-flex items-center gap-1">
                              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                              {sc.invariantChecks.length}/{sc.invariantChecks.length} Passed
                            </span>
                          ) : (
                            <span className="text-rose-700 font-medium inline-flex items-center gap-1">
                              <XCircle className="w-3.5 h-3.5 text-rose-600" />
                              {failedChecks.length} Failed
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            type="button"
                            className="p-1 rounded hover:bg-slate-200/60 text-slate-500 hover:text-slate-800 transition-colors"
                          >
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </button>
                        </td>
                      </tr>

                      {/* Expandable Details Drawer */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={5} className="bg-slate-50/80 p-4 border-b border-slate-200">
                            <div className="space-y-3">
                              {/* Invariant checks details */}
                              <div>
                                <h4 className="text-[11px] uppercase font-semibold text-slate-500 tracking-wider mb-2 flex items-center gap-1.5">
                                  <Layers className="w-3.5 h-3.5 text-violet-700" /> Evaluated Invariant Assertions
                                </h4>
                                <div className="space-y-1.5">
                                  {sc.invariantChecks.map((check, idx) => (
                                    <div
                                      key={idx}
                                      className={`p-2.5 rounded-md text-xs border ${
                                        check.passed
                                          ? "bg-white border-slate-200 text-slate-700"
                                          : "bg-rose-50 border-rose-200 text-rose-900"
                                      }`}
                                    >
                                      <div className="flex items-center justify-between font-mono">
                                        <span className="font-semibold">{check.invariantId} - {check.name}</span>
                                        <span
                                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                            check.passed
                                              ? "bg-emerald-100 text-emerald-800"
                                              : "bg-rose-100 text-rose-800"
                                          }`}
                                        >
                                          {check.passed ? "PASSED" : "VIOLATION"}
                                        </span>
                                      </div>
                                      <div className="mt-1 text-[11px]">{check.details}</div>
                                      {check.observedDelta && (
                                        <div className="mt-2 text-[10px] font-mono bg-slate-100 p-2 rounded border border-slate-200 text-slate-800 flex flex-col gap-1">
                                          <div>Expected: {check.observedDelta.expected}</div>
                                          <div>Actual:   {check.observedDelta.actual}</div>
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* LiteSVM Logs */}
                              {sc.txResult.logs && sc.txResult.logs.length > 0 && (
                                <div>
                                  <h4 className="text-[11px] uppercase font-semibold text-slate-500 tracking-wider mb-1.5 flex items-center gap-1.5">
                                    <FileCode className="w-3.5 h-3.5 text-violet-700" /> SBF Execution Trace Logs
                                  </h4>
                                  <div className="p-2.5 bg-slate-900 text-slate-200 rounded-md font-mono text-[11px] overflow-x-auto max-h-40 leading-relaxed border border-slate-800">
                                    {sc.txResult.logs.map((log, lIdx) => (
                                      <div key={lIdx} className="whitespace-pre truncate">
                                        {log}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400 text-xs">
                    {isSimulating
                      ? "Differential sandbox executing test vectors in LiteSVM memory..."
                      : "No differential run active. Click 'Simulate Benign V2' or 'Simulate Malicious V2 Attack' above to trigger."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};