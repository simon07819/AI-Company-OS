import { readRuntimeJson, writeRuntimeJson } from "@/lib/runtime/runtimeFileStore";

export interface ProjectBrand {
  projectId: string;
  name: string;
  colors: { primary: string; secondary: string; accent: string };
  typography: { heading: string; body: string };
  tone: string[];
  logoPath: string;
  logoArtifactId: string | null;
  logoContent: string | null;
  targetAudience: string;
  positioning: string;
  approvedAt: string | null;
  savedAt: string;
}

const BRANDS_FILE = "project-brands.json";

type BrandsStore = Record<string, ProjectBrand>;

function readStore(): BrandsStore {
  return readRuntimeJson<BrandsStore>(BRANDS_FILE, {});
}

function writeStore(store: BrandsStore) {
  writeRuntimeJson(BRANDS_FILE, store);
}

export function saveProjectBrand(projectId: string, data: Partial<ProjectBrand>): ProjectBrand {
  const store = readStore();
  const existing = store[projectId];
  const brand: ProjectBrand = {
    projectId,
    name: data.name ?? existing?.name ?? "",
    colors: data.colors ?? existing?.colors ?? { primary: "#000000", secondary: "#ffffff", accent: "#4f8ef7" },
    typography: data.typography ?? existing?.typography ?? { heading: "sans-serif", body: "sans-serif" },
    tone: data.tone ?? existing?.tone ?? [],
    logoPath: data.logoPath ?? existing?.logoPath ?? "",
    logoArtifactId: data.logoArtifactId ?? existing?.logoArtifactId ?? null,
    logoContent: data.logoContent ?? existing?.logoContent ?? null,
    targetAudience: data.targetAudience ?? existing?.targetAudience ?? "",
    positioning: data.positioning ?? existing?.positioning ?? "",
    approvedAt: data.approvedAt ?? existing?.approvedAt ?? null,
    savedAt: new Date().toISOString(),
  };
  store[projectId] = brand;
  writeStore(store);
  return brand;
}

export function readProjectBrand(projectId: string): ProjectBrand | null {
  const store = readStore();
  return store[projectId] ?? null;
}

export function approveBrand(projectId: string): ProjectBrand | null {
  const store = readStore();
  const brand = store[projectId];
  if (!brand) return null;
  brand.approvedAt = new Date().toISOString();
  store[projectId] = brand;
  writeStore(store);
  return brand;
}

export function listProjectBrands(): ProjectBrand[] {
  return Object.values(readStore());
}

/** Extract hex colors from SVG/HTML content */
export function extractColors(content: string): { primary: string; secondary: string; accent: string } {
  const hexes = Array.from(new Set((content.match(/#[0-9a-fA-F]{6}/g) ?? []).map((c) => c.toLowerCase())));
  // Filter out pure black/white
  const filtered = hexes.filter((c) => c !== "#000000" && c !== "#ffffff" && c !== "#fff" && c !== "#000");
  return {
    primary: filtered[0] ?? "#000000",
    secondary: filtered[1] ?? "#ffffff",
    accent: filtered[2] ?? "#4f8ef7",
  };
}

/** Extract font families from SVG/HTML content */
export function extractTypography(content: string): { heading: string; body: string } {
  const fonts = content.match(/font-family:\s*['"]?([^;'"]+)/gi) ?? [];
  const families = fonts.map((f) => f.replace(/font-family:\s*['"]?/i, "").trim().replace(/['";]/g, "")).filter(Boolean);
  return {
    heading: families[0] ?? "sans-serif",
    body: families[1] ?? families[0] ?? "sans-serif",
  };
}

/** Format brand as LLM context block */
export function projectBrandContextBlock(brand: ProjectBrand): string {
  const lines: string[] = [`=== MARQUE APPROUVÉE: ${brand.name} ===`];
  if (brand.colors.primary !== "#000000") lines.push(`Couleurs: principale ${brand.colors.primary}, secondaire ${brand.colors.secondary}, accent ${brand.colors.accent}`);
  if (brand.typography.heading !== "sans-serif") lines.push(`Typographie: titres ${brand.typography.heading}, corps ${brand.typography.body}`);
  if (brand.tone.length) lines.push(`Ton: ${brand.tone.join(", ")}`);
  if (brand.targetAudience) lines.push(`Cible: ${brand.targetAudience}`);
  if (brand.positioning) lines.push(`Positionnement: ${brand.positioning}`);
  if (brand.logoContent) {
    const isSvg = /<svg[\s>]/i.test(brand.logoContent);
    if (isSvg) lines.push(`Logo SVG (intégrer inline):\n${brand.logoContent.slice(0, 1500)}`);
  }
  lines.push(`RÈGLE: Utilise TOUJOURS le nom "${brand.name}". Jamais de placeholder "ME" ou "LOGO".`);
  lines.push("=== FIN MARQUE ===");
  return lines.join("\n");
}
