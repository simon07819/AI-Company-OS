import { readRuntimeJson, writeRuntimeJson } from "@/lib/runtime/runtimeFileStore";

const BRAND_FILE = "brand.json";

export interface BrandMemory {
  name: string | null;
  industry: string | null;
  colors: string[];
  tagline: string | null;
  typography: { heading: string | null; body: string | null };
  tone: string | null;
  styleKeywords: string[];
  rejectedStyles: string[];
  lastUpdated: string;
}

const DEFAULT_BRAND: BrandMemory = {
  name: null,
  industry: null,
  colors: [],
  tagline: null,
  typography: { heading: null, body: null },
  tone: null,
  styleKeywords: [],
  rejectedStyles: [],
  lastUpdated: new Date().toISOString(),
};

export function readBrandMemory(): BrandMemory {
  return readRuntimeJson<BrandMemory>(BRAND_FILE, DEFAULT_BRAND);
}

export function writeBrandMemory(patch: Partial<BrandMemory>): BrandMemory {
  const current = readBrandMemory();
  const updated: BrandMemory = {
    ...current,
    ...patch,
    styleKeywords: Array.from(new Set([...(current.styleKeywords), ...(patch.styleKeywords ?? [])])),
    rejectedStyles: Array.from(new Set([...(current.rejectedStyles), ...(patch.rejectedStyles ?? [])])),
    lastUpdated: new Date().toISOString(),
  };
  writeRuntimeJson(BRAND_FILE, updated);
  return updated;
}

export function brandSummary(): string {
  const b = readBrandMemory();
  const parts: string[] = [];
  if (b.name) parts.push(`Marque: ${b.name}`);
  if (b.industry) parts.push(`Secteur: ${b.industry}`);
  if (b.tagline) parts.push(`Tagline: ${b.tagline}`);
  if (b.tone) parts.push(`Ton: ${b.tone}`);
  if (b.styleKeywords.length) parts.push(`Style retenu: ${b.styleKeywords.slice(0, 5).join(", ")}`);
  if (b.rejectedStyles.length) parts.push(`Styles refusés: ${b.rejectedStyles.slice(0, 3).join(", ")}`);
  return parts.join(" · ");
}
