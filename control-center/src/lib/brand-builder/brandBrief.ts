import type { BrandBrief, BrandPaletteColor, BrandRequestType } from "./brandSchemas";

const UNNAMED_BRAND = "Marque à nommer";

const STOP_WORDS = new Set([
  "logo", "site", "app", "application", "business", "compagnie", "company", "entreprise",
  "marque", "qui", "pour", "avec", "dans", "une", "un", "des", "les", "le", "la",
  "called", "named", "nommee", "nomme", "appelee", "appelle",
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
    /(?:s['’]?\s*appelle|se\s+nomme|nommee?|nommée?|appelee?|appelée?|called|named)\s+([A-Za-z0-9À-ÿ][A-Za-z0-9À-ÿ&\- ]{1,48})/i,
    /(?:pour|de|d['’])\s+([A-Z0-9][A-Z0-9&\- ]{2,32})(?:\s|$|[.,;!?])/,
    /(?:marque|compagnie|entreprise)\s+([A-Z0-9][A-Z0-9&\- ]{2,32})(?:\s|$|[.,;!?])/,
  ];

  for (const pattern of patterns) {
    const match = input.match(pattern);
    const candidate = match?.[1] ? cleanBrandCandidate(match[1]) : "";
    if (candidate) return { brandName: candidate, explicit: true };
  }

  return { brandName: UNNAMED_BRAND, explicit: false };
}

export function inferIndustry(input: string, brandName = "") {
  const lower = normalizeText(`${input} ${brandName}`);
  if (/elevateur|elevator|ascenseur|monte[- ]?charge|hoist|lift|vertical/.test(lower)) {
    return {
      industry: "construction verticale / élévateurs",
      confidence: "explicit" as const,
      assumption: "Le message contient un indice direct lié aux élévateurs, ascenseurs ou au mouvement vertical.",
    };
  }
  if (/elevio|elevat|elevat(e|ion)|elev/.test(lower)) {
    return {
      industry: "construction verticale / élévateurs",
      confidence: "weak" as const,
      assumption: "Hypothèse faible: le nom évoque elevation, donc la direction explore le mouvement vertical sans prétendre que le secteur est confirmé.",
    };
  }
  if (/construction|chantier|contracteur|batiment|bâtiment|renovation/.test(lower)) {
    return { industry: "construction", confidence: "explicit" as const, assumption: "Le secteur construction est mentionné dans la demande." };
  }
  if (/photo|photographie|photographe|camera|studio/.test(lower)) {
    return { industry: "photographie", confidence: "explicit" as const, assumption: "La demande mentionne la photo ou un studio." };
  }
  if (/restaurant|cafe|bistro|food|traiteur/.test(lower)) return { industry: "restauration", confidence: "explicit" as const, assumption: "Le secteur restauration est mentionné." };
  if (/vetement|vêtements|mode|fashion|apparel/.test(lower)) return { industry: "mode", confidence: "explicit" as const, assumption: "Le secteur mode/vêtements est mentionné." };
  if (/immobilier|real estate|courtier|propriete|propriété/.test(lower)) return { industry: "immobilier", confidence: "explicit" as const, assumption: "Le secteur immobilier est mentionné." };
  if (/marketing|agence|pub|publicite|publicité|growth/.test(lower)) return { industry: "marketing", confidence: "explicit" as const, assumption: "Le secteur marketing est mentionné." };
  if (/saas|logiciel|software|tech|application/.test(lower)) return { industry: "technologie", confidence: "explicit" as const, assumption: "La demande mentionne un produit logiciel ou technologique." };
  return {
    industry: "service professionnel",
    confidence: "weak" as const,
    assumption: "Secteur non précisé: direction volontairement générale, à confirmer avant génération finale.",
  };
}

function elevatorPalette(): BrandPaletteColor[] {
  return [
    { name: "Graphite infrastructure", hex: "#17202A", justification: "ancre la marque dans la solidité, les immeubles et la confiance B2B." },
    { name: "Bleu signal", hex: "#2563EB", justification: "évoque la précision technique, le contrôle et les systèmes modernes." },
    { name: "Vert sécurité", hex: "#2F8F61", justification: "rappelle la conformité, l'inspection et la fiabilité opérationnelle." },
    { name: "Ivoire plan", hex: "#F5F0E7", justification: "apporte une surface premium et lisible pour devis, véhicules et documents." },
  ];
}

function photoPalette(): BrandPaletteColor[] {
  return [
    { name: "Graphite doux", hex: "#1E293B", justification: "base élégante qui laisse les images respirer." },
    { name: "Bleu lumière", hex: "#6AA8FF", justification: "apporte clarté, fraîcheur et modernité." },
    { name: "Ivoire studio", hex: "#F7F3EA", justification: "évoque papier, tirage et chaleur humaine." },
    { name: "Ambre objectif", hex: "#D99A3E", justification: "rappelle la lumière dorée et les détails premium." },
  ];
}

function professionalPalette(): BrandPaletteColor[] {
  return [
    { name: "Graphite", hex: "#1F2937", justification: "donne crédibilité et stabilité." },
    { name: "Bleu profond", hex: "#2F6FED", justification: "ajoute un signal moderne et digital." },
    { name: "Vert doux", hex: "#4A9D6F", justification: "évoque progression et confiance." },
    { name: "Ivoire", hex: "#F5F0E7", justification: "garde le rendu accessible et premium." },
  ];
}

function profileForIndustry(industry: string, brandName: string) {
  if (/elevateur|élévateur|verticale|construction/.test(industry)) {
    return {
      targetAudience: "promoteurs, gestionnaires d'immeubles, entrepreneurs et propriétaires qui veulent un partenaire fiable.",
      brandPersonality: ["fiable", "précis", "premium", "sécuritaire"],
      creativeDirection: "une identité construction tech, verticale et rassurante, avec un signal de mouvement ascendant.",
      logoPrompt: `Logo premium pour ${brandName}, entreprise d'élévateurs et construction verticale: symbole ascendant, lignes structurées, sentiment de sécurité, lisible sur camion, uniforme et site web.`,
      taglineOptions: ["Montez plus haut.", "Vertical. Fiable. Précis.", "La confiance en mouvement."],
      colorPalette: elevatorPalette(),
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
      colorPalette: photoPalette(),
      typographyRecommendation: "Inter Tight SemiBold pour le nom, Source Serif pour les accents éditoriaux.",
    };
  }

  return {
    targetAudience: "clients professionnels qui veulent un service clair, crédible et moderne.",
    brandPersonality: ["clair", "professionnel", "moderne", "fiable"],
    creativeDirection: "une identité sobre, mémorable et facile à décliner.",
    logoPrompt: `Logo professionnel pour ${brandName}: symbole simple, géométrie nette, rendu premium, facile à utiliser sur web et documents.`,
    taglineOptions: ["Simple. Clair. Fiable.", "Votre marque, mieux structurée.", "Une présence plus professionnelle."],
    colorPalette: professionalPalette(),
    typographyRecommendation: "Inter SemiBold pour le logo et Inter Regular pour les supports.",
  };
}

export function generateBrandBrief(input: string): BrandBrief {
  const requestType = detectBrandRequestType(input);
  const extracted = extractBrandName(input);
  const industry = inferIndustry(input, extracted.brandName);
  const profile = profileForIndustry(industry.industry, extracted.brandName);
  const concepts = [
    "A. Premium / corporate",
    "B. Mouvement / vitesse / verticalité",
    "C. Sécurité / fiabilité / infrastructure",
  ];

  return {
    requestType,
    brandName: extracted.brandName,
    explicitBrandName: extracted.explicit,
    industry: industry.industry,
    industryConfidence: industry.confidence,
    industryAssumption: industry.assumption,
    targetAudience: profile.targetAudience,
    brandPersonality: profile.brandPersonality,
    creativeDirection: profile.creativeDirection,
    logoPrompt: profile.logoPrompt,
    taglineOptions: profile.taglineOptions,
    colorPalette: profile.colorPalette,
    typographyRecommendation: profile.typographyRecommendation,
    concepts,
    recommendedConcept: "A. Premium / corporate",
  };
}

