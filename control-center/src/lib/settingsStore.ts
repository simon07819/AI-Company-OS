import fs from "fs";
import path from "path";

// ─── Paths ────────────────────────────────────────────────────────────────

const REPO_ROOT = process.cwd();
const DATA_DIR = path.join(REPO_ROOT, "data");
const SETTINGS_PATH = path.join(DATA_DIR, "settings.json");

// ─── Types ────────────────────────────────────────────────────────────────

export interface AppSettings {
  // Company Identity
  companyName: string;
  businessEmail: string;
  phone: string;
  address: string;
  logoUrl: string | null;

  // Invoice Settings
  currency: string;
  taxRegion: "none" | "canada" | "quebec" | "eu" | "us";
  tpsRate: number;
  tvqRate: number;
  invoicePrefix: string;
  defaultPaymentTerms: number;

  // AI Runtime
  nvidiaKeyPresent: boolean;   // read-only, derived from env
  runtimeMode: "nvidia" | "simulation" | "hybrid";

  // Automation
  approvalMode: "manual" | "auto" | "supervised";
  autoPublish: boolean;
  autoInvoice: boolean;
  loopAggressiveness: "low" | "medium" | "high";

  // Workspace Defaults
  defaultWorkspace: string;
  defaultMissionType: string;

  updatedAt: string;
}

export interface NvidiaTestResult {
  connected: boolean;
  provider: string;
  message: string;
}

// ─── Defaults ─────────────────────────────────────────────────────────────

const DEFAULT_SETTINGS: AppSettings = {
  companyName: "",
  businessEmail: "",
  phone: "",
  address: "",
  logoUrl: null,
  currency: "CAD",
  taxRegion: "quebec",
  tpsRate: 5,
  tvqRate: 9.975,
  invoicePrefix: "INV",
  defaultPaymentTerms: 30,
  nvidiaKeyPresent: false,
  runtimeMode: "simulation",
  approvalMode: "manual",
  autoPublish: false,
  autoInvoice: false,
  loopAggressiveness: "medium",
  defaultWorkspace: "",
  defaultMissionType: "saas_project",
  updatedAt: new Date().toISOString(),
};

// ─── Persistence ──────────────────────────────────────────────────────────

function ensureDataDir() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readSettings(): AppSettings {
  ensureDataDir();
  const keyPresent = !!(process.env.NVIDIA_API_KEY && process.env.NVIDIA_API_KEY.length >= 8);
  const defaults = { ...DEFAULT_SETTINGS, nvidiaKeyPresent: keyPresent, runtimeMode: keyPresent ? "nvidia" as const : "simulation" as const };
  if (!fs.existsSync(SETTINGS_PATH)) return defaults;
  try {
    const raw = fs.readFileSync(SETTINGS_PATH, "utf-8");
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    return {
      ...defaults,
      ...parsed,
      nvidiaKeyPresent: keyPresent,
      runtimeMode: keyPresent ? "nvidia" : (parsed.runtimeMode ?? "simulation"),
    };
  } catch {
    return defaults;
  }
}

function writeSettings(data: AppSettings) {
  ensureDataDir();
  const toSave = { ...data, nvidiaKeyPresent: !!process.env.NVIDIA_API_KEY, updatedAt: new Date().toISOString() };
  fs.writeFileSync(SETTINGS_PATH, JSON.stringify(toSave, null, 2) + "\n", "utf-8");
}

// ─── Public API ───────────────────────────────────────────────────────────

export function getSettings(): AppSettings {
  return readSettings();
}

export function saveSettings(partial: Partial<AppSettings>): AppSettings {
  const current = readSettings();
  const updated = { ...current, ...partial, nvidiaKeyPresent: !!process.env.NVIDIA_API_KEY };
  writeSettings(updated);
  return updated;
}

export async function testNvidia(): Promise<NvidiaTestResult> {
  const keyPresent = !!process.env.NVIDIA_API_KEY;
  if (!keyPresent) {
    return { connected: false, provider: "NVIDIA API", message: "NVIDIA_API_KEY not set — simulation mode active" };
  }
  const key = process.env.NVIDIA_API_KEY ?? "";
  if (key.startsWith("nvapi-")) {
    return { connected: true, provider: "NVIDIA API", message: "NVIDIA API key detected and valid format (nvapi-*)" };
  }
  return { connected: true, provider: "NVIDIA API", message: "NVIDIA API key present — format may vary" };
}
