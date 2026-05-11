"use client";

import { useEffect, useState } from "react";
import {
  CheckCircle2,
  DollarSign,
  KeyRound,
  RefreshCw,
  Save,
  Settings,
  Shield,
  TestTube2,
  Zap,
} from "lucide-react";
import {
  PageHeader,
  Panel,
  SectionHeader,
  StatusBadge,
  GhostButton,
  PrimaryButton,
  Row,
  ErrorBanner,
  LocalBadge,
} from "@/components/ui";

interface AppSettings {
  companyName: string;
  businessEmail: string;
  currency: string;
  taxRegion: string;
  tpsRate: number;
  tvqRate: number;
  invoicePrefix: string;
  defaultPaymentTerms: number;
  logoUrl: string | null;
  nvidiaKeyPresent: boolean;
  updatedAt: string;
}

interface NvidiaTestResult {
  connected: boolean;
  provider: string;
  message: string;
}

const TAX_REGIONS = [
  { value: "none", label: "No tax" },
  { value: "canada", label: "Canada (TPS/GST only)" },
  { value: "quebec", label: "Canada + Québec (TPS + TVQ)" },
  { value: "eu", label: "EU (VAT)" },
  { value: "us", label: "US (State tax)" },
];

const CURRENCIES = [
  { value: "CAD", label: "CAD $" },
  { value: "USD", label: "USD $" },
  { value: "EUR", label: "EUR €" },
];

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
        setTimeout(() => setSaved(false), 2000);
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

  const update = (key: keyof AppSettings, value: string | number | null) => {
    if (!settings) return;
    setSettings({ ...settings, [key]: value });
  };

  const inputStyle = {
    padding: "6px 10px", fontSize: 12,
    background: "var(--bg-2)", border: "1px solid var(--border)",
    borderRadius: 6, color: "var(--text)", outline: "none", width: "100%",
  };

  const labelStyle = { fontSize: 10, fontWeight: 600, color: "var(--text-2)", marginBottom: 3, display: "block" };

  return (
    <div style={{ padding: "32px 40px", maxWidth: 800, margin: "0 auto" }}>
      <PageHeader
        icon={<Settings size={20} />}
        title="Settings"
        description="Company info, tax configuration, NVIDIA connection and invoice defaults"
        badge={<LocalBadge />}
        actions={<GhostButton onClick={loadSettings}><RefreshCw size={11} /> Refresh</GhostButton>}
      />

      {error && <ErrorBanner message={error} onRetry={loadSettings} />}

      {/* NVIDIA Status */}
      <Panel>
        <SectionHeader title="NVIDIA Connection" icon={<Zap size={12} />} action={
          <PrimaryButton onClick={handleTestNvidia} disabled={testing} color="#3b82f6">
            <TestTube2 size={11} /> {testing ? "Testing..." : "Test NVIDIA"}
          </PrimaryButton>
        } />
        <Row>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text)" }}>API Key Status</div>
            <div style={{ fontSize: 10, color: "var(--text-3)" }}>
              {settings?.nvidiaKeyPresent ? "Key detected (value hidden)" : "Not configured — simulation mode active"}
            </div>
          </div>
          <StatusBadge label={settings?.nvidiaKeyPresent ? "Connected" : "Missing"} color={settings?.nvidiaKeyPresent ? "#22c55e" : "#f59e0b"} />
        </Row>
        {nvidiaResult && (
          <div style={{ marginTop: 8, padding: "8px 10px", background: nvidiaResult.connected ? "rgba(34,197,94,0.08)" : "rgba(244,63,94,0.08)", borderRadius: 6 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: nvidiaResult.connected ? "#22c55e" : "#f43f5e" }}>
              {nvidiaResult.connected ? "Connection Successful" : "Connection Failed"}
            </div>
            <div style={{ fontSize: 10, color: "var(--text-3)" }}>{nvidiaResult.message}</div>
          </div>
        )}
      </Panel>

      {/* Company Info */}
      <Panel>
        <SectionHeader title="Company Information" icon={<Shield size={12} />} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <label style={labelStyle}>Company Name</label>
            <input style={inputStyle} value={settings?.companyName ?? ""} onChange={(e) => update("companyName", e.target.value)} placeholder="Mon Entreprise" />
          </div>
          <div>
            <label style={labelStyle}>Business Email</label>
            <input style={inputStyle} value={settings?.businessEmail ?? ""} onChange={(e) => update("businessEmail", e.target.value)} placeholder="contact@entreprise.com" />
          </div>
        </div>
      </Panel>

      {/* Tax Configuration */}
      <Panel>
        <SectionHeader title="Tax Configuration" icon={<DollarSign size={12} />} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <label style={labelStyle}>Currency</label>
            <select style={inputStyle} value={settings?.currency ?? "CAD"} onChange={(e) => update("currency", e.target.value)}>
              {CURRENCIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Tax Region</label>
            <select style={inputStyle} value={settings?.taxRegion ?? "quebec"} onChange={(e) => update("taxRegion", e.target.value)}>
              {TAX_REGIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>TPS / GST %</label>
            <input style={inputStyle} type="number" step="0.1" value={settings?.tpsRate ?? 5} onChange={(e) => update("tpsRate", parseFloat(e.target.value) || 0)} />
          </div>
          <div>
            <label style={labelStyle}>TVQ / QST %</label>
            <input style={inputStyle} type="number" step="0.01" value={settings?.tvqRate ?? 9.975} onChange={(e) => update("tvqRate", parseFloat(e.target.value) || 0)} />
          </div>
        </div>
      </Panel>

      {/* Invoice Defaults */}
      <Panel>
        <SectionHeader title="Invoice Defaults" icon={<KeyRound size={12} />} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <label style={labelStyle}>Invoice Prefix</label>
            <input style={inputStyle} value={settings?.invoicePrefix ?? "INV"} onChange={(e) => update("invoicePrefix", e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Default Payment Terms (days)</label>
            <input style={inputStyle} type="number" value={settings?.defaultPaymentTerms ?? 30} onChange={(e) => update("defaultPaymentTerms", parseInt(e.target.value) || 30)} />
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <label style={labelStyle}>Logo URL (placeholder)</label>
            <input style={inputStyle} value={settings?.logoUrl ?? ""} onChange={(e) => update("logoUrl", e.target.value || null)} placeholder="https://..." />
          </div>
        </div>
      </Panel>

      {/* Save */}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 12 }}>
        {saved && <span style={{ fontSize: 12, color: "#22c55e", display: "flex", alignItems: "center", gap: 4 }}><CheckCircle2 size={12} /> Saved!</span>}
        <PrimaryButton onClick={handleSave} disabled={saving || !settings} color="#3b82f6">
          <Save size={11} /> {saving ? "Saving..." : "Save Settings"}
        </PrimaryButton>
      </div>
    </div>
  );
}
