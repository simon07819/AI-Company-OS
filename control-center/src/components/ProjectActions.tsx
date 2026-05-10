"use client";

import { useState, useCallback } from "react";

interface RunResult {
  ok: boolean;
  command: string;
  stdout: string;
  stderr: string;
  exitCode: number;
}

interface Props {
  projectName: string;
}

export default function ProjectActions({ projectName }: Props) {
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
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        <button
          className="btn"
          disabled={loading !== null}
          onClick={() => run("factory-cycle")}
        >
          {loading === "factory-cycle" ? "Running…" : "Run Factory Cycle"}
        </button>
        <button
          className="btn btn-ghost"
          disabled={loading !== null}
          onClick={() => run("auto-build")}
        >
          {loading === "auto-build" ? "Running…" : "Auto Build"}
        </button>
        <button
          className="btn btn-ghost"
          disabled={loading !== null}
          onClick={() => run("init-monetization")}
        >
          {loading === "init-monetization" ? "Running…" : "Init Monetization"}
        </button>
        <button
          className="btn btn-ghost"
          disabled={loading !== null}
          onClick={() => run("set-project-status", { status: "active" })}
          title="Set status to active"
        >
          Set Active
        </button>
        <button
          className="btn btn-ghost"
          disabled={loading !== null}
          onClick={() => run("set-project-status", { status: "paused" })}
          title="Set status to paused"
        >
          Pause
        </button>
      </div>
      {result && (
        <div>
          <div style={{ marginBottom: 6 }}>
            <span className={`badge ${result.ok ? "badge-green" : "badge-red"}`}>
              {result.ok ? "success" : `exit ${result.exitCode}`}
            </span>
            <code style={{ marginLeft: 8, fontSize: 11, color: "var(--muted)" }}>{result.command}</code>
          </div>
          {result.stdout && <pre className="output-box">{result.stdout}</pre>}
          {result.stderr && <pre className="output-box output-box-err">{result.stderr}</pre>}
        </div>
      )}
    </div>
  );
}
