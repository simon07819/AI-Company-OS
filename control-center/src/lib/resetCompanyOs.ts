import fs from "fs";
import path from "path";

export const RESET_CONFIRMATION = "AI_COMPANY_OS_RESET";
export const RESET_UI_CONFIRMATION = "SUPPRIMER LES DONNÉES";

type JsonValue = Record<string, unknown> | unknown[];

export interface ResetCompanyOsOptions {
  rootDir?: string;
  confirm?: string;
  allowProduction?: boolean;
  production?: boolean;
  resetGeneratedProducts?: boolean;
}

export interface ResetCompanyOsResult {
  ok: true;
  rootDir: string;
  deleted: Record<string, number>;
  emptied: Record<string, number>;
  preserved: string[];
}

const EMPTY_RUNTIME_STATE = {
  agents: [],
  queue: [],
  pausedAgents: [],
  stats: { totalEventsEmitted: 0 },
  savedAt: "",
};

const CONTROL_DATA_FILES: Record<string, JsonValue> = {
  "approvals.json": { approvals: [] },
  "ceo-chat.json": { messages: [] },
  "ceo-files.json": { files: [] },
  "ceo-memory.json": { entries: [], recentIntents: [], messageCount: 0, lastSeen: "" },
  "ceo-projects.json": { projects: [] },
  "client-crm.json": { leads: [], clients: [], opportunities: [], interactions: [] },
  "company-workspaces.json": { workspaces: [] },
  "conversations.json": { folders: [], threads: [] },
  "distribution-engine.json": { jobs: [], assets: [], campaigns: [] },
  "executive-discussions.json": { discussions: [] },
  "loop-state.json": [],
  "onboarding-state.json": { completed: false },
  "project-archive.json": { entities: [] },
  "revenue-system.json": { proposals: [], invoices: [], records: [] },
  "revisions.json": { revisions: [] },
  "visible-outputs.json": { outputs: [] },
};

const PARENT_DATA_FILES: Record<string, JsonValue> = {
  "autopilot-sessions.json": [],
  "runtime-state.json": EMPTY_RUNTIME_STATE,
};

const PRESERVED_CATEGORIES = [
  "code source",
  "routes et modules expert",
  "profils agents",
  "configuration systeme",
  "adapters et NVIDIA adapter",
  ".env.local et secrets",
  "migrations et schema",
];

function assertCanReset(options: ResetCompanyOsOptions) {
  if (options.confirm !== RESET_CONFIRMATION) {
    throw new Error(`Reset annule. Relance avec CONFIRM_RESET=${RESET_CONFIRMATION}.`);
  }
  const isProduction = options.production ?? process.env.NODE_ENV === "production";
  if (isProduction && !options.allowProduction) {
    throw new Error("Reset refuse en production. Ajoute ALLOW_PRODUCTION_RESET=true seulement si tu sais exactement ce que tu fais.");
  }
}

function readCount(filePath: string): number {
  if (!fs.existsSync(filePath)) return 0;
  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, "utf-8")) as unknown;
    if (Array.isArray(parsed)) return parsed.length;
    if (parsed && typeof parsed === "object") {
      return Object.values(parsed as Record<string, unknown>).reduce<number>((sum, value) => sum + (Array.isArray(value) ? value.length : 0), 0);
    }
  } catch {
    return 1;
  }
  return 0;
}

function writeJson(filePath: string, value: JsonValue): number {
  const count = readCount(filePath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2) + "\n", "utf-8");
  return count;
}

function removePath(targetPath: string): number {
  if (!fs.existsSync(targetPath)) return 0;
  const stat = fs.statSync(targetPath);
  if (stat.isDirectory()) {
    const count = fs.readdirSync(targetPath).length;
    fs.rmSync(targetPath, { recursive: true, force: true });
    return count;
  }
  fs.rmSync(targetPath, { force: true });
  return 1;
}

function countFilesAndDirs(targetPath: string): number {
  if (!fs.existsSync(targetPath)) return 0;
  const stat = fs.statSync(targetPath);
  if (!stat.isDirectory()) return 1;
  return fs.readdirSync(targetPath).reduce((sum, entry) => sum + countFilesAndDirs(path.join(targetPath, entry)), 0);
}

function cleanGeneratedProducts(targetPath: string): number {
  if (!fs.existsSync(targetPath)) return 0;
  const entries = fs.readdirSync(targetPath);
  let count = 0;
  for (const entry of entries) {
    if (entry === ".gitkeep") continue;
    const fullPath = path.join(targetPath, entry);
    count += countFilesAndDirs(fullPath);
    fs.rmSync(fullPath, { recursive: true, force: true });
  }
  return count;
}

function writeText(filePath: string, value: string): number {
  const count = fs.existsSync(filePath) ? 1 : 0;
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, value, "utf-8");
  return count;
}

export function getResetPlanSummary() {
  return {
    willEmpty: [
      "CEO messages, CEO memory and executive discussions",
      "companies/workspaces, CEO projects and mission sessions",
      "conversations and messages",
      "visible outputs/results and approval decisions",
      "CRM, revenue and distribution records linked to old missions",
      "runtime queues/state and mission activity logs",
      "uploaded CEO files and generated local workspaces",
      "generated-products only when RESET_GENERATED_PRODUCTS=true",
    ],
    willPreserve: PRESERVED_CATEGORIES,
  };
}

export function resetCompanyOs(options: ResetCompanyOsOptions = {}): ResetCompanyOsResult {
  assertCanReset(options);

  const rootDir = path.resolve(options.rootDir ?? process.cwd());
  const controlDataDir = path.join(rootDir, "data");
  const parentDataDir = path.resolve(rootDir, "..", "data");
  const parentLogsDir = path.resolve(rootDir, "..", "logs");

  const emptied: Record<string, number> = {};
  const deleted: Record<string, number> = {};

  for (const [file, emptyValue] of Object.entries(CONTROL_DATA_FILES)) {
    emptied[`data/${file}`] = writeJson(path.join(controlDataDir, file), emptyValue);
  }

  for (const [file, emptyValue] of Object.entries(PARENT_DATA_FILES)) {
    emptied[`../data/${file}`] = writeJson(path.join(parentDataDir, file), emptyValue);
  }

  deleted["data/uploads"] = removePath(path.join(controlDataDir, "uploads"));
  deleted["data/workspaces"] = removePath(path.join(controlDataDir, "workspaces"));
  deleted["data/invoices"] = removePath(path.join(controlDataDir, "invoices"));
  deleted["data/backups"] = removePath(path.join(controlDataDir, "backups"));
  if (options.resetGeneratedProducts) {
    deleted["generated-products"] = cleanGeneratedProducts(path.join(rootDir, "generated-products"));
  }

  emptied["../logs/agent_activity.jsonl"] = writeText(path.join(parentLogsDir, "agent_activity.jsonl"), "");
  deleted["../logs/autopilot_session.json"] = removePath(path.join(parentLogsDir, "autopilot_session.json"));

  return {
    ok: true,
    rootDir,
    deleted,
    emptied,
    preserved: PRESERVED_CATEGORIES,
  };
}
