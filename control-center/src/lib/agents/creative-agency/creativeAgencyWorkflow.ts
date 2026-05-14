import { generateStructuredObject } from "@/lib/ai/structuredGeneration";

export interface CreativeBrief {
  userGoal: string;
  businessContext: string;
  brandName: string;
  targetAudience: string;
  deliverableType: "logo" | "branding" | "marketing_image" | "campaign_visual" | "illustration";
  stylePreferences: string[];
  constraints: string[];
  references: string[];
  successCriteria: string[];
}

export interface BrandStrategy {
  brandEssence: string;
  targetAudience: string;
  emotionalGoal: string;
  marketPosition: string;
  valueProposition: string;
  keyTraits: string[];
  avoidTraits: string[];
  competitiveSignals: string[];
}

export interface MarketingDirection {
  campaignObjective: string;
  conversionGoal: string;
  audiencePsychology: string;
  messagingAngle: string;
  trustSignals: string[];
  differentiationAngle: string;
  CTAStyle: string;
  priorityEmotions: string[];
}

export interface ArtisticDirection {
  directionName: string;
  creativeRationale: string;
  visualLanguage: string;
  typographyStyle: string;
  colorLogic: string;
  shapeLanguage: string;
  compositionGuidelines: string;
  inspirationKeywords: string[];
  whatToAvoid: string[];
  fitScore: number;
}

export interface ConceptSupport {
  namingIdeas: string[];
  taglineIdeas: string[];
  conceptNarrative: string;
  shortBrandStatement: string;
  copyToneGuidance: string;
}

export interface ImageGenerationPlan {
  selectedDirection: string;
  finalCreativePrompt: string;
  visualGoals: string[];
  consistencyRules: string[];
  reuseReferenceArtifacts: string[];
  expectedOutputType: string;
}

export interface CritiqueReport {
  brandAlignmentScore: number;
  originalityScore: number;
  clarityScore: number;
  marketingEffectivenessScore: number;
  visualCohesionScore: number;
  strengths: string[];
  weaknesses: string[];
  revisionSuggestions: string[];
  decision: "approve" | "revise";
}

export interface FinalCEOCard {
  finalArtifact: string | null;
  conciseExplanation: string;
  chosenDirection: string;
  whyItWorks: string;
  optionalAlternatives: string[];
  nextRecommendedActions: string[];
}

export interface CreativeAgencyWorkflow {
  mode: "agency";
  creativeBrief: CreativeBrief;
  brandStrategy: BrandStrategy;
  marketingDirection: MarketingDirection;
  artisticDirections: ArtisticDirection[];
  recommendedDirection: ArtisticDirection;
  conceptSupport: ConceptSupport;
  imageGenerationPlan: ImageGenerationPlan;
  critiqueReport?: CritiqueReport;
  finalCEOCard?: FinalCEOCard;
  agentOutputs: Array<{
    agent: string;
    role: string;
    status: "completed" | "needs_action";
    summary: string;
    durationMs: number;
    providerUsed: string;
  }>;
}

const CREATIVE_KEYWORDS = /\b(logo|design|visuel|banni[eè]re|image|branding|affiche|illustration|identit[eé]|campagne|pub|publicit[eé]|social|marketing)\b/i;

function normalize(input: string) {
  return input.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

function clip(value: string, max = 420) {
  const clean = value.replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max).trim()}...` : clean;
}

export function isCreativeAgencyRequest(command: string) {
  return CREATIVE_KEYWORDS.test(normalize(command));
}

const BRAND_STYLE_WORDS = /^(sportif|premium|moderne|professionnel|professionnelle|simple|luxe|tech|corporate|minimal|minimaliste|pour|ma|votre|notre|sur|avec|de|un|une|le|la|les|noir|blanc|transparent|original)$/i;
const BRAND_VERB_PREFIXES = /^(cr[eé]e?|fais|refais|je|logo|image|design|crea|cree)$/i;

export function extractBrandName(command: string) {
  const original = command.replace(/\s+/g, " ").trim();

  const quoted = original.match(/["“”«»](.+?)["“”«»]/)?.[1];
  if (quoted) return quoted.trim();

  const afterFor = original.match(/\b(?:pour|for|appelle|nomm[eé]e?|called)\s+(?:(?:la|le|les|ma|votre|notre|une?)\s+)?(?:marque|compagnie|entreprise|brand)?\s*([A-Za-z0-9\xC0-ɏ&][A-Za-z0-9\xC0-ɏ& -]{1,50})/i);
  if (afterFor?.[1]) {
    const firstToken = afterFor[1].trim().split(/\s+/)[0].replace(/[.,;!?]$/, "");
    if (firstToken.length >= 2 && !BRAND_STYLE_WORDS.test(firstToken) && !BRAND_VERB_PREFIXES.test(firstToken)) {
      return firstToken;
    }
  }

  const caps = original.match(/\b([A-Z][A-Z0-9]{2,}(?:\s+[A-Z][A-Z0-9]{2,}){0,3})\b/);
  if (caps?.[1]) return caps[1].trim();

  const afterLogo = original.match(/\b(?:logo|branding|marque)\s+(?:(?:la|le|ma|votre|notre|une?|de)\s+)?([A-Za-z0-9\xC0-ɏ][A-Za-z0-9\xC0-ɏ&-]{1,30})\b/i);
  if (afterLogo?.[1] && !BRAND_STYLE_WORDS.test(afterLogo[1]) && !BRAND_VERB_PREFIXES.test(afterLogo[1])) {
    return afterLogo[1];
  }

  const title = original.match(/\b([A-Z][a-z0-9\xC0-ɏ]+(?:\s+[A-Z][a-z0-9\xC0-ɏ]+){0,2})\b/);
  const titleName = title?.[1]?.trim();
  if (titleName && titleName.length >= 3 && !BRAND_VERB_PREFIXES.test(titleName)) return titleName;

  return "Marque";
}

function inferDeliverableType(command: string): CreativeBrief["deliverableType"] {
  const lower = normalize(command);
  if (lower.includes("logo")) return "logo";
  if (lower.includes("branding") || lower.includes("identite")) return "branding";
  if (lower.includes("campagne") || lower.includes("pub") || lower.includes("social")) return "campaign_visual";
  if (lower.includes("illustration")) return "illustration";
  return "marketing_image";
}

function inferBusinessContext(command: string) {
  const lower = normalize(command);
  if (/construction|contracteur|chantier|batiment|renovation/.test(lower)) return "construction et services terrain";
  if (/linge|vetement|apparel|mode|clothing/.test(lower)) return "marque de vetements";
  if (/photo|sport|athlete|proshots/.test(lower)) return "photographie sportive";
  if (/saas|logiciel|app|module/.test(lower)) return "produit logiciel";
  if (/fintech|finance|banque|paiement|crypto/.test(lower)) return "fintech / finance";
  if (/sante|health|wellness|medical/.test(lower)) return "sante / wellness";
  if (/restaurant|cafe|food|cuisine/.test(lower)) return "restauration";
  return "marque commerciale";
}

function memoryLines(memorySummary: string, pattern: RegExp, limit = 3) {
  return memorySummary
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => pattern.test(line))
    .slice(0, limit)
    .map((line) => clip(line, 260));
}

export function createCreativeBrief(command: string, memorySummary = ""): CreativeBrief {
  const deliverableType = inferDeliverableType(command);
  const brandName = extractBrandName(command);
  const retained = memoryLines(memorySummary, /Branding retenu|Références visuelles approuvées|Artifacts acceptés/i, 4);
  return {
    userGoal: clip(command),
    businessContext: inferBusinessContext(command),
    brandName,
    targetAudience: "clients qui doivent comprendre rapidement la valeur et faire confiance a la marque",
    deliverableType,
    stylePreferences: [
      "premium",
      "professionnel",
      "memorable",
      ...memoryLines(memorySummary, /Préférences|Prompts efficaces/i, 2),
    ],
    constraints: [
      "pas de placeholder",
      "pas de mockup decoratif",
      "pas de watermark",
      "texte minimal et lisible si present",
      ...memoryLines(memorySummary, /A eviter/i, 2),
    ],
    references: retained,
    successCriteria: [
      "identifiable en petit format",
      "coherent avec le positionnement",
      "distinctif sans etre gratuit",
      "pret a presenter au client",
    ],
  };
}

// ─── Local fallbacks (always available, no API needed) ───────────────────────

export function createBrandStrategy(brief: CreativeBrief): BrandStrategy {
  const isConstruction = /construction|chantier|batiment/i.test(brief.businessContext);
  return {
    brandEssence: isConstruction ? "fiabilite premium, maitrise technique et solidite" : "clarte, confiance et differenciation memorable",
    targetAudience: brief.targetAudience,
    emotionalGoal: isConstruction ? "rassurer et donner envie de confier un projet important" : "creer une impression immediate de qualite",
    marketPosition: isConstruction ? "acteur serieux et haut de gamme dans un marche souvent generique" : "marque moderne qui parait etablie des le premier contact",
    valueProposition: isConstruction ? "un partenaire qui livre proprement, durablement et avec rigueur" : "une identite visuelle claire qui rend la marque plus credible",
    keyTraits: ["confiance", "precision", "presence", "memorisation"],
    avoidTraits: ["generique", "clipart", "trop decoratif", "illisible"],
    competitiveSignals: isConstruction ? ["structure", "materiaux", "monogramme solide", "geometrie architecturale"] : ["simplicite", "signature proprietaire", "contraste maitrise"],
  };
}

export function createMarketingDirection(brief: CreativeBrief, strategy: BrandStrategy): MarketingDirection {
  return {
    campaignObjective: brief.deliverableType === "logo" ? "installer une premiere impression credible et memorable" : "produire un visuel qui clarifie l'offre et attire l'attention",
    conversionGoal: "augmenter la confiance et faciliter le prochain contact",
    audiencePsychology: "le public juge la qualite en quelques secondes; le visuel doit donc paraitre maitrise, simple et specifique",
    messagingAngle: `${strategy.brandEssence} avec une lecture rapide de la promesse`,
    trustSignals: ["composition stable", "contraste net", "forme proprietaire", "absence de surcharge"],
    differentiationAngle: "eviter le rendu banque d'images en construisant une signature visuelle liee au nom et au contexte metier",
    CTAStyle: "sobre, direct, premium",
    priorityEmotions: ["confiance", "maitrise", "desir de serieux"],
  };
}

export function createArtisticDirections(brief: CreativeBrief, strategy: BrandStrategy, marketing: MarketingDirection): ArtisticDirection[] {
  const construction = /construction|chantier|batiment/i.test(brief.businessContext);
  const directions: ArtisticDirection[] = [
    {
      directionName: construction ? "Monolithe architectural" : "Signature monogramme premium",
      creativeRationale: `Transforme ${brief.brandName} en signe proprietaire, stable et memorable. C'est la direction la plus sure pour ${marketing.campaignObjective}.`,
      visualLanguage: construction ? "geometrie architecturale, volumes simples, contraste noir/blanc" : "monogramme net, espace negatif, forme tres reconnaissable",
      typographyStyle: "sans-serif premium, compacte, tres lisible",
      colorLogic: "noir, blanc, gris profond; accent tres controle seulement si necessaire",
      shapeLanguage: construction ? "verticales, angles precis, silhouette solide" : "formes simples, coupe nette, equilibre symetrique",
      compositionGuidelines: "logo mark centre, peu d'elements, hierarchie claire entre symbole et nom",
      inspirationKeywords: construction ? ["architectural", "solid", "premium contractor", "monolith"] : ["minimal", "premium", "iconic", "brand mark"],
      whatToAvoid: ["clipart", "outils cliches", "effets 3D", "texte long"],
      fitScore: construction ? 94 : 91,
    },
    {
      directionName: "Sceau de confiance moderne",
      creativeRationale: `Met l'accent sur la credibilite et le serieux de ${brief.brandName}, utile si la marque doit inspirer confiance immediatement.`,
      visualLanguage: "embleme contemporain, contours nets, sensation institutionnelle sans lourdeur",
      typographyStyle: "capitals lisibles, espacement modere, presence stable",
      colorLogic: "contraste fort avec palette restreinte",
      shapeLanguage: "cadre, cercle ou bouclier abstrait sans tomber dans le badge generique",
      compositionGuidelines: "forme compacte utilisable en avatar, favicon et enseigne",
      inspirationKeywords: ["trusted", "badge", "modern seal", "crafted"],
      whatToAvoid: ["badge sportif", "ornement vintage", "trop d'icones"],
      fitScore: 84,
    },
    {
      directionName: "Mouvement ascendant",
      creativeRationale: "Rend la marque plus dynamique et commerciale, avec un signal de progression et d'ambition.",
      visualLanguage: "diagonales controlees, sensation d'elan, symbole simple",
      typographyStyle: "sans-serif moderne avec poids moyen a bold",
      colorLogic: "base neutre avec accent froid ou metallique discret",
      shapeLanguage: "fleche implicite, pli, coupe, chemin ascendant",
      compositionGuidelines: "eviter la fleche litterale; garder un signe abstrait lie au nom",
      inspirationKeywords: ["progress", "premium growth", "sharp", "forward"],
      whatToAvoid: ["fleche evidente", "startup generique", "degrades excessifs"],
      fitScore: strategy.keyTraits.includes("presence") ? 88 : 80,
    },
  ];
  return directions.sort((a, b) => b.fitScore - a.fitScore).slice(0, 3);
}

export function createConceptSupport(brief: CreativeBrief, selected: ArtisticDirection): ConceptSupport {
  return {
    namingIdeas: [selected.directionName, `${brief.brandName} Signature`, `${brief.brandName} Mark`],
    taglineIdeas: ["Bati pour inspirer confiance", "Une presence claire. Une execution solide.", "Premium, precis, memorable."],
    conceptNarrative: `${brief.brandName} doit paraitre etabli, credible et distinctif. La direction ${selected.directionName} donne une structure visuelle claire au lieu d'un logo decoratif.`,
    shortBrandStatement: `${brief.brandName} est presente comme une marque fiable, premium et immediatement reconnaissable.`,
    copyToneGuidance: "phrases courtes, assurance calme, pas d'hyperbole",
  };
}

// ─── LLM-powered agents (NVIDIA → DeepInfra → local fallback) ────────────────

const BRAND_STRATEGY_SYSTEM = `You are a brand strategist. Analyze the brand brief and output a JSON brand strategy.
Output ONLY valid JSON, no explanations, no markdown.
Required schema:
{
  "brandEssence": string,
  "targetAudience": string,
  "emotionalGoal": string,
  "marketPosition": string,
  "valueProposition": string,
  "keyTraits": string[],
  "avoidTraits": string[],
  "competitiveSignals": string[]
}
Rules: each string under 90 chars; arrays: 3-5 items; be specific to this brand, not generic.`;

function validateBrandStrategy(value: unknown, fallback: BrandStrategy): BrandStrategy {
  if (!value || typeof value !== "object") return fallback;
  const v = value as Record<string, unknown>;
  const str = (k: string, d: string) => (typeof v[k] === "string" && (v[k] as string).trim() ? (v[k] as string).trim() : d);
  const arr = (k: string, d: string[]) => (Array.isArray(v[k]) && (v[k] as unknown[]).length > 0 ? (v[k] as string[]).filter(s => typeof s === "string") : d);
  return {
    brandEssence: str("brandEssence", fallback.brandEssence),
    targetAudience: str("targetAudience", fallback.targetAudience),
    emotionalGoal: str("emotionalGoal", fallback.emotionalGoal),
    marketPosition: str("marketPosition", fallback.marketPosition),
    valueProposition: str("valueProposition", fallback.valueProposition),
    keyTraits: arr("keyTraits", fallback.keyTraits),
    avoidTraits: arr("avoidTraits", fallback.avoidTraits),
    competitiveSignals: arr("competitiveSignals", fallback.competitiveSignals),
  };
}

const ART_DIRECTOR_SYSTEM = `You are an art director for brand identity. Generate 3 distinct visual directions for a logo.
Output ONLY valid JSON, no explanations.
Required schema:
{
  "directions": [
    {
      "directionName": string,
      "creativeRationale": string,
      "visualLanguage": string,
      "typographyStyle": string,
      "colorLogic": string,
      "shapeLanguage": string,
      "compositionGuidelines": string,
      "inspirationKeywords": string[],
      "whatToAvoid": string[],
      "fitScore": number
    }
  ]
}
Rules:
- 3 genuinely different directions (e.g., one monogram, one wordmark, one emblem)
- fitScore: 70-100, the best fit scores highest
- Be specific to the brand name, industry, and positioning
- inspirationKeywords/whatToAvoid: 3-5 items each`;

function validateArtDirections(value: unknown, fallback: ArtisticDirection[]): ArtisticDirection[] {
  if (!value || typeof value !== "object") return fallback;
  const v = value as Record<string, unknown>;
  if (!Array.isArray(v.directions) || v.directions.length < 2) return fallback;
  const dirs = (v.directions as unknown[]).slice(0, 3).map((d: unknown): ArtisticDirection | null => {
    if (!d || typeof d !== "object") return null;
    const dir = d as Record<string, unknown>;
    if (!dir.directionName || !dir.creativeRationale) return null;
    return {
      directionName: String(dir.directionName),
      creativeRationale: String(dir.creativeRationale ?? ""),
      visualLanguage: String(dir.visualLanguage ?? ""),
      typographyStyle: String(dir.typographyStyle ?? "sans-serif, lisible"),
      colorLogic: String(dir.colorLogic ?? "contraste fort"),
      shapeLanguage: String(dir.shapeLanguage ?? "geometrie nette"),
      compositionGuidelines: String(dir.compositionGuidelines ?? "centree, equilibree"),
      inspirationKeywords: Array.isArray(dir.inspirationKeywords) ? dir.inspirationKeywords.map(String) : ["premium", "minimal"],
      whatToAvoid: Array.isArray(dir.whatToAvoid) ? dir.whatToAvoid.map(String) : ["generique"],
      fitScore: typeof dir.fitScore === "number" ? Math.max(60, Math.min(100, dir.fitScore)) : 80,
    };
  }).filter((d): d is ArtisticDirection => d !== null);
  return dirs.length >= 2 ? dirs.sort((a, b) => b.fitScore - a.fitScore) : fallback;
}

const LOGO_DESIGNER_SYSTEM = `You are a prompt engineer for FLUX image generation, specialized in logos.
Given an approved artistic direction and brand context, craft an optimized FLUX prompt.

REQUIRED FORMAT — comma-separated in this exact order:
1. Style descriptor (geometric minimalist lettermark / bold sans-serif wordmark / etc.)
2. Subject with EXACT brand name if text needed ("letter E" or "wordmark EKIDA")
3. Color palette with hex codes ("deep navy #0F1B4C, crisp white #FFFFFF")
4. Composition ("centered, symmetric, generous negative space")
5. Lighting ("flat 2D vector, no shadows, no gradients")
6. Mood ("premium, authoritative, trustworthy")
7. Technical specs ("high-contrast edges, scalable vector geometry")
8. Fixed ending: "professional logo design, vector style, white background, high detail, sharp edges"

BANNED WORDS: beautiful, amazing, nice, good, great, wonderful, stunning, elegant
REQUIRED: use at least 3 of: negative space, sans-serif, geometric, minimalist, lettermark, wordmark, emblem, monochrome, bold
Total: 60-130 words.

Output ONLY valid JSON:
{ "fluxPrompt": string, "negativePrompt": string }

negativePrompt: "realistic, photograph, 3D render, gradient, shadow, blur, watermark, decorative frame, ornate, clipart, stock photo, low contrast, milky haze"`;

interface FluxPromptOutput {
  fluxPrompt: string;
  negativePrompt: string;
}

function validateFluxPrompt(value: unknown, fallback: FluxPromptOutput): FluxPromptOutput {
  if (!value || typeof value !== "object") return fallback;
  const v = value as Record<string, unknown>;
  const prompt = typeof v.fluxPrompt === "string" ? v.fluxPrompt.trim() : "";
  if (!prompt || prompt.length < 30) return fallback;
  return {
    fluxPrompt: prompt,
    negativePrompt: typeof v.negativePrompt === "string" ? v.negativePrompt.trim() : fallback.negativePrompt,
  };
}

async function buildBrandStrategyWithLlm(brief: CreativeBrief): Promise<{ strategy: BrandStrategy; providerUsed: string }> {
  const fallback = createBrandStrategy(brief);
  const result = await generateStructuredObject(
    {
      system: BRAND_STRATEGY_SYSTEM,
      user: JSON.stringify({
        brandName: brief.brandName,
        industry: brief.businessContext,
        deliverable: brief.deliverableType,
        userGoal: brief.userGoal,
        styleHints: brief.stylePreferences.slice(0, 3),
      }),
      purpose: "brand_strategy",
    },
    fallback,
    validateBrandStrategy,
  );
  return { strategy: result.value, providerUsed: result.mode === "prototype" ? "local_strategy" : result.mode };
}

async function buildArtDirectionsWithLlm(brief: CreativeBrief, strategy: BrandStrategy, marketing: MarketingDirection): Promise<{ directions: ArtisticDirection[]; providerUsed: string }> {
  const fallback = createArtisticDirections(brief, strategy, marketing);
  const result = await generateStructuredObject(
    {
      system: ART_DIRECTOR_SYSTEM,
      user: JSON.stringify({
        brandName: brief.brandName,
        industry: brief.businessContext,
        deliverable: brief.deliverableType,
        brandEssence: strategy.brandEssence,
        keyTraits: strategy.keyTraits,
        avoidTraits: strategy.avoidTraits,
        emotionalGoal: strategy.emotionalGoal,
        messagingAngle: marketing.messagingAngle,
      }),
      purpose: "art_direction",
    },
    fallback,
    validateArtDirections,
  );
  return { directions: result.value, providerUsed: result.mode === "prototype" ? "local_strategy" : result.mode };
}

async function buildFluxPromptWithLlm(brief: CreativeBrief, selected: ArtisticDirection, strategy: BrandStrategy): Promise<{ prompt: string; negativePrompt: string; providerUsed: string }> {
  const localFallbackPrompt = buildLocalFluxPrompt(brief, selected);
  const fallback: FluxPromptOutput = {
    fluxPrompt: localFallbackPrompt,
    negativePrompt: "realistic, photograph, 3D render, gradient, shadow, blur, watermark, decorative frame, ornate, clipart, stock photo, low contrast, milky haze",
  };
  const result = await generateStructuredObject(
    {
      system: LOGO_DESIGNER_SYSTEM,
      user: JSON.stringify({
        brandName: brief.brandName,
        industry: brief.businessContext,
        approvedDirection: {
          name: selected.directionName,
          visualLanguage: selected.visualLanguage,
          typographyStyle: selected.typographyStyle,
          colorLogic: selected.colorLogic,
          shapeLanguage: selected.shapeLanguage,
          compositionGuidelines: selected.compositionGuidelines,
          whatToAvoid: selected.whatToAvoid,
        },
        brandEssence: strategy.brandEssence,
        deliverableType: brief.deliverableType,
      }),
      purpose: "flux_prompt_engineering",
    },
    fallback,
    validateFluxPrompt,
  );
  return {
    prompt: result.value.fluxPrompt,
    negativePrompt: result.value.negativePrompt,
    providerUsed: result.mode === "prototype" ? "local_strategy" : result.mode,
  };
}

function buildLocalFluxPrompt(brief: CreativeBrief, selected: ArtisticDirection): string {
  const brandName = brief.brandName !== "Marque" ? brief.brandName : "";
  const parts = [
    selected.visualLanguage || "geometric minimalist lettermark",
    brandName ? `wordmark ${brandName}, text must be legible` : "abstract symbol, negative space",
    selected.colorLogic || "high contrast black and white",
    selected.compositionGuidelines || "centered, symmetric composition",
    "flat 2D vector, no shadows, no gradients",
    "premium authoritative mood",
    "bold sans-serif, clean vector geometry, sharp edges",
    "professional logo design, vector style, white background, high detail, sharp edges",
  ];
  if (brandName) {
    parts.unshift(`BRAND NAME: write "${brandName}" clearly in the logo`);
  }
  return parts.join(", ");
}

export async function createImageGenerationPlan(input: {
  brief: CreativeBrief;
  strategy: BrandStrategy;
  marketing: MarketingDirection;
  selected: ArtisticDirection;
  concept: ConceptSupport;
  memorySummary?: string;
}): Promise<{ plan: ImageGenerationPlan; fluxPromptProviderUsed: string }> {
  const referenceArtifacts = memoryLines(input.memorySummary ?? "", /Artifacts acceptes|References visuelles approuvees/i, 4);
  const brandName = input.brief.brandName;

  const fluxResult = await buildFluxPromptWithLlm(input.brief, input.selected, input.strategy);

  const brandInstruction = brandName !== "Marque"
    ? `BRAND NAME: "${brandName}" must appear clearly and prominently. Write "${brandName}" exactly.`
    : "";

  const finalCreativePrompt = [
    brandInstruction,
    fluxResult.prompt,
    referenceArtifacts.length ? `Preserve approved reference direction: ${referenceArtifacts.join(" | ")}` : "",
  ].filter(Boolean).join("\n");

  const plan: ImageGenerationPlan = {
    selectedDirection: input.selected.directionName,
    finalCreativePrompt,
    visualGoals: ["memorisation rapide", "credibilite premium", "forme proprietaire", "lisibilite"],
    consistencyRules: [
      "respecter la direction artistique selectionnee",
      "ne pas changer de style si une reference approuvee existe",
      "eviter les cliches metier litteraux",
      "garder le nom lisible si du texte est genere",
    ],
    reuseReferenceArtifacts: referenceArtifacts,
    expectedOutputType: input.brief.deliverableType,
  };

  return { plan, fluxPromptProviderUsed: fluxResult.providerUsed };
}

export function createCritiqueReport(input: {
  imageDataUrl?: string | null;
  plan: ImageGenerationPlan;
  brief: CreativeBrief;
  retries: number;
}): CritiqueReport {
  const hasImage = Boolean(input.imageDataUrl?.startsWith("data:image/"));
  const base = hasImage ? 84 : 20;
  const directionBonus = input.plan.reuseReferenceArtifacts.length ? 5 : 0;
  const clarityScore = hasImage ? 86 : 15;
  const brandAlignmentScore = Math.min(96, base + directionBonus);
  const originalityScore = hasImage ? 82 : 20;
  const marketingEffectivenessScore = hasImage ? 84 : 18;
  const visualCohesionScore = hasImage ? 85 : 18;
  const decision = hasImage && Math.min(brandAlignmentScore, clarityScore, visualCohesionScore) >= 75 ? "approve" : "revise";
  return {
    brandAlignmentScore,
    originalityScore,
    clarityScore,
    marketingEffectivenessScore,
    visualCohesionScore,
    strengths: hasImage
      ? [`direction ${input.plan.selectedDirection} respectee`, "artifact image reel cree", "intention marketing claire"]
      : ["brief et direction prets"],
    weaknesses: hasImage ? [] : ["aucune image exploitable retournee par le provider"],
    revisionSuggestions: decision === "approve"
      ? []
      : ["relancer avec une composition plus simple", "renforcer le contraste", "eviter tout rendu laiteux ou delave", "reduire les details decoratifs"],
    decision,
  };
}

export function createFinalCEOCard(input: {
  artifactId: string | null;
  selected: ArtisticDirection;
  critique: CritiqueReport;
}): FinalCEOCard {
  return {
    finalArtifact: input.artifactId,
    conciseExplanation: input.artifactId ? "Voici votre visuel final." : "L'equipe a prepare la direction, mais le rendu image n'est pas disponible.",
    chosenDirection: input.selected.directionName,
    whyItWorks: input.selected.creativeRationale,
    optionalAlternatives: [],
    nextRecommendedActions: input.artifactId
      ? ["Retenir cette direction", "Regenerer une variante", "Decliner en banniere ou social post"]
      : ["Configurer le provider image", "Relancer la generation"],
  };
}

export async function buildCreativeAgencyWorkflow(command: string, memorySummary = ""): Promise<CreativeAgencyWorkflow> {
  const started = Date.now();
  const creativeBrief = createCreativeBrief(command, memorySummary);

  // Agent 1: Creative Project Manager (local — brief parsing is deterministic)
  const pmDone = Date.now();

  // Agent 2: Brand Strategist — LLM-powered, local fallback
  const brandStart = Date.now();
  const { strategy: brandStrategy, providerUsed: brandProvider } = await buildBrandStrategyWithLlm(creativeBrief);
  const brandDone = Date.now();

  // Agent 3: Marketing Strategist — derives from brand strategy (local)
  const marketingDirection = createMarketingDirection(creativeBrief, brandStrategy);

  // Agent 4: Art Director — LLM-powered, local fallback
  const artStart = Date.now();
  const { directions: artisticDirections, providerUsed: artProvider } = await buildArtDirectionsWithLlm(creativeBrief, brandStrategy, marketingDirection);
  const artDone = Date.now();
  const recommendedDirection = artisticDirections[0];

  // Agent 5: Copy/Concept (local — naming/taglines)
  const conceptSupport = createConceptSupport(creativeBrief, recommendedDirection);

  // Agent 6: Logo Designer — LLM-powered FLUX prompt, local fallback
  const planStart = Date.now();
  const { plan: imageGenerationPlan, fluxPromptProviderUsed } = await createImageGenerationPlan({
    brief: creativeBrief,
    strategy: brandStrategy,
    marketing: marketingDirection,
    selected: recommendedDirection,
    concept: conceptSupport,
    memorySummary,
  });
  const planDone = Date.now();

  return {
    mode: "agency",
    creativeBrief,
    brandStrategy,
    marketingDirection,
    artisticDirections,
    recommendedDirection,
    conceptSupport,
    imageGenerationPlan,
    agentOutputs: [
      {
        agent: "creative_project_manager",
        role: "Creative Project Manager",
        status: "completed",
        summary: `Brief structure pour ${creativeBrief.brandName}.`,
        durationMs: pmDone - started,
        providerUsed: "local_strategy",
      },
      {
        agent: "brand_strategist",
        role: "Brand Strategist",
        status: "completed",
        summary: brandStrategy.brandEssence,
        durationMs: brandDone - brandStart,
        providerUsed: brandProvider,
      },
      {
        agent: "marketing_strategist",
        role: "Marketing Strategist",
        status: "completed",
        summary: marketingDirection.messagingAngle,
        durationMs: 0,
        providerUsed: "local_strategy",
      },
      {
        agent: "art_director",
        role: "Art Director",
        status: "completed",
        summary: `${artisticDirections.length} directions; recommandee: ${recommendedDirection.directionName}.`,
        durationMs: artDone - artStart,
        providerUsed: artProvider,
      },
      {
        agent: "copy_concept_agent",
        role: "Copy / Concept Agent",
        status: "completed",
        summary: conceptSupport.shortBrandStatement,
        durationMs: 0,
        providerUsed: "local_strategy",
      },
      {
        agent: "logo_designer",
        role: "Logo Designer / FLUX Prompt Engineer",
        status: "completed",
        summary: `Prompt FLUX optimise via ${fluxPromptProviderUsed} pour direction: ${recommendedDirection.directionName}.`,
        durationMs: planDone - planStart,
        providerUsed: fluxPromptProviderUsed,
      },
    ],
  };
}

export function sanitizeCreativeAgencyForClient(workflow: CreativeAgencyWorkflow) {
  return {
    mode: workflow.mode,
    creativeBrief: workflow.creativeBrief,
    brandStrategy: workflow.brandStrategy,
    marketingDirection: workflow.marketingDirection,
    artisticDirections: workflow.artisticDirections,
    recommendedDirection: workflow.recommendedDirection,
    conceptSupport: workflow.conceptSupport,
    imageGenerationPlan: {
      selectedDirection: workflow.imageGenerationPlan.selectedDirection,
      visualGoals: workflow.imageGenerationPlan.visualGoals,
      consistencyRules: workflow.imageGenerationPlan.consistencyRules,
      reuseReferenceArtifacts: workflow.imageGenerationPlan.reuseReferenceArtifacts,
      expectedOutputType: workflow.imageGenerationPlan.expectedOutputType,
    },
    critiqueReport: workflow.critiqueReport,
    finalCEOCard: workflow.finalCEOCard,
    agentOutputs: workflow.agentOutputs,
  };
}
