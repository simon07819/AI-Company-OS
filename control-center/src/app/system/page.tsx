"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Database,
  DollarSign,
  Download,
  HardDrive,
  Info,
  RefreshCw,
  Shield,
  Zap,
} from "lucide-react";
import {
  PageHeader,
  MetricCard,
  Panel,
  SectionHeader,
  StatusBadge,
  EmptyState,
  GhostButton,
  PrimaryButton,
  LocalBadge,
  Row,
} from "@/components/ui";

// ─── Types ────────────────────────────────────────────────────────────────

type HealthCheck = { id: string; label: string; status: "pass" | "fail" | "warn"; detail: string };
type StoreHealth = { file: string; exists: boolean; parseable: boolean; size: number; entries: number };
type EnvironmentInfo = { nodeVersion: string; platform: string; nvidiaKeyPresent: boolean; dataDirWritable: boolean; uptime: string };
type DiskUsage = { dataDirBytes: number; dataDirFiles: number; workspacesDirBytes: number; workspacesDirFiles: number; totalBytes: number };
type BackupManifest = { id: string; createdAt: string; files: { name: string; size: number }[]; totalSize: number; note: string };

interface SystemHealthReport {
  score: number;
  status: "healthy" | "degraded" | "unhealthy";
  checks: HealthCheck[];
  environment: EnvironmentInfo;
  stores: StoreHealth[];
  diskUsage: DiskUsage;
  demoQa: { score: number; passed: number; failed: number; warnings: number; totalChecks: number; recommendations: string[] } | null;
  warnings: string[];
  recommendations: string[];
}

const STATUS_CFG = {
  healthy:  { color: "#22c55e", label: "Healthy" },
  degraded: { color: "#f59e0b", label: "Degraded" },
  unhealthy:{ color: "#f43f5e", label: "Unhealthy" },
};

const CHECK_ICONS: Record<string, React.ReactNode> = {
  pass: <CheckCircle2 size={12} style={{ color: "#22c55e" }} />,
  fail: <AlertTriangle size={12} style={{ color: "#f43f5e" }} />,
  warn: <AlertTriangle size={12} style={{ color: "#f59e0b" }} />,
};

// ─── Page ─────────────────────────────────────────────────────────────────

export default function SystemPage() {
  const [health, setHealth] = useState<SystemHealthReport | null>(null);
  const [backups, setBackups] = useState<BackupManifest[]>([]);
  const [loading, setLoading] = useState(true);
  const [backingUp, setBackingUp] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [hRes, bRes] = await Promise.all([
        fetch("/api/system/health"),
        fetch("/api/system/backups"),
      ]);
      if (hRes.ok) { const d = await hRes.json(); setHealth(d.health); }
      if (bRes.ok) { const d = await bRes.json(); setBackups(d.backups ?? []); }
    } catch { /* */ }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const handleBackup = async () => {
    setBackingUp(true);
    try {
      const res = await fetch("/api/system/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: "Manual backup from System Center" }),
      });
      if (res.ok) {
        const d = await res.json();
        if (d.backup) setBackups([d.backup, ...backups]);
      }
    } catch { /* */ }
    setBackingUp(false);
  };

  const fmtBytes = (b: number) => b < 1024 ? `${b} B` : b < 1048576 ? `${(b / 1024).toFixed(1)} KB` : `${(b / 1048576).toFixed(1)} MB`;

  return (
    <div style={{ padding: "32px 40px", maxWidth: 1200, margin: "0 auto" }}>
      <PageHeader
        icon={<Shield size={20} />}
        title="System Health & Backup"
        description="Production readiness checks, data store integrity, disk usage and backup management"
        badge={<LocalBadge />}
        actions={<GhostButton onClick={loadData} disabled={loading}><RefreshCw size={11} style={{ animation: loading ? "spin 1s linear infinite" : "none" }} /> Refresh</GhostButton>}
      />

      <AnimatePresence mode="wait">
        <motion.div key="content" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>

          {/* ── HEALTH SCORE ── */}
          {health && (
            <section style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 16, marginBottom: 32 }}>
              <Panel>
                <SectionHeader title="System Health Score" />
                <div style={{ fontSize: 58, lineHeight: 1, fontWeight: 900, color: STATUS_CFG[health.status].color }}>
                  {health.score}
                </div>
                <div style={{ marginTop: 8 }}>
                  <StatusBadge label={STATUS_CFG[health.status].label} color={STATUS_CFG[health.status].color} size="md" />
                </div>
                <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 12 }}>
                  {health.checks.filter((c) => c.status === "pass").length}/{health.checks.length} checks passing
                </div>
              </Panel>

              <Panel>
                <SectionHeader title="Health Checks" />
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {health.checks.map((check) => {
                    const cfg = check.status === "pass" ? { color: "#22c55e", bg: "rgba(34,197,94,0.12)", label: "PASS" }
                      : check.status === "fail" ? { color: "#f43f5e", bg: "rgba(244,63,94,0.12)", label: "FAIL" }
                      : { color: "#f59e0b", bg: "rgba(245,158,11,0.12)", label: "WARN" };
                    return (
                      <Row key={check.id}>
                        {CHECK_ICONS[check.status]}
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text)" }}>{check.label}</div>
                          <div style={{ fontSize: 10, color: "var(--text-3)" }}>{check.detail}</div>
                        </div>
                        <StatusBadge label={cfg.label} color={cfg.color} bg={cfg.bg} />
                      </Row>
                    );
                  })}
                </div>
              </Panel>
            </section>
          )}

          {/* ── ENVIRONMENT ── */}
          {health && (
            <Panel>
              <SectionHeader title="Environment" icon={<Info size={12} />} />
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 10 }}>
                <MetricCard label="Node Version" value={health.environment.nodeVersion} color="#22c55e" />
                <MetricCard label="Platform" value={health.environment.platform} color="#3b82f6" />
                <MetricCard label="NVIDIA Key" value={health.environment.nvidiaKeyPresent ? "Present" : "Not set"} color={health.environment.nvidiaKeyPresent ? "#22c55e" : "#f59e0b"} />
                <MetricCard label="Data Dir Writable" value={health.environment.dataDirWritable ? "Yes" : "No"} color={health.environment.dataDirWritable ? "#22c55e" : "#f43f5e"} />
                <MetricCard label="Uptime" value={health.environment.uptime} color="#a78bfa" />
              </div>
            </Panel>
          )}

          {/* ── DATA STORES ── */}
          {health && (
            <Panel>
              <SectionHeader title="Data Stores" icon={<Database size={12} />} />
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {health.stores.map((store) => (
                  <Row key={store.file}>
                    <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: "var(--text)", fontFamily: "monospace" }}>{store.file}</span>
                    <span style={{ fontSize: 10, color: "var(--text-3)" }}>{fmtBytes(store.size)}</span>
                    <span style={{ fontSize: 10, color: "var(--text-3)" }}>{store.entries} entries</span>
                    {!store.exists ? <StatusBadge label="Missing" color="#94a3b8" /> :
                     !store.parseable ? <StatusBadge label="Corrupt" color="#f43f5e" /> :
                     <StatusBadge label="OK" color="#22c55e" />}
                  </Row>
                ))}
              </div>
            </Panel>
          )}

          {/* ── DISK USAGE ── */}
          {health && (
            <Panel>
              <SectionHeader title="Disk Usage" icon={<HardDrive size={12} />} />
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 10 }}>
                <MetricCard label="Data Directory" value={fmtBytes(health.diskUsage.dataDirBytes)} color="#3b82f6" />
                <MetricCard label="Data Files" value={health.diskUsage.dataDirFiles} color="#6366f1" />
                <MetricCard label="Workspaces" value={fmtBytes(health.diskUsage.workspacesDirBytes)} color="#a78bfa" />
                <MetricCard label="Workspace Files" value={health.diskUsage.workspacesDirFiles} color="#8b5cf6" />
                <MetricCard label="Total Size" value={fmtBytes(health.diskUsage.totalBytes)} color="#22c55e" />
              </div>
            </Panel>
          )}

          {/* ── DEMO QA SNAPSHOT ── */}
          {health?.demoQa && (
            <Panel>
              <SectionHeader title="Demo QA Snapshot" icon={<Zap size={12} />} />
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10, marginBottom: 12 }}>
                <MetricCard label="QA Score" value={health.demoQa.score} color={health.demoQa.score >= 80 ? "#22c55e" : health.demoQa.score >= 50 ? "#f59e0b" : "#f43f5e"} />
                <MetricCard label="Passed" value={health.demoQa.passed} color="#22c55e" />
                <MetricCard label="Failed" value={health.demoQa.failed} color="#f43f5e" />
                <MetricCard label="Warnings" value={health.demoQa.warnings} color="#f59e0b" />
              </div>
              {health.demoQa.recommendations.length > 0 && (
                <div style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "8px 12px" }}>
                  {health.demoQa.recommendations.map((r, i) => (
                    <div key={i} style={{ fontSize: 11, color: "var(--text-3)" }}>• {r}</div>
                  ))}
                </div>
              )}
            </Panel>
          )}

          {/* ── WARNINGS & RECOMMENDATIONS ── */}
          {health && (health.warnings.length > 0 || health.recommendations.length > 0) && (
            <Panel>
              <SectionHeader title="Warnings & Recommendations" icon={<AlertTriangle size={12} style={{ color: "#f59e0b" }} />} />
              {health.warnings.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  {health.warnings.map((w, i) => (
                    <div key={i} style={{ fontSize: 12, color: "#f59e0b", marginBottom: 3 }}>⚠ {w}</div>
                  ))}
                </div>
              )}
              {health.recommendations.map((r, i) => (
                <div key={i} style={{ fontSize: 12, color: "var(--text-2)", marginBottom: 3 }}>→ {r}</div>
              ))}
            </Panel>
          )}

          {/* ── BACKUP CENTER ── */}
          <Panel>
            <SectionHeader title="Backup Center" icon={<Download size={12} />} action={<PrimaryButton onClick={handleBackup} disabled={backingUp} color="#6366f1"><Download size={11} /> Create Backup</PrimaryButton>} />
            {backups.length === 0 ? (
              <EmptyState title="No backups yet" description="Create your first backup to protect all data stores. Backups are stored locally in data/backups/." action={<PrimaryButton onClick={handleBackup} color="#6366f1">Create Backup</PrimaryButton>} />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {backups.map((b) => (
                  <Row key={b.id}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text)" }}>{new Date(b.createdAt).toLocaleString()}</div>
                      <div style={{ fontSize: 10, color: "var(--text-3)" }}>{b.note} — {b.files.length} file(s)</div>
                    </div>
                    <span style={{ fontSize: 10, color: "var(--text-3)" }}>{fmtBytes(b.totalSize)}</span>
                    <StatusBadge label="Saved" color="#22c55e" />
                  </Row>
                ))}
              </div>
            )}
          </Panel>

        </motion.div>
      </AnimatePresence>
    </div>
  );
}
