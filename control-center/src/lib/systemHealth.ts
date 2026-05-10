import fs from "fs";
import path from "path";
import { runDemoQa, type QaResult } from "./demoQa";

// ─── Paths ────────────────────────────────────────────────────────────────

const REPO_ROOT = process.cwd();
const DATA_DIR = path.join(REPO_ROOT, "data");
const BACKUP_DIR = path.join(DATA_DIR, "backups");
const WORKSPACES_DIR = path.join(REPO_ROOT, "generated", "autopilot-workspaces");

const STORE_FILES = [
  "autopilot-sessions.json",
  "client-crm.json",
  "loop-state.json",
  "company-workspaces.json",
  "onboarding-state.json",
  "revenue-system.json",
  "distribution-engine.json",
  "runtime-state.json",
];

// ─── Types ────────────────────────────────────────────────────────────────

export type HealthStatus = "healthy" | "degraded" | "unhealthy";

export interface HealthCheck {
  id: string;
  label: string;
  status: "pass" | "fail" | "warn";
  detail: string;
}

export interface StoreHealth {
  file: string;
  exists: boolean;
  parseable: boolean;
  size: number;
  entries: number;
}

export interface EnvironmentInfo {
  nodeVersion: string;
  platform: string;
  nvidiaKeyPresent: boolean;  // only true/false, never the value
  dataDirWritable: boolean;
  uptime: string;
}

export interface DiskUsage {
  dataDirBytes: number;
  dataDirFiles: number;
  workspacesDirBytes: number;
  workspacesDirFiles: number;
  totalBytes: number;
}

export interface BackupManifest {
  id: string;
  createdAt: string;
  files: { name: string; size: number }[];
  totalSize: number;
  note: string;
}

export interface SystemHealthReport {
  score: number;            // 0-100
  status: HealthStatus;
  checks: HealthCheck[];
  environment: EnvironmentInfo;
  stores: StoreHealth[];
  diskUsage: DiskUsage;
  demoQa: QaResult | null;
  warnings: string[];
  recommendations: string[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function dirSize(dir: string): { bytes: number; files: number } {
  if (!fs.existsSync(dir)) return { bytes: 0, files: 0 };
  let bytes = 0;
  let files = 0;
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isFile()) {
        try { bytes += fs.statSync(full).size; files++; } catch { /* */ }
      } else if (entry.isDirectory() && entry.name !== "backups") {
        const sub = dirSize(full);
        bytes += sub.bytes;
        files += sub.files;
      }
    }
  } catch { /* */ }
  return { bytes, files };
}

function tryParseJSON(filePath: string): { parseable: boolean; entries: number } {
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed)) return { parseable: true, entries: parsed.length };
    if (typeof parsed === "object" && parsed !== null) return { parseable: true, entries: Object.keys(parsed).length };
    return { parseable: true, entries: 0 };
  } catch {
    return { parseable: false, entries: 0 };
  }
}

// ─── Health Checks ────────────────────────────────────────────────────────

function checkDataDirWritable(): HealthCheck {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    const testFile = path.join(DATA_DIR, ".health-write-test");
    fs.writeFileSync(testFile, "ok", "utf-8");
    fs.unlinkSync(testFile);
    return { id: "data_writable", label: "Data Directory Writable", status: "pass", detail: `${DATA_DIR} is writable` };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return { id: "data_writable", label: "Data Directory Writable", status: "fail", detail: `Not writable: ${msg}` };
  }
}

function checkStores(): { checks: HealthCheck[]; storeHealth: StoreHealth[] } {
  const checks: HealthCheck[] = [];
  const storeHealth: StoreHealth[] = [];

  let allExist = true;
  let allParseable = true;

  for (const file of STORE_FILES) {
    const filePath = path.join(DATA_DIR, file);
    const exists = fs.existsSync(filePath);
    let parseable = false;
    let entries = 0;
    let size = 0;

    if (exists) {
      try { size = fs.statSync(filePath).size; } catch { /* */ }
      const result = tryParseJSON(filePath);
      parseable = result.parseable;
      entries = result.entries;
      if (!parseable) allParseable = false;
    } else {
      allExist = false;
    }

    storeHealth.push({ file, exists, parseable, size, entries });
  }

  if (allExist && allParseable) {
    checks.push({ id: "stores", label: "Data Stores", status: "pass", detail: `${STORE_FILES.length} stores present and valid` });
  } else if (allExist && !allParseable) {
    const corrupt = storeHealth.filter((s) => s.exists && !s.parseable).map((s) => s.file);
    checks.push({ id: "stores", label: "Data Stores", status: "fail", detail: `Corrupt JSON: ${corrupt.join(", ")}` });
  } else {
    const missing = storeHealth.filter((s) => !s.exists).map((s) => s.file);
    checks.push({ id: "stores", label: "Data Stores", status: "warn", detail: `Missing: ${missing.join(", ")} (will be created on first use)` });
  }

  return { checks, storeHealth };
}

function checkNvidiaKey(): HealthCheck {
  const present = !!process.env.NVIDIA_API_KEY;
  return {
    id: "nvidia_key",
    label: "NVIDIA API Key",
    status: present ? "pass" : "warn",
    detail: present ? "Key detected (value hidden)" : "Not set — simulation mode active",
  };
}

function checkRuntimeState(): HealthCheck {
  const filePath = path.join(DATA_DIR, "runtime-state.json");
  if (!fs.existsSync(filePath)) {
    return { id: "runtime", label: "Runtime State", status: "warn", detail: "No runtime state file (will be created on first agent run)" };
  }
  const result = tryParseJSON(filePath);
  if (!result.parseable) {
    return { id: "runtime", label: "Runtime State", status: "fail", detail: "Corrupt runtime-state.json" };
  }
  return { id: "runtime", label: "Runtime State", status: "pass", detail: `Runtime state valid (${result.entries} keys)` };
}

function checkWorkspacesDir(): HealthCheck {
  if (!fs.existsSync(WORKSPACES_DIR)) {
    return { id: "workspaces_dir", label: "Workspaces Directory", status: "warn", detail: "No workspaces directory yet (created when missions run)" };
  }
  try {
    const entries = fs.readdirSync(WORKSPACES_DIR, { withFileTypes: true });
    const dirs = entries.filter((e) => e.isDirectory()).length;
    return { id: "workspaces_dir", label: "Workspaces Directory", status: "pass", detail: `${dirs} workspace director${dirs === 1 ? "y" : "ies"}` };
  } catch {
    return { id: "workspaces_dir", label: "Workspaces Directory", status: "fail", detail: "Cannot read workspaces directory" };
  }
}

function checkDemoQa(): { check: HealthCheck; qaResult: QaResult | null } {
  try {
    const qa = runDemoQa();
    const status: "pass" | "fail" | "warn" = qa.score >= 80 ? "pass" : qa.score >= 50 ? "warn" : "fail";
    return {
      check: { id: "demo_qa", label: "Demo QA Score", status, detail: `Score ${qa.score}/100 (${qa.passed}/${qa.totalChecks} passed)` },
      qaResult: qa,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return {
      check: { id: "demo_qa", label: "Demo QA Score", status: "fail", detail: `QA run failed: ${msg}` },
      qaResult: null,
    };
  }
}

// ─── Main Health Report ───────────────────────────────────────────────────

export function getSystemHealth(): SystemHealthReport {
  const checks: HealthCheck[] = [];
  const warnings: string[] = [];
  const recommendations: string[] = [];

  // Data dir writable
  checks.push(checkDataDirWritable());

  // Stores
  const storeResult = checkStores();
  checks.push(...storeResult.checks);
  const corruptStores = storeResult.storeHealth.filter((s) => s.exists && !s.parseable);
  if (corruptStores.length > 0) {
    warnings.push(`Corrupt JSON files: ${corruptStores.map((s) => s.file).join(", ")}`);
    recommendations.push("Restore from a backup or delete corrupt files to allow auto-recreation.");
  }

  // NVIDIA key
  checks.push(checkNvidiaKey());

  // Runtime
  checks.push(checkRuntimeState());

  // Workspaces dir
  checks.push(checkWorkspacesDir());

  // Demo QA
  const qaResult = checkDemoQa();
  checks.push(qaResult.check);
  if (qaResult.qaResult && qaResult.qaResult.recommendations.length > 0) {
    recommendations.push(...qaResult.qaResult.recommendations);
  }

  // Disk usage
  const dataUsage = dirSize(DATA_DIR);
  const wsUsage = dirSize(WORKSPACES_DIR);
  const diskUsage: DiskUsage = {
    dataDirBytes: dataUsage.bytes,
    dataDirFiles: dataUsage.files,
    workspacesDirBytes: wsUsage.bytes,
    workspacesDirFiles: wsUsage.files,
    totalBytes: dataUsage.bytes + wsUsage.bytes,
  };

  // Large data warning
  if (diskUsage.totalBytes > 50 * 1024 * 1024) {
    warnings.push(`Total data size ${(diskUsage.totalBytes / 1024 / 1024).toFixed(1)}MB exceeds 50MB — consider backup and cleanup.`);
  }

  // Environment
  const environment: EnvironmentInfo = {
    nodeVersion: process.version,
    platform: `${process.platform} ${process.arch}`,
    nvidiaKeyPresent: !!process.env.NVIDIA_API_KEY,
    dataDirWritable: checks[0].status === "pass",
    uptime: formatUptime(process.uptime()),
  };

  // Score
  const passed = checks.filter((c) => c.status === "pass").length;
  const total = checks.length;
  const score = Math.round((passed / Math.max(total, 1)) * 100);

  const status: HealthStatus = score >= 80 ? "healthy" : score >= 50 ? "degraded" : "unhealthy";

  if (score < 50 && recommendations.length === 0) {
    recommendations.push("Seed demo data at /demo to initialize the system.");
  }

  return {
    score,
    status,
    checks,
    environment,
    stores: storeResult.storeHealth,
    diskUsage,
    demoQa: qaResult.qaResult,
    warnings,
    recommendations,
  };
}

function formatUptime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${h}h ${m}m ${s}s`;
}

// ─── Backup ───────────────────────────────────────────────────────────────

export function createBackup(note = "Manual backup"): BackupManifest | null {
  try {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });

    const id = `backup-${Date.now()}`;
    const backupPath = path.join(BACKUP_DIR, id);
    fs.mkdirSync(backupPath, { recursive: true });

    const files: { name: string; size: number }[] = [];
    let totalSize = 0;

    // Copy data JSON files
    for (const file of STORE_FILES) {
      const src = path.join(DATA_DIR, file);
      if (fs.existsSync(src)) {
        const content = fs.readFileSync(src);
        fs.writeFileSync(path.join(backupPath, file), content);
        files.push({ name: file, size: content.length });
        totalSize += content.length;
      }
    }

    // Write manifest
    const manifest: BackupManifest = {
      id,
      createdAt: new Date().toISOString(),
      files,
      totalSize,
      note,
    };
    fs.writeFileSync(path.join(backupPath, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n", "utf-8");

    return manifest;
  } catch {
    return null;
  }
}

export function listBackups(): BackupManifest[] {
  if (!fs.existsSync(BACKUP_DIR)) return [];
  try {
    const entries = fs.readdirSync(BACKUP_DIR, { withFileTypes: true });
    const manifests: BackupManifest[] = [];
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const manifestPath = path.join(BACKUP_DIR, entry.name, "manifest.json");
      if (fs.existsSync(manifestPath)) {
        try {
          const parsed = JSON.parse(fs.readFileSync(manifestPath, "utf-8")) as BackupManifest;
          manifests.push(parsed);
        } catch { /* skip corrupt */ }
      }
    }
    return manifests.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch {
    return [];
  }
}
