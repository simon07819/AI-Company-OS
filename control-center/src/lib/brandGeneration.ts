export type BrandRequestType = "logo" | "branding" | "app" | "site" | "business" | "unknown";

export interface BrandPaletteColor {
  name: string;
  hex: string;
  justification: string;
}

export interface BrandBrief {
  requestType: BrandRequestType;
  brandName: string;
  explicitBrandName: boolean;
  industry: string;
  targetAudience: string;
  brandPersonality: string[];
  creativeDirection: string;
  logoPrompt: string;
  taglineOptions: string[];
  colorPalette: BrandPaletteColor[];
  typographyRecommendation: string;
  concepts: string[];
  recommendedConcept: string;
}

export interface LogoConcept {
  id: string;
  label: "A" | "B" | "C";
  title: string;
  brandName: string;
  tagline: string;
  palette: BrandPaletteColor[];
  typography: string;
  rationale: string;
  keywords: string[];
  visualStyle: "construction-tech" | "vertical-signal" | "safety-reliability";
  recommended: boolean;
  prototypeNotice: string;
}

const DEFAULT_BRAND_NAME = "Nouvelle Marque AI";

const STOP_WORDS = new Set([
  "logo", "site", "app", "application", "business", "compagnie", "company", "entreprise",
  "marque", "qui", "pour", "avec", "dans", "une", "un", "des", "les", "le", "la",
]);

function normalizeText(input: string) {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function detectBrandRequestType(input: string): BrandRequestType {
  const lower = normalizeText(input);
  if (/\blogo\b|identite visuelle|charte|branding|marque/.test(lower)) {
    return lower.includes("logo") ? "logo" : "branding";
  }
  if (/\b(app|application|mobile|ios|android)\b/.test(lower)) return "app";
  if (/site web|site internet|website|landing/.test(lower)) return "site";
  if (/business|entreprise|compagnie|startup|commerce|boutique/.test(lower)) return "business";
  return "unknown";
}

function cleanBrandCandidate(candidate: string) {
  const cleaned = candidate
    .replace(/[“”"'.:,;!?()[\]{}]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const words = cleaned.split(" ").filter(Boolean);
  const kept: string[] = [];
  for (const word of words.slice(0, 4)) {
    if (STOP_WORDS.has(normalizeText(word))) break;
    kept.push(word);
  }
  return kept.join(" ").trim();
}

export function extractBrandName(input: string): { brandName: string; explicit: boolean } {
  const patterns = [
    /(?:s['’]?\s*appelle|se\s+nomme|nommee?|appelee?)\s+([A-Za-z0-9À-ÿ][A-Za-z0-9À-ÿ&\- ]{1,48})/i,
    /(?:pour|de|d['’])\s+([A-Z0-9][A-Z0-9&\- ]{2,32})(?:\s|$|[.,;!?])/,
    /(?:marque|compagnie|entreprise)\s+([A-Z0-9][A-Z0-9&\- ]{2,32})(?:\s|$|[.,;!?])/,
  ];

  for (const pattern of patterns) {
    const match = input.match(pattern);
    const candidate = match?.[1] ? cleanBrandCandidate(match[1]) : "";
    if (candidate) return { brandName: candidate, explicit: true };
  }

  return { brandName: DEFAULT_BRAND_NAME, explicit: false };
}

export function inferIndustry(input: string, brandName = "") {
  const lower = normalizeText(`${input} ${brandName}`);
  if (/elevio|elevateur|elevator|ascenseur|monte[- ]?charge|hoist|lift|vertical/.test(lower)) {
    return "construction verticale / élévateurs";
  }
  if (/construction|chantier|contracteur|batiment|renovation/.test(lower)) return "construction";
  if (/photo|photographie|photographe|camera|studio/.test(lower)) return "photographie";
  if (/restaurant|cafe|bistro|food|traiteur/.test(lower)) return "restauration";
  if (/vetement|vêtements|mode|fashion|apparel/.test(lower)) return "mode";
  if (/immobilier|real estate|courtier|propriete/.test(lower)) return "immobilier";
  if (/marketing|agence|pub|publicite|growth/.test(lower)) return "marketing";
  if (/saas|logiciel|software|tech|application/.test(lower)) return "technologie";
  return "service professionnel";
}

function briefForIndustry(industry: string, brandName: string) {
  if (/elevateur|élévateur|verticale|construction/.test(industry)) {
    return {
      targetAudience: "promoteurs, gestionnaires d'immeubles, entrepreneurs et propriétaires qui veulent un partenaire fiable.",
      brandPersonality: ["fiable", "précis", "premium", "sécuritaire"],
      creativeDirection: "une identité construction tech, verticale et rassurante, avec un signal de mouvement ascendant.",
      logoPrompt: `Logo premium pour ${brandName}, entreprise d'élévateurs et construction verticale: symbole ascendant, lignes structurées, sentiment de sécurité, lisible sur camion, uniforme et site web.`,
      taglineOptions: ["Montez plus haut.", "Vertical. Fiable. Précis.", "La confiance en mouvement."],
      colorPalette: [
        { name: "Graphite structurel", hex: "#17202A", justification: "donne une base technique, solide et premium." },
        { name: "Bleu signal", hex: "#2563EB", justification: "évoque technologie, précision et mouvement." },
        { name: "Vert sécurité", hex: "#2F8F61", justification: "renforce confiance, conformité et fiabilité." },
        { name: "Ivoire chantier", hex: "#F5F0E7", justification: "adoucit la marque et améliore la lisibilité." },
      ],
      typographyRecommendation: "Manrope SemiBold pour le logo, Inter pour les supports: moderne, robuste et très lisible.",
    };
  }

  if (/photo|photographie/.test(industry)) {
    return {
      targetAudience: "clients particuliers, marques locales et créateurs qui veulent une image soignée.",
      brandPersonality: ["lumineux", "élégant", "moderne", "humain"],
      creativeDirection: "une identité lumineuse et éditoriale, centrée sur la capture d'émotion.",
      logoPrompt: `Logo moderne pour ${brandName}, marque de photographie: symbole d'ouverture, lumière, cadrage, rendu premium et chaleureux.`,
      taglineOptions: ["Capture the light.", "Vos moments, mieux racontés.", "Images claires. Souvenirs durables."],
      colorPalette: [
        { name: "Graphite doux", hex: "#1E293B", justification: "base élégante pour les supports photo." },
        { name: "Bleu lumière", hex: "#6AA8FF", justification: "apporte clarté et modernité." },
        { name: "Ivoire studio", hex: "#F7F3EA", justification: "rappelle papier, tirage et chaleur humaine." },
        { name: "Ambre objectif", hex: "#D99A3E", justification: "évoque la lumière dorée et les détails premium." },
      ],
      typographyRecommendation: "Inter Tight SemiBold pour le nom, Source Serif pour certains accents éditoriaux.",
    };
  }

  return {
    targetAudience: "clients professionnels qui veulent un service clair, crédible et moderne.",
    brandPersonality: ["clair", "professionnel", "moderne", "fiable"],
    creativeDirection: "une identité sobre, mémorable et facile à décliner.",
    logoPrompt: `Logo professionnel pour ${brandName}: symbole simple, géométrie nette, rendu premium, facile à utiliser sur web et documents.`,
    taglineOptions: ["Simple. Clair. Fiable.", "Votre marque, mieux structurée.", "Une présence plus professionnelle."],
    colorPalette: [
      { name: "Graphite", hex: "#1F2937", justification: "apporte crédibilité et stabilité." },
      { name: "Bleu profond", hex: "#2F6FED", justification: "donne un signal moderne et digital." },
      { name: "Vert doux", hex: "#4A9D6F", justification: "évoque progression et confiance." },
      { name: "Ivoire", hex: "#F5F0E7", justification: "garde le rendu accessible et premium." },
    ],
    typographyRecommendation: "Inter SemiBold pour le logo et Inter Regular pour les supports.",
  };
}

export function generateBrandBrief(input: string): BrandBrief {
  const requestType = detectBrandRequestType(input);
  const extracted = extractBrandName(input);
  const industry = inferIndustry(input, extracted.brandName);
  const profile = briefForIndustry(industry, extracted.brandName);
  const concepts = [
    "A. Premium construction tech",
    "B. Fast vertical movement / elevator signal",
    "C. Safety + reliability",
  ];

  return {
    requestType,
    brandName: extracted.brandName,
    explicitBrandName: extracted.explicit,
    industry,
    targetAudience: profile.targetAudience,
    brandPersonality: profile.brandPersonality,
    creativeDirection: profile.creativeDirection,
    logoPrompt: profile.logoPrompt,
    taglineOptions: profile.taglineOptions,
    colorPalette: profile.colorPalette,
    typographyRecommendation: profile.typographyRecommendation,
    concepts,
    recommendedConcept: "A. Premium construction tech",
  };
}

export function generateLogoConcepts(brief: BrandBrief): LogoConcept[] {
  const [primary, signal, trust, neutral] = brief.colorPalette;
  const palette = [primary, signal, trust, neutral].filter(Boolean);
  return [
    {
      id: "premium-construction-tech",
      label: "A",
      title: "Premium construction tech",
      brandName: brief.brandName,
      tagline: brief.taglineOptions[1] ?? "Vertical. Fiable. Précis.",
      palette,
      typography: brief.typographyRecommendation,
      rationale: "La marque paraît haut de gamme, structurée et prête pour des clients commerciaux sérieux.",
      keywords: ["premium", "structure", "tech"],
      visualStyle: "construction-tech",
      recommended: true,
      prototypeNotice: "Concept visuel généré en prototype",
    },
    {
      id: "vertical-movement-signal",
      label: "B",
      title: "Fast vertical movement / elevator signal",
      brandName: brief.brandName,
      tagline: brief.taglineOptions[0] ?? "Montez plus haut.",
      palette: [signal, primary, neutral, trust].filter(Boolean),
      typography: brief.typographyRecommendation,
      rationale: "Le symbole met l'accent sur le mouvement rapide, l'élévation et la lisibilité en signalétique.",
      keywords: ["vertical", "rapide", "signal"],
      visualStyle: "vertical-signal",
      recommended: false,
      prototypeNotice: "Concept visuel généré en prototype",
    },
    {
      id: "safety-reliability",
      label: "C",
      title: "Safety + reliability",
      brandName: brief.brandName,
      tagline: brief.taglineOptions[2] ?? "La confiance en mouvement.",
      palette: [trust, primary, neutral, signal].filter(Boolean),
      typography: brief.typographyRecommendation,
      rationale: "La direction rassure immédiatement: sécurité, maintenance, conformité et relation de confiance.",
      keywords: ["sécurité", "fiabilité", "confiance"],
      visualStyle: "safety-reliability",
      recommended: false,
      prototypeNotice: "Concept visuel généré en prototype",
    },
  ];
}

export function generateLogoImagePrompt(concept: LogoConcept): string {
  const colors = concept.palette.map((color) => `${color.name} ${color.hex}`).join(", ");
  return [
    `Create a premium logo concept for ${concept.brandName}.`,
    `Direction: ${concept.title}.`,
    `Style: ${concept.keywords.join(", ")}.`,
    `Use palette: ${colors}.`,
    `Typography: ${concept.typography}.`,
    `Make it suitable for web, vehicles, uniforms, signage and proposal documents.`,
    "No mockup scene, no stock photo, clean vector-like brand presentation.",
  ].join(" ");
}
