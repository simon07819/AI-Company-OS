"use client";

import { useState, useEffect, useCallback } from "react";

export interface SystemStatus {
  ok: boolean;
  timestamp: string;
  projects: number;
  totalTasks: number;
  queued: number;
  running: number;
  failed: number;
  completed: number;
  archived: number;
  successRate: number;
  nvidiaStatus: "online" | "offline" | "unknown";
  logFileExists: boolean;
  logEntries: number;
  lastActivity: string | null;
  workers: number;
}

export function useSystemStatus(pollMs = 6000) {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/status", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as SystemStatus;
      setStatus(data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch status");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const iv = setInterval(() => { void refresh(); }, pollMs);
    return () => clearInterval(iv);
  }, [refresh, pollMs]);

  return { status, loading, error, refresh };
}
