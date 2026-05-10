import { Activity, Bot, CheckCircle2, Database, KeyRound, Shield, Zap } from "lucide-react";

const settings = [
  {
    title: "NVIDIA Provider",
    description: "Runtime agents continue to use the existing NVIDIA API provider and environment key.",
    icon: <Zap size={18} />,
    status: process.env.NVIDIA_API_KEY ? "Configured" : "Missing key",
    tone: process.env.NVIDIA_API_KEY ? "green" : "yellow",
  },
  {
    title: "Agent Orchestration",
    description: "Multi-agent routing, retries, dependencies, auto_build and factory_cycle remain controlled by the backend.",
    icon: <Bot size={18} />,
    status: "Managed",
    tone: "green",
  },
  {
    title: "Task Queue",
    description: "Project task files, running locks and retry states are read by the existing APIs.",
    icon: <Database size={18} />,
    status: "Connected",
    tone: "blue",
  },
  {
    title: "Validation Layer",
    description: "Build, QA and validation actions stay available from the Actions and Factory centers.",
    icon: <CheckCircle2 size={18} />,
    status: "Ready",
    tone: "green",
  },
];

const controls = [
  "Keep NVIDIA_API_KEY in the runtime environment.",
  "Use Actions for explicit backend commands.",
  "Use Runtime for live inference visibility.",
  "Use Logs for detailed event inspection.",
];

export default function SettingsPage() {
  return (
    <main className="page settings-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">System configuration, provider readiness and operational guardrails for AI Company OS.</p>
        </div>
        <div className="page-actions">
          <span className="badge badge-green"><Shield size={12} /> Production shell</span>
        </div>
      </div>

      <section className="settings-hero">
        <div>
          <div className="settings-kicker"><KeyRound size={14} /> Environment</div>
          <h2>Provider configuration stays backend-owned.</h2>
          <p>
            This page exposes operational state without replacing the NVIDIA agents, worker queue,
            orchestration scripts or validation pipeline already in the system.
          </p>
        </div>
        <div className="settings-health-card">
          <Activity size={20} />
          <strong>{process.env.NVIDIA_API_KEY ? "NVIDIA key detected" : "NVIDIA key not detected"}</strong>
          <span>{process.env.NVIDIA_API_KEY ? "Agents can call the configured provider." : "Set NVIDIA_API_KEY before real inference runs."}</span>
        </div>
      </section>

      <section className="settings-grid">
        {settings.map((item) => (
          <div key={item.title} className="settings-card">
            <div className={`settings-card-icon ${item.tone}`}>{item.icon}</div>
            <div>
              <div className="settings-card-header">
                <h3>{item.title}</h3>
                <span className={`badge badge-${item.tone}`}>{item.status}</span>
              </div>
              <p>{item.description}</p>
            </div>
          </div>
        ))}
      </section>

      <section className="card settings-control-panel">
        <div>
          <h2>Operational Checklist</h2>
          <p className="page-subtitle">Simple rules for keeping the browser control plane aligned with the backend factory.</p>
        </div>
        <div className="settings-checklist">
          {controls.map((control) => (
            <div key={control} className="settings-check">
              <CheckCircle2 size={14} />
              <span>{control}</span>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
