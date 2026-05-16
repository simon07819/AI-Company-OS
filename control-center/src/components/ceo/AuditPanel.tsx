"use client";

import { useState } from "react";
import type { AuditItem, AuditReport } from "@/lib/agents/prelaunch-auditor/preLaunchAuditor";

interface AuditPanelProps {
  projectId: string;
  onClose: () => void;
  onProceed: () => void;
}

type PanelState = "idle" | "running" | "done" | "error";

const CATEGORY_LABELS: Record<string, string> = {
  legal: "Légal",
  secrets: "Credentials",
  owasp: "OWASP",
  headers: "Headers",
  ratelimit: "Rate Limit",
  storage: "Stockage",
  deps: "Dépendances",
};

function statusIcon(status: "PASS" | "WARN" | "BLOCK") {
  if (status === "PASS") return "✅";
  if (status === "WARN") return "⚠️";
  return "❌";
}

function severityIcon(severity: AuditItem["severity"]) {
  if (severity === "pass") return "✅";
  if (severity === "warning") return "⚠️";
  return "❌";
}

function scoreColor(score: number) {
  if (score >= 80) return "#22c55e";
  if (score >= 50) return "#f59e0b";
  return "#ef4444";
}

function AuditItemRow({ item }: { item: AuditItem }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      style={{
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        padding: "8px 0",
        cursor: "pointer",
      }}
      onClick={() => setOpen((o) => !o)}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 13 }}>{severityIcon(item.severity)}</span>
        <span style={{ fontSize: 12, fontWeight: 600, color: "#f4f4f5", flex: 1 }}>{item.title}</span>
        <span style={{ fontSize: 10, color: "#71717a", background: "rgba(255,255,255,0.05)", padding: "2px 6px", borderRadius: 4 }}>
          {CATEGORY_LABELS[item.category] ?? item.category}
        </span>
        {item.autoFixable && (
          <span style={{ fontSize: 9, color: "#60a5fa", background: "rgba(96,165,250,0.1)", padding: "2px 5px", borderRadius: 4 }}>
            auto-fix
          </span>
        )}
        <span style={{ fontSize: 10, color: "#52525b" }}>{open ? "▲" : "▼"}</span>
      </div>
      {open && (
        <p style={{ fontSize: 11, color: "#a1a1aa", margin: "6px 0 0 21px", lineHeight: 1.5 }}>{item.detail}</p>
      )}
    </div>
  );
}

export function AuditPanel({ projectId, onClose, onProceed }: AuditPanelProps) {
  const [state, setState] = useState<PanelState>("idle");
  const [report, setReport] = useState<AuditReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fixing, setFixing] = useState(false);
  const [activeTab, setActiveTab] = useState<"blockers" | "warnings" | "passed">("blockers");
  const [privacyHtml, setPrivacyHtml] = useState<string | null>(null);
  const [generatingPolicy, setGeneratingPolicy] = useState(false);

  async function runAudit() {
    setState("running");
    setError(null);
    setReport(null);
    try {
      const res = await fetch(`/api/audit/${projectId}`, { method: "GET" });
      const data = await res.json() as { ok: boolean; report?: AuditReport; error?: string };
      if (data.ok && data.report) {
        setReport(data.report);
        setState("done");
        setActiveTab(data.report.blockers.length > 0 ? "blockers" : data.report.warnings.length > 0 ? "warnings" : "passed");
      } else {
        setError(data.error ?? "Erreur inconnue");
        setState("error");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setState("error");
    }
  }

  async function applyFixes() {
    setFixing(true);
    try {
      const res = await fetch(`/api/audit/${projectId}/fix`, { method: "POST" });
      const data = await res.json() as { ok: boolean; report?: AuditReport; applied?: string[] };
      if (data.ok && data.report) {
        setReport(data.report);
        setActiveTab(data.report.blockers.length > 0 ? "blockers" : data.report.warnings.length > 0 ? "warnings" : "passed");
      }
    } finally {
      setFixing(false);
    }
  }

  async function generatePolicy() {
    setGeneratingPolicy(true);
    try {
      const res = await fetch(`/api/audit/${projectId}/privacy-policy`, { method: "POST" });
      const data = await res.json() as { ok: boolean; policyHtml?: string };
      if (data.ok && data.policyHtml) setPrivacyHtml(data.policyHtml);
    } finally {
      setGeneratingPolicy(false);
    }
  }

  const hasAutoFixable = report && (
    report.blockers.some((i) => i.autoFixable) || report.warnings.some((i) => i.autoFixable)
  );
  const needsPrivacyPolicy = report?.blockers.some((i) => i.id === "legal_no_privacy_policy");
  const tabItems = report ? (
    activeTab === "blockers" ? report.blockers :
    activeTab === "warnings" ? report.warnings :
    report.passed
  ) : [];

  return (
    <div className="audit-panel-overlay" role="dialog" aria-modal="true" aria-label="Audit pré-lancement">
      <div className="audit-panel">
        <div className="audit-panel-header">
          <strong>Audit pré-lancement</strong>
          <button type="button" className="audit-panel-close" onClick={onClose} aria-label="Fermer">✕</button>
        </div>

        {state === "idle" && (
          <div className="audit-panel-body audit-panel-idle">
            <p style={{ color: "#a1a1aa", fontSize: 13, marginBottom: 16 }}>
              L&apos;audit analyse votre projet pour détecter les problèmes de sécurité, de légalité et de configuration avant le déploiement.
            </p>
            <button type="button" className="audit-run-btn" onClick={() => void runAudit()}>
              Lancer l&apos;audit
            </button>
          </div>
        )}

        {state === "running" && (
          <div className="audit-panel-body" style={{ textAlign: "center", padding: "32px 0" }}>
            <div className="audit-spinner" />
            <p style={{ color: "#a1a1aa", fontSize: 13, marginTop: 12 }}>Analyse en cours…</p>
          </div>
        )}

        {state === "error" && (
          <div className="audit-panel-body">
            <p style={{ color: "#ef4444", fontSize: 13 }}>Erreur: {error}</p>
            <button type="button" className="audit-run-btn" onClick={() => void runAudit()} style={{ marginTop: 12 }}>
              Réessayer
            </button>
          </div>
        )}

        {state === "done" && report && (
          <>
            <div className="audit-score-row">
              <div className="audit-status-badge" data-status={report.overallStatus}>
                {statusIcon(report.overallStatus)} {report.overallStatus}
              </div>
              <div className="audit-score" style={{ color: scoreColor(report.score) }}>
                {report.score}<span style={{ fontSize: 11, opacity: 0.7 }}>/100</span>
              </div>
              <div className="audit-counts">
                <span style={{ color: "#ef4444" }}>❌ {report.blockers.length}</span>
                <span style={{ color: "#f59e0b" }}>⚠️ {report.warnings.length}</span>
                <span style={{ color: "#22c55e" }}>✅ {report.passed.length}</span>
              </div>
            </div>

            {report.autoFixed.length > 0 && (
              <div className="audit-autofixed">
                <strong>Corrections automatiques appliquées:</strong>
                <ul>
                  {report.autoFixed.map((fix) => (
                    <li key={fix}>{fix}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="audit-tabs">
              {(["blockers", "warnings", "passed"] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  className="audit-tab"
                  data-active={activeTab === tab}
                  onClick={() => setActiveTab(tab)}
                >
                  {tab === "blockers" ? `❌ Blocants (${report.blockers.length})` :
                   tab === "warnings" ? `⚠️ Avertissements (${report.warnings.length})` :
                   `✅ Validé (${report.passed.length})`}
                </button>
              ))}
            </div>

            <div className="audit-items-list">
              {tabItems.length === 0 ? (
                <p style={{ color: "#71717a", fontSize: 12, padding: "12px 0" }}>Aucun élément dans cette catégorie.</p>
              ) : (
                tabItems.map((item) => <AuditItemRow key={item.id} item={item} />)
              )}
            </div>

            <div className="audit-actions">
              {hasAutoFixable && (
                <button
                  type="button"
                  className="audit-fix-btn"
                  onClick={() => void applyFixes()}
                  disabled={fixing}
                >
                  {fixing ? "Correction en cours…" : "Appliquer les corrections auto"}
                </button>
              )}

              {needsPrivacyPolicy && !privacyHtml && (
                <button
                  type="button"
                  className="audit-policy-btn"
                  onClick={() => void generatePolicy()}
                  disabled={generatingPolicy}
                >
                  {generatingPolicy ? "Génération…" : "Générer politique de confidentialité"}
                </button>
              )}

              {privacyHtml && (
                <details style={{ marginTop: 8 }}>
                  <summary style={{ fontSize: 12, color: "#60a5fa", cursor: "pointer" }}>Voir la politique générée</summary>
                  <div
                    style={{ marginTop: 8, padding: 12, background: "rgba(255,255,255,0.04)", borderRadius: 6, fontSize: 11, color: "#a1a1aa", maxHeight: 200, overflow: "auto" }}
                    dangerouslySetInnerHTML={{ __html: privacyHtml }}
                  />
                </details>
              )}

              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <button type="button" className="audit-rerun-btn" onClick={() => void runAudit()}>
                  ↺ Relancer
                </button>
                <button
                  type="button"
                  className="audit-proceed-btn"
                  onClick={onProceed}
                  disabled={report.overallStatus === "BLOCK"}
                  title={report.overallStatus === "BLOCK" ? "Résoudre les blocants avant de déployer" : ""}
                >
                  {report.overallStatus === "BLOCK" ? "Déploiement bloqué" : "Procéder au déploiement →"}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
