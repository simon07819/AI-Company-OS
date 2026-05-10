"use client";

import { useState, useEffect, useCallback } from "react";

export interface TaskWithProject {
  id: number | string;
  title: string;
  status: string;
  project: string;
  department?: string;
  description?: string;
  branch_name?: string;
  branch?: string;
  pr_url?: string;
  started_at?: string;
  failed_at?: string;
  completed_at?: string;
  error?: string;
  estimated_cost_usd?: number;
  priority?: string;
  created_at?: string;
}

export interface TaskSummary {
  total: number;
  queued: number;
  running: number;
  failed: number;
  completed: number;
  archived: number;
}

export function useTasks(project?: string, pollMs = 8000) {
  const [tasks, setTasks] = useState<TaskWithProject[]>([]);
  const [summary, setSummary] = useState<TaskSummary>({
    total: 0, queued: 0, running: 0, failed: 0, completed: 0, archived: 0,
  });
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const url = project
        ? `/api/tasks?project=${encodeURIComponent(project)}`
        : "/api/tasks";
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { tasks: TaskWithProject[]; summary: TaskSummary };
      setTasks(data.tasks);
      setSummary(data.summary);
    } catch {
      // silent fallback
    } finally {
      setLoading(false);
    }
  }, [project]);

  useEffect(() => {
    void refresh();
    const iv = setInterval(() => { void refresh(); }, pollMs);
    return () => clearInterval(iv);
  }, [refresh, pollMs]);

  const retryTask = useCallback(async (projectName: string, taskId: string | number) => {
    const res = await fetch("/api/tasks/retry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ project: projectName, taskId: String(taskId) }),
    });
    const result = (await res.json()) as { ok: boolean; error?: string };
    if (result.ok) {
      await refresh();
    }
    return result;
  }, [refresh]);

  return { tasks, summary, loading, refresh, retryTask };
}
