"use client";

import { useState, useCallback } from "react";

interface RunResult {
  ok: boolean;
  command: string;
  stdout: string;
  stderr: string;
  exitCode: number;
}

interface ActionCardProps {
  title: string;
  description: string;
  action: string;
  fields: { name: string; label: string; type?: string; options?: string[]; required?: boolean }[];
  defaults?: Record<string, string>;
  projectNames?: string[];
}

function ActionCard({ title, description, action, fields, defaults = {}, projectNames = [] }: ActionCardProps) {
  const [values, setValues] = useState<Record<string, string>>(defaults);
  const [result, setResult] = useState<RunResult | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch(`/api/actions/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json() as RunResult;
      setResult(data);
    } catch (err) {
      setResult({ ok: false, command: action, stdout: "", stderr: String(err), exitCode: 1 });
    } finally {
      setLoading(false);
    }
  }, [action, values]);

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <h3 style={{ marginBottom: 4 }}>{title}</h3>
      <p style={{ fontSize: 12, color: "var(--muted)", marginBottom: 16 }}>{description}</p>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {fields.map((f) => (
          <div key={f.name} className="form-group">
            <label className="form-label">{f.label}</label>
            {f.options ? (
              <select
                className="form-input"
                value={values[f.name] ?? ""}
                onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))}
                required={f.required}
              >
                <option value="">— select —</option>
                {f.options.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            ) : f.name === "project" && projectNames.length > 0 ? (
              <select
                className="form-input"
                value={values[f.name] ?? ""}
                onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))}
                required={f.required}
              >
                <option value="">— select project —</option>
                {projectNames.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            ) : (
              <input
                className="form-input"
                type={f.type ?? "text"}
                value={values[f.name] ?? ""}
                onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))}
                required={f.required}
              />
            )}
          </div>
        ))}
        <div>
          <button className="btn" type="submit" disabled={loading}>
            {loading ? "Running…" : "Run"}
          </button>
        </div>
      </form>
      {result && (
        <div style={{ marginTop: 14 }}>
          <div style={{ marginBottom: 6 }}>
            <span className={`badge ${result.ok ? "badge-green" : "badge-red"}`}>
              {result.ok ? "success" : `exit ${result.exitCode}`}
            </span>
            <code style={{ marginLeft: 8, fontSize: 11, color: "var(--muted)" }}>{result.command}</code>
          </div>
          {result.stdout && (
            <pre className="output-box">{result.stdout}</pre>
          )}
          {result.stderr && (
            <pre className="output-box output-box-err">{result.stderr}</pre>
          )}
        </div>
      )}
    </div>
  );
}

export default function ActionsForms({ projectNames }: { projectNames: string[] }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
        gap: 16,
        alignItems: "start",
      }}
    >
      <ActionCard
        title="Create Product"
        description="Initialize a new project directory with tasks, roadmap, and metadata."
        action="create-product"
        fields={[
          { name: "project", label: "Project Name", required: true },
          { name: "idea", label: "Product Idea", required: true },
        ]}
        projectNames={[]}
      />
      <ActionCard
        title="Init Monetization"
        description="Generate Stripe integration stubs and billing tasks for a project."
        action="init-monetization"
        fields={[
          { name: "project", label: "Project", required: true },
        ]}
        projectNames={projectNames}
      />
      <ActionCard
        title="Factory Cycle"
        description="Run one factory cycle — pick the next queued task and execute it."
        action="factory-cycle"
        fields={[
          { name: "project", label: "Project", required: true },
        ]}
        projectNames={projectNames}
      />
      <ActionCard
        title="Auto Build"
        description="Run a full autonomous build pass for a project."
        action="auto-build"
        fields={[
          { name: "project", label: "Project", required: true },
        ]}
        projectNames={projectNames}
      />
      <ActionCard
        title="Set Project Status"
        description="Change a project's status (active / paused / archived)."
        action="set-project-status"
        fields={[
          { name: "project", label: "Project", required: true },
          { name: "status", label: "Status", options: ["active", "paused", "archived"], required: true },
        ]}
        projectNames={projectNames}
      />
    </div>
  );
}
