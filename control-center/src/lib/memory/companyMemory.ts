import { readRuntimeJson, writeRuntimeJson } from "@/lib/runtime/runtimeFileStore";

export type CompanyMemoryAction =
  | "retain_direction"
  | "reject_direction"
  | "avoid_style"
  | "use_style_for_project";

export interface CompanyMemoryEntry {
  id: string;
  companyId: string;
  missionId: string;
  missionType: string;
  userPreferences: string[];
  acceptedDecisions: string[];
  visualStylePreferred: string[];
  visualStyleRejected: string[];
  repeatedCritiques: string[];
  retainedBranding: string[];
  effectivePrompts: string[];
  acceptedArtifacts: string[];
  rejectedArtifacts: string[];
  reviewerNotes: string[];
  source: "mission_runtime" | "user_action";
  createdAt: string;
  updatedAt: string;
}

export interface CompanyMemoryContext {
  companyId: string;
  loadedAt: string;
  entries: CompanyMemoryEntry[];
  preferences: string[];
  avoidStyles: string[];
  retainedBranding: string[];
  effectivePrompts: string[];
  reviewerNotes: string[];
  summary: string;
}

const MEMORY_FILE = "company-memory.json";
const DEFAULT_COMPANY_ID = "default-company";
const SECRET_PATTERN = /(?:NVIDIA|OPENAI|SUPABASE)?_?API_KEY|SERVICE_ROLE|PRIVATE_KEY|BEGIN [A-Z ]*PRIVATE KEY|password|secret|token|nvapi-[A-Za-z0-9._-]+/i;

function now() {
  return new Date().toISOString();
}

function id(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function safeText(value: unknown, fallback = "") {
  if (typeof value !== "string") return fallback;
  const text = value.trim().slice(0, 500);
  if (!text || SECRET_PATTERN.test(text)) return fallback;
  return text;
}

function uniq(values: string[]) {
  return Array.from(new Set(values.map((item) => item.trim()).filter(Boolean))).slice(0, 40);
}

function allEntries() {
  return readRuntimeJson<CompanyMemoryEntry[]>(MEMORY_FILE, []);
}

function writeEntries(entries: CompanyMemoryEntry[]) {
  writeRuntimeJson(MEMORY_FILE, entries.slice(0, 1000));
}

export function defaultCompanyId() {
  return process.env.AI_COMPANY_DEFAULT_COMPANY_ID?.trim() || DEFAULT_COMPANY_ID;
}

export function listCompanyMemory(companyId = defaultCompanyId()) {
  return allEntries().filter((entry) => entry.companyId === companyId);
}

export function buildCompanyMemoryContext(input: {
  companyId?: string;
  missionType?: string;
  command?: string;
  limit?: number;
} = {}): CompanyMemoryContext {
  const companyId = input.companyId ?? defaultCompanyId();
  const lower = (input.command ?? "").toLowerCase();
  const entries = listCompanyMemory(companyId)
    .filter((entry) => !input.missionType || entry.missionType === input.missionType || lower.includes(entry.missionType))
    .slice(0, input.limit ?? 12);
  const preferences = uniq(entries.flatMap((entry) => entry.userPreferences));
  const avoidStyles = uniq(entries.flatMap((entry) => entry.visualStyleRejected));
  const retainedBranding = uniq(entries.flatMap((entry) => entry.retainedBranding));
  const effectivePrompts = uniq(entries.flatMap((entry) => entry.effectivePrompts));
  const reviewerNotes = uniq(entries.flatMap((entry) => entry.reviewerNotes));
  const summary = [
    preferences.length ? `Préférences: ${preferences.join("; ")}` : "",
    avoidStyles.length ? `À éviter: ${avoidStyles.join("; ")}` : "",
    retainedBranding.length ? `Branding retenu: ${retainedBranding.join("; ")}` : "",
    effectivePrompts.length ? `Prompts efficaces: ${effectivePrompts.slice(0, 5).join("; ")}` : "",
    reviewerNotes.length ? `Notes reviewer: ${reviewerNotes.slice(0, 5).join("; ")}` : "",
  ].filter(Boolean).join("\n");
  return {
    companyId,
    loadedAt: now(),
    entries,
    preferences,
    avoidStyles,
    retainedBranding,
    effectivePrompts,
    reviewerNotes,
    summary,
  };
}

export function recordCompanyMemory(input: Omit<CompanyMemoryEntry, "id" | "createdAt" | "updatedAt"> & { id?: string }) {
  const timestamp = now();
  const entry: CompanyMemoryEntry = {
    id: input.id ?? id("company-memory"),
    companyId: input.companyId,
    missionId: input.missionId,
    missionType: input.missionType,
    userPreferences: uniq(input.userPreferences.map((item) => safeText(item)).filter(Boolean)),
    acceptedDecisions: uniq(input.acceptedDecisions.map((item) => safeText(item)).filter(Boolean)),
    visualStylePreferred: uniq(input.visualStylePreferred.map((item) => safeText(item)).filter(Boolean)),
    visualStyleRejected: uniq(input.visualStyleRejected.map((item) => safeText(item)).filter(Boolean)),
    repeatedCritiques: uniq(input.repeatedCritiques.map((item) => safeText(item)).filter(Boolean)),
    retainedBranding: uniq(input.retainedBranding.map((item) => safeText(item)).filter(Boolean)),
    effectivePrompts: uniq(input.effectivePrompts.map((item) => safeText(item)).filter(Boolean)),
    acceptedArtifacts: uniq(input.acceptedArtifacts.map((item) => safeText(item)).filter(Boolean)),
    rejectedArtifacts: uniq(input.rejectedArtifacts.map((item) => safeText(item)).filter(Boolean)),
    reviewerNotes: uniq(input.reviewerNotes.map((item) => safeText(item)).filter(Boolean)),
    source: input.source,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  if (SECRET_PATTERN.test(JSON.stringify(entry))) throw new Error("Company memory rejected unsafe content.");
  const existing = allEntries().filter((item) => item.id !== entry.id);
  writeEntries([entry, ...existing]);
  return entry;
}

export function recordUserMemoryAction(input: {
  action: CompanyMemoryAction;
  companyId?: string;
  missionId: string;
  missionType: string;
  text?: string;
  artifactId?: string | null;
  brandName?: string | null;
}) {
  const text = safeText(input.text) || safeText(input.brandName) || input.action;
  const base = {
    companyId: input.companyId ?? defaultCompanyId(),
    missionId: input.missionId,
    missionType: input.missionType,
    userPreferences: [] as string[],
    acceptedDecisions: [] as string[],
    visualStylePreferred: [] as string[],
    visualStyleRejected: [] as string[],
    repeatedCritiques: [] as string[],
    retainedBranding: [] as string[],
    effectivePrompts: [] as string[],
    acceptedArtifacts: [] as string[],
    rejectedArtifacts: [] as string[],
    reviewerNotes: [] as string[],
    source: "user_action" as const,
  };
  if (input.action === "retain_direction") {
    base.acceptedDecisions = [text];
    base.retainedBranding = [text];
    if (input.artifactId) base.acceptedArtifacts = [input.artifactId];
  }
  if (input.action === "reject_direction") {
    base.rejectedArtifacts = input.artifactId ? [input.artifactId] : [];
    base.repeatedCritiques = [text];
  }
  if (input.action === "avoid_style") base.visualStyleRejected = [text];
  if (input.action === "use_style_for_project") {
    base.userPreferences = [text];
    base.visualStylePreferred = [text];
  }
  return recordCompanyMemory(base);
}

export function inferPreferencesFromCommand(command: string) {
  const lower = command.toLowerCase();
  const preferences: string[] = [];
  const rejected: string[] = [];
  if (/noir|black|chatgpt/.test(lower)) preferences.push("style noir ChatGPT");
  if (/pas bleu|no blue|evite le bleu|évite le bleu/.test(lower)) rejected.push("bleu");
  if (/minimal|simple/.test(lower)) preferences.push("minimal et simple");
  return { preferences, rejected };
}
