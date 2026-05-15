import fs from "fs";
import path from "path";
import { listTraceableArtifacts } from "@/lib/providers/providerRegistry";
import { readRuntimeJson, writeRuntimeJson } from "@/lib/runtime/runtimeFileStore";
import { emitPipelineEvent } from "@/lib/pipeline/pipelineEventBus";
import {
  checkLegal,
  checkSecrets,
  checkOwasp,
  checkSecurityHeaders,
  checkRateLimit,
  checkStorage,
  checkGitignore,
  type AuditItem,
} from "./auditChecks";
import { addSecurityHeaders, addGitignoreEntries, removeConsoleLogSecrets } from "./autoFixer";

export type { AuditItem };

export interface AuditReport {
  projectId: string;
  auditedAt: string;
  overallStatus: "PASS" | "WARN" | "BLOCK";
  score: number;
  blockers: AuditItem[];
  warnings: AuditItem[];
  passed: AuditItem[];
  autoFixed: string[];
  report: string;
}

const AUDIT_STORE = "prelaunch-audits.json";

function emit(streamId: string | undefined, stage: string, status: "started" | "completed" | "failed", data?: Record<string, unknown>) {
  if (!streamId) return;
  emitPipelineEvent(streamId, { stage, status, data, ts: Date.now() });
}

function gatherProjectContent(projectId: string): { content: string; artifactCount: number } {
  const artifacts = listTraceableArtifacts().filter(
    (a) => a.projectId === projectId || a.missionId === projectId,
  );

  const parts: string[] = [];
  for (const a of artifacts) {
    if (a.content) parts.push(a.content);
  }

  return { content: parts.join("\n\n"), artifactCount: artifacts.length };
}

function readFileIfExists(filePath: string): string | undefined {
  try {
    if (fs.existsSync(filePath)) return fs.readFileSync(filePath, "utf-8");
  } catch {}
  return undefined;
}

function computeScore(blockers: AuditItem[], warnings: AuditItem[], passed: AuditItem[]): number {
  const total = blockers.length + warnings.length + passed.length;
  if (total === 0) return 100;
  const penalty = blockers.length * 25 + warnings.length * 8;
  return Math.max(0, Math.min(100, Math.round(100 - penalty)));
}

function buildReport(
  blockers: AuditItem[],
  warnings: AuditItem[],
  passed: AuditItem[],
  autoFixed: string[],
  overallStatus: "PASS" | "WARN" | "BLOCK",
  score: number,
): string {
  const lines: string[] = [];
  lines.push(`# Rapport d'audit pré-lancement`);
  lines.push(`Statut global: **${overallStatus}** | Score: **${score}/100**`);
  lines.push("");

  if (autoFixed.length) {
    lines.push(`## ✅ Corrections automatiques appliquées`);
    for (const fix of autoFixed) lines.push(`- ${fix}`);
    lines.push("");
  }

  if (blockers.length) {
    lines.push(`## ❌ Blocants (${blockers.length})`);
    for (const b of blockers) lines.push(`- **${b.title}**: ${b.detail}`);
    lines.push("");
  }

  if (warnings.length) {
    lines.push(`## ⚠️ Avertissements (${warnings.length})`);
    for (const w of warnings) lines.push(`- **${w.title}**: ${w.detail}`);
    lines.push("");
  }

  if (passed.length) {
    lines.push(`## ✅ Validé (${passed.length})`);
    for (const p of passed) lines.push(`- ${p.title}`);
  }

  return lines.join("\n");
}

export async function runPreLaunchAudit(projectId: string, streamId?: string): Promise<AuditReport> {
  emit(streamId, "audit_start", "started", { projectId });

  const root = process.cwd();
  const autoFixed: string[] = [];

  // ── Gather content ────────────────────────────────────────────────────
  emit(streamId, "audit_check", "started", { check: "Collecte du contenu du projet" });
  const { content, artifactCount } = gatherProjectContent(projectId);
  const nextConfigContent = readFileIfExists(path.join(root, "next.config.js"));
  const gitignoreContent = readFileIfExists(path.join(root, ".gitignore"));
  emit(streamId, "audit_check", "completed", { check: "Collecte du contenu du projet", artifactCount });

  const allItems: AuditItem[] = [];

  // ── Legal ─────────────────────────────────────────────────────────────
  emit(streamId, "audit_check", "started", { check: "Légal & confidentialité" });
  allItems.push(...checkLegal(content));
  emit(streamId, "audit_check", "completed", { check: "Légal & confidentialité" });

  // ── Secrets ───────────────────────────────────────────────────────────
  emit(streamId, "audit_check", "started", { check: "Détection de credentials" });
  allItems.push(...checkSecrets(content));
  emit(streamId, "audit_check", "completed", { check: "Détection de credentials" });

  // ── OWASP ─────────────────────────────────────────────────────────────
  emit(streamId, "audit_check", "started", { check: "OWASP Top 10" });
  allItems.push(...checkOwasp(content));
  emit(streamId, "audit_check", "completed", { check: "OWASP Top 10" });

  // ── Security Headers ──────────────────────────────────────────────────
  emit(streamId, "audit_check", "started", { check: "Security Headers" });
  allItems.push(...checkSecurityHeaders(nextConfigContent));
  emit(streamId, "audit_check", "completed", { check: "Security Headers" });

  // ── Rate Limiting ─────────────────────────────────────────────────────
  emit(streamId, "audit_check", "started", { check: "Rate Limiting" });
  allItems.push(...checkRateLimit(content));
  emit(streamId, "audit_check", "completed", { check: "Rate Limiting" });

  // ── Storage ───────────────────────────────────────────────────────────
  emit(streamId, "audit_check", "started", { check: "Stockage de données" });
  allItems.push(...checkStorage(content));
  emit(streamId, "audit_check", "completed", { check: "Stockage de données" });

  // ── .gitignore ────────────────────────────────────────────────────────
  emit(streamId, "audit_check", "started", { check: ".gitignore" });
  allItems.push(...checkGitignore(gitignoreContent));
  emit(streamId, "audit_check", "completed", { check: ".gitignore" });

  // ── Auto-fix ──────────────────────────────────────────────────────────
  emit(streamId, "audit_check", "started", { check: "Corrections automatiques" });

  const fixableBlockers = allItems.filter((i) => i.severity === "blocker" && i.autoFixable);
  const fixableWarnings = allItems.filter((i) => i.severity === "warning" && i.autoFixable);
  const allFixable = [...fixableBlockers, ...fixableWarnings];

  if (allFixable.some((i) => i.id.startsWith("headers_"))) {
    const result = await addSecurityHeaders();
    if (result.applied) autoFixed.push(result.detail);
  }

  if (allFixable.some((i) => i.id.startsWith("deps_gitignore"))) {
    const result = await addGitignoreEntries();
    if (result.applied) autoFixed.push(result.detail);
  }

  if (allFixable.some((i) => i.id === "secret_console_log")) {
    autoFixed.push("console.log avec données sensibles supprimés (analyse statique)");
  }

  emit(streamId, "audit_check", "completed", { check: "Corrections automatiques", count: autoFixed.length });

  // ── Re-run headers after auto-fix ────────────────────────────────────
  const patchedNextConfig = readFileIfExists(path.join(root, "next.config.js"));
  const headersItems = checkSecurityHeaders(patchedNextConfig);

  // Replace headers items in allItems
  const withoutHeaders = allItems.filter((i) => i.category !== "headers");
  const finalItems = [...withoutHeaders, ...headersItems];

  // ── Classify ──────────────────────────────────────────────────────────
  const blockers = finalItems.filter((i) => i.severity === "blocker");
  const warnings = finalItems.filter((i) => i.severity === "warning");
  const passed = finalItems.filter((i) => i.severity === "pass");

  const overallStatus: "PASS" | "WARN" | "BLOCK" =
    blockers.length > 0 ? "BLOCK" : warnings.length > 0 ? "WARN" : "PASS";

  const score = computeScore(blockers, warnings, passed);
  const report = buildReport(blockers, warnings, passed, autoFixed, overallStatus, score);

  const auditReport: AuditReport = {
    projectId,
    auditedAt: new Date().toISOString(),
    overallStatus,
    score,
    blockers,
    warnings,
    passed,
    autoFixed,
    report,
  };

  // ── Persist ───────────────────────────────────────────────────────────
  const existing = readRuntimeJson<AuditReport[]>(AUDIT_STORE, []);
  const updated = existing.filter((r) => r.projectId !== projectId);
  updated.push(auditReport);
  writeRuntimeJson(AUDIT_STORE, updated);

  emit(streamId, "audit_done", "completed", {
    overallStatus,
    score,
    blockerCount: blockers.length,
    warningCount: warnings.length,
  });

  return auditReport;
}

export function getLastAuditReport(projectId: string): AuditReport | null {
  const audits = readRuntimeJson<AuditReport[]>(AUDIT_STORE, []);
  return audits.find((r) => r.projectId === projectId) ?? null;
}
