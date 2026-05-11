"use client";

import { useEffect, useState } from "react";
import {
  Building2,
  CheckCircle2,
  Cpu,
  DollarSign,
  RefreshCw,
  Save,
  Settings,
  TestTube2,
  ToggleLeft,
  ToggleRight,
  Zap,
} from "lucide-react";
import {
  ErrorBanner,
  GhostButton,
  LocalBadge,
  PageHeader,
  Panel,
  PrimaryButton,
  Row,
  SectionHeader,
  StatusBadge,
} from "@/components/ui";

// ─── Types ────────────────────────────────────────────────────────────────

interface AppSettings {
  companyName: string;
  businessEmail: string;
  phone: string;
  address: string;
  logoUrl: string | null;
  currency: string;
  taxRegion: string;
  tpsRate: number;
  tvqRate: number;
  invoicePrefix: string;
  defaultPaymentTerms: number;
  nvidiaKeyPresent: boolean;
  runtimeMode: "nvidia" | "simulation" | "hybrid";
  approvalMode: "manual" | "auto" | "supervised";
  autoPublish: boolean;
  autoInvoice: boolean;
  loopAggressiveness: "low" | "medium" | "high";
  defaultWorkspace: string;
  defaultMissionType: string;
  updatedAt: string;
}

interface NvidiaTestResult {
  connected: boolean;
  provider: string;
  message: string;
}

// ─── Constants ────────────────────────────────────────────────────────────

const TAX_REGIONS = [
  { value: "none", label: "No tax" },
  { value: "canada", label: "Canada (TPS/GST only)" },
  { value: "quebec", label: "Canada + Québec (TPS + TVQ)" },
  { value: "eu", label: "EU (VAT)" },
  { value: "us", label: "US (State tax)" },
];

const CURRENCIES = [
  { value: "CAD", label: "CAD — Canadian Dollar" },
  { value: "USD", label: "USD — US Dollar" },
  { value: "EUR", label: "EUR — Euro" },
];

const MISSION_TYPES = [
  { value: "saas_project", label: "SaaS Project" },
  { value: "website", label: "Website" },
  { value: "ecommerce_store", label: "E-Commerce Store" },
  { value: "flyer", label: "Flyer / Design" },
  { value: "branding_pack", label: "Branding Pack" },
  { value: "social_campaign", label: "Social Campaign" },
  { value: "automation_workflow", label: "Automation Workflow" },
];

// ─── Toggle ────────────────────────────────────────────────────────────────

function Toggle({ value, onChange, label, description }: {
  value: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <Row>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text)" }}>{label}</div>
        {description && <div style={{ fontSize: 10, color: "var(--text-3)" }}>{description}</div>}
      </div>
      <button
        onClick={() => onChange(!value)}
        style={{ background: "none", border: "none", cursor: "pointer", color: value ? "#22c55e" : "var(--text-3)", display: "flex", alignItems: "center" }}
      >
        {value ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
      </button>
    </Row>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [nvidiaResult, setNvidiaResult] = useState<NvidiaTestResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadSettings = async () => {
    try {
      const res = await fetch("/api/settings");
      if (res.ok) {
        const d = await res.json();
        setSettings(d.settings);
        setError(null);
      }
    } catch {
      setError("Failed to load settings");
    }
  };

  useEffect(() => { loadSettings(); }, []);

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        const d = await res.json();
        setSettings(d.settings);
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      }
    } catch { /* */ }
    setSaving(false);
  };

  const handleTestNvidia = async () => {
    setTesting(true);
    setNvidiaResult(null);
    try {
      const res = await fetch("/api/settings/test-nvidia", { method: "POST" });
      if (res.ok) {
        const d = await res.json();
        setNvidiaResult(d.result);
      }
    } catch { /* */ }
    setTesting(false);
  };

  const update = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    if (!settings) return;
    setSettings({ ...settings, [key]: value });
  };

  const input = {
    padding: "7px 10px", fontSize: 12,
    background: "var(--bg-2)", border: "1px solid var(--border)",
    borderRadius: 6, color: "var(--text)", outline: "none", width: "100%",
  };

  const label: React.CSSProperties = {
    fontSize: 10, fontWeight: 600, color: "var(--text-2)",
    marginBottom: 3, display: "block",
  };

  const pillBtn = (active: boolean) => ({
    padding: "5px 12px", fontSize: 11, fontWeight: 600,
    background: active ? "var(--accent-dim)" : "var(--bg-2)",
    border: `1px solid ${active ? "var(--accent)" : "var(--border)"}`,
    borderRadius: 8, color: active ? "var(--accent-light)" : "var(--text-3)",
    cursor: "pointer", transition: "all 120ms",
  });

  return (
    <div style={{ padding: "32px 40px", maxWidth: 860, margin: "0 auto" }}>
      <PageHeader
        icon={<Settings size={20} />}
        title="Settings"
        description="Configure your AI Company OS — all changes are persisted in data/settings.json"
        badge={<LocalBadge />}
        actions={
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {saved && (
              <span style={{ fontSize: 12, color: "#22c55e", display: "flex", alignItems: "center", gap: 4 }}>
                <CheckCircle2 size={12} /> Saved
              </span>
            )}
            <GhostButton onClick={loadSettings}><RefreshCw size={11} /> Refresh</GhostButton>
            <PrimaryButton onClick={handleSave} disabled={saving || !settings} color="#3b82f6">
              <Save size={11} /> {saving ? "Saving..." : "Save All"}
            </PrimaryButton>
          </div>
        }
      />

      {error && <ErrorBanner message={error} onRetry={loadSettings} />}

      {/* ── Section 1: AI Runtime ── */}
      <Panel>
        <SectionHeader title="AI Runtime" icon={<Cpu size={12} />} action={
          <PrimaryButton onClick={handleTestNvidia} disabled={testing} color="#3b82f6">
            <TestTube2 size={11} /> {testing ? "Testing..." : "Test NVIDIA"}
          </PrimaryButton>
        } />

        <Row>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text)" }}>NVIDIA API Key</div>
            <div style={{ fontSize: 10, color: "var(--text-3)" }}>
              {settings?.nvidiaKeyPresent
                ? "Key detected — set via NVIDIA_API_KEY environment variable"
                : "Not configured — add NVIDIA_API_KEY to your .env to enable GPU inference"}
            </div>
          </div>
          <StatusBadge
            label={settings?.nvidiaKeyPresent ? "Connected" : "Missing"}
            color={settings?.nvidiaKeyPresent ? "#22c55e" : "#f59e0b"}
          />
        </Row>

        {nvidiaResult && (
          <div style={{
            marginTop: 8, padding: "8px 12px",
            background: nvidiaResult.connected ? "rgba(34,197,94,0.08)" : "rgba(244,63,94,0.08)",
            border: `1px solid ${nvidiaResult.connected ? "rgba(34,197,94,0.3)" : "rgba(244,63,94,0.3)"}`,
            borderRadius: 6,
          }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: nvidiaResult.connected ? "#22c55e" : "#f43f5e" }}>
              {nvidiaResult.connected ? "Connection Successful" : "Connection Failed"}
            </div>
            <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 2 }}>{nvidiaResult.message}</div>
          </div>
        )}

        <div style={{ marginTop: 12 }}>
          <div style={label}>Runtime Mode</div>
          <div style={{ display: "flex", gap: 6 }}>
            {(["nvidia", "simulation", "hybrid"] as const).map((mode) => (
              <button key={mode} style={pillBtn(settings?.runtimeMode === mode)} onClick={() => update("runtimeMode", mode)}>
                {mode === "nvidia" && "NVIDIA GPU"}
                {mode === "simulation" && "Simulation"}
                {mode === "hybrid" && "Hybrid"}
              </button>
            ))}
          </div>
          <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 4 }}>
            {settings?.runtimeMode === "nvidia" && "All agent calls routed to NVIDIA Inference Microservices."}
            {settings?.runtimeMode === "simulation" && "Agents run in simulation mode — no real AI inference."}
            {settings?.runtimeMode === "hybrid" && "NVIDIA when available, simulation as fallback."}
          </div>
        </div>
      </Panel>

      {/* ── Section 2: Company Identity ── */}
      <Panel>
        <SectionHeader title="Company Identity" icon={<Building2 size={12} />} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <label style={label}>Company Name</label>
            <input style={input} value={settings?.companyName ?? ""} onChange={(e) => update("companyName", e.target.value)} placeholder="AI Company Inc." />
          </div>
          <div>
            <label style={label}>Business Email</label>
            <input style={input} type="email" value={settings?.businessEmail ?? ""} onChange={(e) => update("businessEmail", e.target.value)} placeholder="contact@company.com" />
          </div>
          <div>
            <label style={label}>Phone</label>
            <input style={input} type="tel" value={settings?.phone ?? ""} onChange={(e) => update("phone", e.target.value)} placeholder="+1 (514) 000-0000" />
          </div>
          <div>
            <label style={label}>Logo URL</label>
            <input style={input} value={settings?.logoUrl ?? ""} onChange={(e) => update("logoUrl", e.target.value || null)} placeholder="https://..." />
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <label style={label}>Address</label>
            <input style={input} value={settings?.address ?? ""} onChange={(e) => update("address", e.target.value)} placeholder="123 Rue Principale, Montréal, QC H1A 0A1" />
          </div>
        </div>
      </Panel>

      {/* ── Section 3: Invoice Settings ── */}
      <Panel>
        <SectionHeader title="Invoice Settings" icon={<DollarSign size={12} />} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <label style={label}>Invoice Prefix</label>
            <input style={input} value={settings?.invoicePrefix ?? "INV"} onChange={(e) => update("invoicePrefix", e.target.value)} placeholder="INV" />
          </div>
          <div>
            <label style={label}>Payment Terms (days)</label>
            <input style={input} type="number" value={settings?.defaultPaymentTerms ?? 30} onChange={(e) => update("defaultPaymentTerms", parseInt(e.target.value) || 30)} />
          </div>
          <div>
            <label style={label}>Currency</label>
            <select style={input} value={settings?.currency ?? "CAD"} onChange={(e) => update("currency", e.target.value)}>
              {CURRENCIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label style={label}>Tax Region</label>
            <select style={input} value={settings?.taxRegion ?? "quebec"} onChange={(e) => update("taxRegion", e.target.value)}>
              {TAX_REGIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
          <div>
            <label style={label}>TPS / GST Rate (%)</label>
            <input style={input} type="number" step="0.1" value={settings?.tpsRate ?? 5} onChange={(e) => update("tpsRate", parseFloat(e.target.value) || 0)} />
          </div>
          <div>
            <label style={label}>TVQ / QST Rate (%)</label>
            <input style={input} type="number" step="0.001" value={settings?.tvqRate ?? 9.975} onChange={(e) => update("tvqRate", parseFloat(e.target.value) || 0)} />
          </div>
        </div>
        {settings && (
          <div style={{ marginTop: 8, padding: "8px 12px", background: "rgba(59,130,246,0.08)", borderRadius: 6, fontSize: 11, color: "var(--text-2)" }}>
            Example: $1,000 service → Subtotal $1,000 + TPS ${(1000 * settings.tpsRate / 100).toFixed(2)} + TVQ ${(1000 * settings.tvqRate / 100).toFixed(2)} = <strong style={{ color: "var(--text)" }}>${(1000 * (1 + settings.tpsRate / 100 + settings.tvqRate / 100)).toFixed(2)}</strong>
          </div>
        )}
      </Panel>

      {/* ── Section 4: Automation ── */}
      <Panel>
        <SectionHeader title="Automation" icon={<Zap size={12} />} />

        <div style={{ marginBottom: 12 }}>
          <div style={label}>Approval Mode</div>
          <div style={{ display: "flex", gap: 6 }}>
            {(["manual", "supervised", "auto"] as const).map((mode) => (
              <button key={mode} style={pillBtn(settings?.approvalMode === mode)} onClick={() => update("approvalMode", mode)}>
                {mode === "manual" && "Manual"}
                {mode === "supervised" && "Supervised"}
                {mode === "auto" && "Automatic"}
              </button>
            ))}
          </div>
          <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 4 }}>
            {settings?.approvalMode === "manual" && "Every agent action requires your explicit approval."}
            {settings?.approvalMode === "supervised" && "High-risk actions need approval, routine tasks run automatically."}
            {settings?.approvalMode === "auto" && "Agents operate autonomously — you review results after completion."}
          </div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <div style={label}>Loop Aggressiveness</div>
          <div style={{ display: "flex", gap: 6 }}>
            {(["low", "medium", "high"] as const).map((level) => (
              <button
                key={level}
                style={pillBtn(settings?.loopAggressiveness === level)}
                onClick={() => update("loopAggressiveness", level)}
              >
                {level.charAt(0).toUpperCase() + level.slice(1)}
              </button>
            ))}
          </div>
          <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 4 }}>
            {settings?.loopAggressiveness === "low" && "Loops run every hour — conservative resource usage."}
            {settings?.loopAggressiveness === "medium" && "Loops run every 15 minutes — balanced performance."}
            {settings?.loopAggressiveness === "high" && "Loops run every 5 minutes — maximum throughput."}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <Toggle
            value={settings?.autoPublish ?? false}
            onChange={(v) => update("autoPublish", v)}
            label="Auto Publish"
            description="Automatically distribute content when missions complete"
          />
          <Toggle
            value={settings?.autoInvoice ?? false}
            onChange={(v) => update("autoInvoice", v)}
            label="Auto Invoice"
            description="Create invoices automatically when deliverables are approved"
          />
        </div>
      </Panel>

      {/* ── Section 5: Workspace Defaults ── */}
      <Panel>
        <SectionHeader title="Workspace Defaults" icon={<Building2 size={12} />} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <label style={label}>Default Mission Type</label>
            <select style={input} value={settings?.defaultMissionType ?? "saas_project"} onChange={(e) => update("defaultMissionType", e.target.value)}>
              {MISSION_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label style={label}>Default Workspace Name</label>
            <input style={input} value={settings?.defaultWorkspace ?? ""} onChange={(e) => update("defaultWorkspace", e.target.value)} placeholder="Main Workspace" />
          </div>
        </div>
      </Panel>

      {/* Save */}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 4, paddingBottom: 40 }}>
        {saved && (
          <span style={{ fontSize: 12, color: "#22c55e", display: "flex", alignItems: "center", gap: 4 }}>
            <CheckCircle2 size={12} /> Settings saved successfully
          </span>
        )}
        <PrimaryButton onClick={handleSave} disabled={saving || !settings} color="#3b82f6">
          <Save size={11} /> {saving ? "Saving..." : "Save Settings"}
        </PrimaryButton>
      </div>
    </div>
  );
}
