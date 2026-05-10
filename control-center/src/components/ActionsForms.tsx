"use client";

import { useState, useCallback } from "react";

interface RunResult {
  ok: boolean;
  command: string;
  stdout: string;
  stderr: string;
  exitCode: number;
}

interface Field {
  name: string;
  label: string;
  placeholder?: string;
  type?: string;
  options?: string[];
  required?: boolean;
}

interface ActionCardProps {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  description: string;
  action: string;
  fields: Field[];
  defaults?: Record<string, string>;
  projectNames?: string[];
}

function ActionCard({ icon, iconBg, title, description, action, fields, defaults = {}, projectNames = [] }: ActionCardProps) {
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
    <div className="action-card">
      <div className="action-card-header">
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 2 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 9,
              background: iconBg,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            {icon}
          </div>
          <div>
            <div className="action-card-title">{title}</div>
            <div className="action-card-desc">{description}</div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="action-card-body">
        {fields.map((f) => (
          <div key={f.name} className="form-group">
            <label className="form-label">{f.label}</label>
            {f.options ? (
              <select
                className="form-select"
                value={values[f.name] ?? ""}
                onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))}
                required={f.required}
              >
                <option value="">— select —</option>
                {f.options.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            ) : f.name === "project" && projectNames.length > 0 ? (
              <select
                className="form-select"
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
                placeholder={f.placeholder}
                value={values[f.name] ?? ""}
                onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))}
                required={f.required}
              />
            )}
          </div>
        ))}

        <button className="btn" type="submit" disabled={loading} style={{ alignSelf: "flex-start" }}>
          {loading ? (
            <>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: "spin 1s linear infinite" }}>
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
              </svg>
              Running…
            </>
          ) : "Run"}
        </button>
      </form>

      {result && (
        <div style={{ padding: "0 20px 20px" }}>
          <div className="result-box">
            <div className="result-box-header">
              <span className={`badge ${result.ok ? "badge-green" : "badge-red"}`}>
                {result.ok ? "success" : `exit ${result.exitCode}`}
              </span>
              <code>{result.command}</code>
            </div>
            <div className="result-box-body">
              {result.stdout && (
                <pre className="output-box" style={{ borderRadius: result.stderr ? 0 : "0 0 var(--radius-sm) var(--radius-sm)" }}>
                  {result.stdout}
                </pre>
              )}
              {result.stderr && (
                <pre className="output-box output-box-err" style={{ borderRadius: "0 0 var(--radius-sm) var(--radius-sm)", borderTop: result.stdout ? "1px solid var(--border)" : "none" }}>
                  {result.stderr}
                </pre>
              )}
              {!result.stdout && !result.stderr && (
                <pre className="output-box" style={{ borderRadius: "0 0 var(--radius-sm) var(--radius-sm)", color: "var(--text-3)" }}>
                  (no output)
                </pre>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Icons
const IcoRocket = () => (
  <svg width="17" height="17" viewBox="0 0 20 20" fill="#818cf8">
    <path d="M10 1.5c-1.5 2-2.5 4.5-2.5 7 0 1 .2 2 .5 2.9L5 14l1 1 2.6-3c.9.3 1.9.5 2.9.5 5 0 8.5-4 8.5-4S16.5 3.5 10 1.5zm3 5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM3.5 14.5a2 2 0 01-2-2c0-.8.8-1.5 1-2 .2.5.4 1 .8 1.4.4.4.9.7 1.4.8-.5.2-1.2 1-1.2 1.8z"/>
  </svg>
);

const IcoMoney = () => (
  <svg width="17" height="17" viewBox="0 0 20 20" fill="#34d399">
    <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z"/>
    <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd"/>
  </svg>
);

const IcoCycle = () => (
  <svg width="17" height="17" viewBox="0 0 20 20" fill="#f59e0b">
    <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd"/>
  </svg>
);

const IcoBuild = () => (
  <svg width="17" height="17" viewBox="0 0 20 20" fill="#3b82f6">
    <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd"/>
  </svg>
);

const IcoStatus = () => (
  <svg width="17" height="17" viewBox="0 0 20 20" fill="#a78bfa">
    <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11 4a1 1 0 10-2 0v4a1 1 0 102 0V7zm-3 1a1 1 0 10-2 0v3a1 1 0 102 0V8zM8 9a1 1 0 00-2 0v2a1 1 0 102 0V9z" clipRule="evenodd"/>
  </svg>
);

export default function ActionsForms({ projectNames }: { projectNames: string[] }) {
  return (
    <>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
          gap: 16,
          alignItems: "start",
        }}
      >
        <ActionCard
          icon={<IcoRocket />}
          iconBg="var(--accent-dim)"
          title="Create Product"
          description="Initialize a new project with tasks, roadmap, and metadata."
          action="create-product"
          fields={[
            { name: "project", label: "Project Name", placeholder: "MyApp", required: true },
            { name: "idea",    label: "Product Idea",  placeholder: "SaaS for gym management", required: true },
          ]}
          projectNames={[]}
        />
        <ActionCard
          icon={<IcoMoney />}
          iconBg="var(--green-dim)"
          title="Init Monetization"
          description="Generate Stripe integration stubs and billing tasks."
          action="init-monetization"
          fields={[
            { name: "project", label: "Project", required: true },
          ]}
          projectNames={projectNames}
        />
        <ActionCard
          icon={<IcoCycle />}
          iconBg="var(--yellow-dim)"
          title="Factory Cycle"
          description="Pick the next queued task and execute it with the right agent."
          action="factory-cycle"
          fields={[
            { name: "project", label: "Project", required: true },
          ]}
          projectNames={projectNames}
        />
        <ActionCard
          icon={<IcoBuild />}
          iconBg="var(--blue-dim)"
          title="Auto Build"
          description="Run a full autonomous build pass — all queued tasks, in order."
          action="auto-build"
          fields={[
            { name: "project", label: "Project", required: true },
          ]}
          projectNames={projectNames}
        />
        <ActionCard
          icon={<IcoStatus />}
          iconBg="var(--purple-dim)"
          title="Set Project Status"
          description="Change a project's lifecycle status."
          action="set-project-status"
          fields={[
            { name: "project", label: "Project", required: true },
            { name: "status",  label: "New Status", options: ["active", "paused", "archived"], required: true },
          ]}
          projectNames={projectNames}
        />
      </div>
    </>
  );
}
