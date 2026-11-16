import { useState, useEffect, useCallback, useRef } from "react";
import {
  ProtocolStatus,
  SimulationRunResult,
  SimulationTimelineEvent,
} from "../types";

export function useDashboardState() {
  const [status, setStatus] = useState<ProtocolStatus | null>(null);
  const [timeline, setTimeline] = useState<SimulationTimelineEvent[]>([]);
  const [activeSimulation, setActiveSimulation] =
    useState<SimulationRunResult | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isDepositing, setIsDepositing] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);

  // Fetch protocol status from backend API
  const refreshStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/status");
      if (!res.ok) {
        throw new Error(`Status fetch error: ${res.statusText}`);
      }
      const data: ProtocolStatus = await res.json();
      setStatus(data);
      if (data.lastSimulationResult && !activeSimulation) {
        setActiveSimulation(data.lastSimulationResult);
        setTimeline(data.lastSimulationResult.timeline || []);
      }
      setError(null);
    } catch (err: any) {
      console.warn("Could not fetch /api/status:", err.message);
    }
  }, [activeSimulation]);

  // Connect to WebSocket telemetry feed
  useEffect(() => {
    let reconnectTimer: NodeJS.Timeout;

    function connectWs() {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setWsConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === "TIMELINE_EVENT") {
            setTimeline((prev) => [...prev, msg.payload]);
          } else if (msg.type === "SIMULATION_COMPLETED") {
            setActiveSimulation(msg.payload);
            setIsSimulating(false);
            refreshStatus();
          } else if (msg.type === "INITIAL_STATE") {
            if (msg.payload?.lastSimulationResult) {
              setActiveSimulation(msg.payload.lastSimulationResult);
              setTimeline(msg.payload.lastSimulationResult.timeline || []);
            }
          }
        } catch (err) {
          console.error("Error parsing WS message:", err);
        }
      };

      ws.onclose = () => {
        setWsConnected(false);
        reconnectTimer = setTimeout(connectWs, 3000);
      };

      ws.onerror = () => {
        setWsConnected(false);
      };
    }

    connectWs();
    refreshStatus();

    // Poll status every 4 seconds as reliable source of truth
    const pollTimer = setInterval(refreshStatus, 4000);

    return () => {
      clearTimeout(reconnectTimer);
      clearInterval(pollTimer);
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [refreshStatus]);

  // Trigger simulation action
  const triggerSimulation = useCallback(
    async (type: "BENIGN_V2" | "MALICIOUS_V2") => {
      setIsSimulating(true);
      setError(null);
      setTimeline([]);

      const endpoint =
        type === "BENIGN_V2"
          ? "/api/simulate/benign"
          : "/api/simulate/malicious";

      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });

        if (!res.ok) {
          throw new Error(`Simulation failed: ${res.statusText}`);
        }

        const data = await res.json();
        if (data.success && data.result) {
          setActiveSimulation(data.result);
          setTimeline(data.result.timeline || []);
        }
      } catch (err: any) {
        console.error("Simulation trigger error:", err);
        setError(err.message);
      } finally {
        setIsSimulating(false);
        refreshStatus();
      }
    },
    [refreshStatus]
  );

  // Deposit 0.10 SOL into vault on Devnet
  const depositToVault = useCallback(async () => {
    setIsDepositing(true);
    setError(null);
    try {
      const res = await fetch("/api/vault/deposit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        throw new Error(`Deposit failed: ${res.statusText}`);
      }
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "Deposit transaction failed");
      }
      await refreshStatus();
    } catch (err: any) {
      console.error("Deposit error:", err);
      setError(err.message);
    } finally {
      setIsDepositing(false);
    }
  }, [refreshStatus]);

  // Reset demo state
  const resetDemo = useCallback(async () => {
    setError(null);
    try {
      await fetch("/api/demo/reset", { method: "POST" });
      setActiveSimulation(null);
      setTimeline([]);
      await refreshStatus();
    } catch (err: any) {
      console.warn("Reset error:", err.message);
    }
  }, [refreshStatus]);

  return {
    status,
    timeline,
    activeSimulation,
    isSimulating,
    isDepositing,
    wsConnected,
    error,
    history: status?.history || [],
    triggerSimulation,
    depositToVault,
    resetDemo,
    refreshStatus,
  };
}
