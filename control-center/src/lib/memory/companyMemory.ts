import { readRuntimeJson, writeRuntimeJson } from "@/lib/runtime/runtimeFileStore";
import { listTraceableArtifacts } from "@/lib/providers/providerRegistry";
import { brandSummary } from "@/lib/brand/brandMemory";

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
  acceptedArtifacts: string[];
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

function clip(value: string, max = 220) {
  return value.length > max ? `${value.slice(0, max).trim()}...` : value;
}

function summaryItems(values: string[], maxItems = 3, maxChars = 220) {
  return values.slice(0, maxItems).map((value) => clip(value, maxChars));
}

function uniq(values: string[]) {
  return Array.from(new Set(values.map((item) => item.trim()).filter(Boolean))).slice(0, 40);
}

function allEntries() {
  return readRuntimeJson<CompanyMemoryEntry[]>(MEMORY_FILE, []);
}

function missionTypeMatches(entryType: string, requestedType?: string, command = "") {
  if (!requestedType) return true;
  if (entryType === requestedType) return true;
  const lower = command.toLowerCase();
  if (lower.includes(entryType)) return true;
  const visualTypes = new Set(["graphic", "graphic_image", "logo", "branding", "branding_pack", "image"]);
  if (visualTypes.has(requestedType) && visualTypes.has(entryType)) return true;
  return false;
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
    .filter((entry) => missionTypeMatches(entry.missionType, input.missionType, lower))
    .slice(0, input.limit ?? 12);
  const preferences = uniq(entries.flatMap((entry) => entry.userPreferences));
  const avoidStyles = uniq(entries.flatMap((entry) => entry.visualStyleRejected));
  const retainedBranding = uniq(entries.flatMap((entry) => entry.retainedBranding));
  const effectivePrompts = uniq(entries.flatMap((entry) => entry.effectivePrompts));
  const acceptedArtifacts = uniq(entries.flatMap((entry) => entry.acceptedArtifacts));
  const reviewerNotes = uniq(entries.flatMap((entry) => entry.reviewerNotes));
  const artifactContext = acceptedArtifacts
    .map((artifactId) => listTraceableArtifacts().find((artifact) => artifact.artifactId === artifactId))
    .filter(Boolean)
    .map((artifact) => {
      const metadata = artifact?.metadata as { styleReference?: string } | undefined;
      return [
        artifact?.title,
        artifact?.promptUsed ? `prompt=${clip(artifact.promptUsed, 220)}` : "",
        metadata?.styleReference ? `style=${clip(metadata.styleReference, 180)}` : "",
      ].filter(Boolean).join(" ");
    });
  const brand = brandSummary();
  const summary = [
    brand ? `MÉMOIRE MARQUE: ${brand}` : "",
    preferences.length ? `Préférences: ${summaryItems(preferences).join("; ")}` : "",
    avoidStyles.length ? `À éviter: ${summaryItems(avoidStyles).join("; ")}` : "",
    retainedBranding.length ? `Branding retenu: ${summaryItems(retainedBranding).join("; ")}` : "",
    effectivePrompts.length ? `Prompts efficaces: ${summaryItems(effectivePrompts).join("; ")}` : "",
    acceptedArtifacts.length ? `Artifacts acceptés: ${acceptedArtifacts.slice(0, 5).join("; ")}` : "",
    artifactContext.length ? `Références visuelles approuvées: ${artifactContext.slice(0, 3).join(" | ")}` : "",
    reviewerNotes.length ? `Notes reviewer: ${summaryItems(reviewerNotes).join("; ")}` : "",
  ].filter(Boolean).join("\n");
  return {
    companyId,
    loadedAt: now(),
    entries,
    preferences,
    avoidStyles,
    retainedBranding,
    effectivePrompts,
    acceptedArtifacts,
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
  const artifact = input.artifactId ? listTraceableArtifacts().find((item) => item.artifactId === input.artifactId) : undefined;
  const artifactPrompt = safeText(artifact?.promptUsed ?? "", "");
  const metadata = artifact?.metadata as {
    styleReference?: string;
    selectedDirection?: string;
    creativeAgency?: {
      recommendedDirection?: { directionName?: string; creativeRationale?: string };
      finalCEOCard?: { chosenDirection?: string; whyItWorks?: string };
    };
  } | undefined;
  const creativeDirection = [
    metadata?.selectedDirection,
    metadata?.creativeAgency?.finalCEOCard?.chosenDirection,
    metadata?.creativeAgency?.finalCEOCard?.whyItWorks,
    metadata?.creativeAgency?.recommendedDirection?.creativeRationale,
  ].filter(Boolean).join(" | ");
  const artifactStyle = safeText(creativeDirection || metadata?.styleReference || "", "");
  const artifactDecision = safeText([
    input.brandName ? `Marque: ${input.brandName}` : "",
    text,
    artifactStyle ? `Style: ${artifactStyle}` : "",
    artifactPrompt ? `Prompt efficace: ${artifactPrompt}` : "",
  ].filter(Boolean).join(" | "), text);
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
    base.acceptedDecisions = [artifactDecision];
    base.retainedBranding = [artifactDecision];
    base.visualStylePreferred = [artifactStyle || artifactDecision];
    if (artifactPrompt) base.effectivePrompts = [artifactPrompt];
    if (input.artifactId) base.acceptedArtifacts = [input.artifactId];
    // Persist to brand.json
    if (input.brandName) {
      const { writeBrandMemory } = require("@/lib/brand/brandMemory") as typeof import("@/lib/brand/brandMemory");
      writeBrandMemory({ name: input.brandName, styleKeywords: artifactStyle ? [artifactStyle] : [] });
    }
  }
  if (input.action === "reject_direction") {
    base.rejectedArtifacts = input.artifactId ? [input.artifactId] : [];
    base.repeatedCritiques = [text];
    if (input.brandName) {
      const { writeBrandMemory } = require("@/lib/brand/brandMemory") as typeof import("@/lib/brand/brandMemory");
      writeBrandMemory({ rejectedStyles: [text] });
    }
  }
  if (input.action === "avoid_style") {
    base.visualStyleRejected = [text];
    const { writeBrandMemory } = require("@/lib/brand/brandMemory") as typeof import("@/lib/brand/brandMemory");
    writeBrandMemory({ rejectedStyles: [text] });
  }
  if (input.action === "use_style_for_project") {
    base.userPreferences = [artifactDecision];
    base.visualStylePreferred = [artifactStyle || artifactDecision];
    if (artifactPrompt) base.effectivePrompts = [artifactPrompt];
    if (input.artifactId) base.acceptedArtifacts = [input.artifactId];
    if (input.brandName) {
      const { writeBrandMemory } = require("@/lib/brand/brandMemory") as typeof import("@/lib/brand/brandMemory");
      writeBrandMemory({ name: input.brandName, styleKeywords: artifactStyle ? [artifactStyle] : [] });
    }
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
