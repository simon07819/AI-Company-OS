"use client";

import { useState, useCallback } from "react";

interface RunResult {
  ok: boolean;
  command: string;
  stdout: string;
  stderr: string;
  exitCode: number;
}

export default function ProjectActions({ projectName }: { projectName: string }) {
  const [result, setResult] = useState<RunResult | null>(null);
  const [loading, setLoading] = useState<string | null>(null);

  const run = useCallback(async (action: string, extra: Record<string, string> = {}) => {
    setLoading(action);
    setResult(null);
    try {
      const res = await fetch(`/api/actions/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project: projectName, ...extra }),
      });
      const data = await res.json() as RunResult;
      setResult(data);
    } catch (err) {
      setResult({ ok: false, command: action, stdout: "", stderr: String(err), exitCode: 1 });
    } finally {
      setLoading(null);
    }
  }, [projectName]);

  return (
    <div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: result ? 16 : 0 }}>
        <button className="btn" disabled={loading !== null} onClick={() => run("factory-cycle")}>
          <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd"/>
          </svg>
          {loading === "factory-cycle" ? "Running…" : "Factory Cycle"}
        </button>
        <button className="btn btn-ghost" disabled={loading !== null} onClick={() => run("auto-build")}>
          <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd"/>
          </svg>
          {loading === "auto-build" ? "Running…" : "Auto Build"}
        </button>
        <button className="btn btn-ghost" disabled={loading !== null} onClick={() => run("init-monetization")}>
          {loading === "init-monetization" ? "Running…" : "Init Monetization"}
        </button>
        <button className="btn btn-ghost btn-sm" disabled={loading !== null} onClick={() => run("set-project-status", { status: "active" })}>
          Set Active
        </button>
        <button className="btn btn-ghost btn-sm" disabled={loading !== null} onClick={() => run("set-project-status", { status: "paused" })}>
          Pause
        </button>
      </div>

      {result && (
        <div className="result-box">
          <div className="result-box-header">
            <span className={`badge ${result.ok ? "badge-green" : "badge-red"}`}>
              {result.ok ? "success" : `exit ${result.exitCode}`}
            </span>
            <code>{result.command}</code>
          </div>
          <div className="result-box-body">
            {result.stdout && <pre className="output-box" style={{ borderRadius: result.stderr ? 0 : "0 0 var(--radius-sm) var(--radius-sm)" }}>{result.stdout}</pre>}
            {result.stderr && <pre className="output-box output-box-err" style={{ borderRadius: "0 0 var(--radius-sm) var(--radius-sm)", borderTop: result.stdout ? "1px solid var(--border)" : "none" }}>{result.stderr}</pre>}
            {!result.stdout && !result.stderr && <pre className="output-box" style={{ borderRadius: "0 0 var(--radius-sm) var(--radius-sm)", color: "var(--text-3)" }}>(no output)</pre>}
          </div>
        </div>
      )}
    </div>
  );
}
