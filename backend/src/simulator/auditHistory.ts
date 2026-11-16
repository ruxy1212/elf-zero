import fs from "fs";
import path from "path";

export interface AuditHistoryEntry {
  id: string;
  timestamp: number;
  simulationType: "BENIGN_V2" | "MALICIOUS_V2";
  candidateSha256: string;
  verdict: "SAFE" | "MALICIOUS_BACKDOOR_DETECTED";
  riskScore: number;
  rescuedAmountSol: string;
  signature?: string;
  summary: string;
  advisory?: {
    title: string;
    executiveSummary: string;
    technicalAnalysis: string;
  };
}

const HISTORY_FILE = path.resolve(__dirname, "../../.audit_history.json");

export function loadHistory(): AuditHistoryEntry[] {
  try {
    if (fs.existsSync(HISTORY_FILE)) {
      const data = fs.readFileSync(HISTORY_FILE, "utf-8");
      return JSON.parse(data);
    }
  } catch (err) {
    console.warn("[AuditHistory] Could not read history file:", err);
  }
  return [];
}

export function saveHistory(history: AuditHistoryEntry[]): void {
  try {
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2), "utf-8");
  } catch (err) {
    console.warn("[AuditHistory] Could not save history file:", err);
  }
}

export function addHistoryEntry(entry: AuditHistoryEntry): void {
  const history = loadHistory();
  // Keep newest first, max 20 entries
  history.unshift(entry);
  if (history.length > 20) {
    history.length = 20;
  }
  saveHistory(history);
}

export function clearHistory(): void {
  saveHistory([]);
}
