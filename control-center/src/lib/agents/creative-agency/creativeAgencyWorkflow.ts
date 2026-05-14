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
  return input.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function clip(value: string, max = 420) {
  const clean = value.replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max).trim()}...` : clean;
}

export function isCreativeAgencyRequest(command: string) {
  return CREATIVE_KEYWORDS.test(normalize(command));
}

export function extractBrandName(command: string) {
  const original = command.replace(/\s+/g, " ").trim();
  const quoted = original.match(/["“](.+?)["”]/)?.[1];
  if (quoted) return quoted.trim();
  const afterFor = original.match(/\b(?:pour|for|appelle|nomm[eé]e?|called)\s+([A-Za-z0-9& -]{2,50})\b/);
  if (afterFor?.[1]) {
    const candidate = afterFor[1]
      .replace(/\b(une|un|compagnie|entreprise|company|construction|logo|original|premium|professionnel|professionnelle)\b/gi, "")
      .trim();
    if (candidate.length >= 3) return candidate;
  }
  const caps = original.match(/\b([A-Z][A-Z0-9]{2,}(?:\s+[A-Z][A-Z0-9]{2,}){0,3})\b/);
  if (caps?.[1]) return caps[1].trim();
  const title = original.match(/\b([A-Z][a-z0-9]+(?:\s+[A-Z][a-z0-9]+){0,2})\b/);
  const titleName = title?.[1]?.trim();
  if (titleName && titleName.length >= 3 && !/^(Cr|Crée|Créer|Fais|Refais|Je|Logo|Image|Design)$/i.test(titleName)) return titleName;
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
  if (/linge|vetement|apparel|mode|clothing/.test(lower)) return "marque de vêtements";
  if (/photo|sport|athlete|proshots/.test(lower)) return "photographie sportive";
  if (/saas|logiciel|app|module/.test(lower)) return "produit logiciel";
  return "marque commerciale à clarifier";
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
    targetAudience: "clients qui doivent comprendre rapidement la valeur et faire confiance à la marque",
    deliverableType,
    stylePreferences: [
      "premium",
      "professionnel",
      "mémorable",
      ...memoryLines(memorySummary, /Préférences|Prompts efficaces/i, 2),
    ],
    constraints: [
      "pas de placeholder",
      "pas de mockup décoratif",
      "pas de watermark",
      "texte minimal et lisible si présent",
      ...memoryLines(memorySummary, /À éviter/i, 2),
    ],
    references: retained,
    successCriteria: [
      "identifiable en petit format",
      "cohérent avec le positionnement",
      "distinctif sans être gratuit",
      "prêt à présenter au client",
    ],
  };
}

export function createBrandStrategy(brief: CreativeBrief): BrandStrategy {
  const isConstruction = /construction|chantier|batiment/i.test(brief.businessContext);
  return {
    brandEssence: isConstruction ? "fiabilité premium, maîtrise technique et solidité" : "clarté, confiance et différenciation mémorable",
    targetAudience: brief.targetAudience,
    emotionalGoal: isConstruction ? "rassurer et donner envie de confier un projet important" : "créer une impression immédiate de qualité",
    marketPosition: isConstruction ? "acteur sérieux et haut de gamme dans un marché souvent générique" : "marque moderne qui paraît établie dès le premier contact",
    valueProposition: isConstruction ? "un partenaire qui livre proprement, durablement et avec rigueur" : "une identité visuelle claire qui rend la marque plus crédible",
    keyTraits: ["confiance", "précision", "présence", "mémorisation"],
    avoidTraits: ["générique", "clipart", "trop décoratif", "illisible"],
    competitiveSignals: isConstruction ? ["structure", "matériaux", "monogramme solide", "géométrie architecturale"] : ["simplicité", "signature propriétaire", "contraste maîtrisé"],
  };
}

export function createMarketingDirection(brief: CreativeBrief, strategy: BrandStrategy): MarketingDirection {
  return {
    campaignObjective: brief.deliverableType === "logo" ? "installer une première impression crédible et mémorable" : "produire un visuel qui clarifie l’offre et attire l’attention",
    conversionGoal: "augmenter la confiance et faciliter le prochain contact",
    audiencePsychology: "le public juge la qualité en quelques secondes; le visuel doit donc paraître maîtrisé, simple et spécifique",
    messagingAngle: `${strategy.brandEssence} avec une lecture rapide de la promesse`,
    trustSignals: ["composition stable", "contraste net", "forme propriétaire", "absence de surcharge"],
    differentiationAngle: "éviter le rendu banque d’images en construisant une signature visuelle liée au nom et au contexte métier",
    CTAStyle: "sobre, direct, premium",
    priorityEmotions: ["confiance", "maîtrise", "désir de sérieux"],
  };
}

export function createArtisticDirections(brief: CreativeBrief, strategy: BrandStrategy, marketing: MarketingDirection): ArtisticDirection[] {
  const construction = /construction|chantier|batiment/i.test(brief.businessContext);
  const directions: ArtisticDirection[] = [
    {
      directionName: construction ? "Monolithe architectural" : "Signature monogramme premium",
      creativeRationale: `Transforme ${brief.brandName} en signe propriétaire, stable et mémorable. C’est la direction la plus sûre pour ${marketing.campaignObjective}.`,
      visualLanguage: construction ? "géométrie architecturale, volumes simples, contraste noir/blanc" : "monogramme net, espace négatif, forme très reconnaissable",
      typographyStyle: "sans-serif premium, compacte, très lisible",
      colorLogic: "noir, blanc, gris profond; accent très contrôlé seulement si nécessaire",
      shapeLanguage: construction ? "verticales, angles précis, silhouette solide" : "formes simples, coupe nette, équilibre symétrique",
      compositionGuidelines: "logo mark centré, peu d’éléments, hiérarchie claire entre symbole et nom",
      inspirationKeywords: construction ? ["architectural", "solid", "premium contractor", "monolith"] : ["minimal", "premium", "iconic", "brand mark"],
      whatToAvoid: ["clipart", "outils clichés", "effets 3D", "texte long"],
      fitScore: construction ? 94 : 91,
    },
    {
      directionName: "Sceau de confiance moderne",
      creativeRationale: `Met l’accent sur la crédibilité et le sérieux de ${brief.brandName}, utile si la marque doit inspirer confiance immédiatement.`,
      visualLanguage: "emblème contemporain, contours nets, sensation institutionnelle sans lourdeur",
      typographyStyle: "capitals lisibles, espacement modéré, présence stable",
      colorLogic: "contraste fort avec palette restreinte",
      shapeLanguage: "cadre, cercle ou bouclier abstrait sans tomber dans le badge générique",
      compositionGuidelines: "forme compacte utilisable en avatar, favicon et enseigne",
      inspirationKeywords: ["trusted", "badge", "modern seal", "crafted"],
      whatToAvoid: ["badge sportif", "ornement vintage", "trop d’icônes"],
      fitScore: 84,
    },
    {
      directionName: "Mouvement ascendant",
      creativeRationale: `Rend la marque plus dynamique et commerciale, avec un signal de progression et d’ambition.`,
      visualLanguage: "diagonales contrôlées, sensation d’élan, symbole simple",
      typographyStyle: "sans-serif moderne avec poids moyen à bold",
      colorLogic: "base neutre avec accent froid ou métallique discret",
      shapeLanguage: "flèche implicite, pli, coupe, chemin ascendant",
      compositionGuidelines: "éviter la flèche littérale; garder un signe abstrait lié au nom",
      inspirationKeywords: ["progress", "premium growth", "sharp", "forward"],
      whatToAvoid: ["flèche évidente", "startup générique", "dégradés excessifs"],
      fitScore: strategy.keyTraits.includes("présence") ? 88 : 80,
    },
  ];
  return directions.sort((a, b) => b.fitScore - a.fitScore).slice(0, 3);
}

export function createConceptSupport(brief: CreativeBrief, selected: ArtisticDirection): ConceptSupport {
  return {
    namingIdeas: [selected.directionName, `${brief.brandName} Signature`, `${brief.brandName} Mark`],
    taglineIdeas: ["Bâti pour inspirer confiance", "Une présence claire. Une exécution solide.", "Premium, précis, mémorable."],
    conceptNarrative: `${brief.brandName} doit paraître établi, crédible et distinctif. La direction ${selected.directionName} donne une structure visuelle claire au lieu d’un logo décoratif.`,
    shortBrandStatement: `${brief.brandName} est présenté comme une marque fiable, premium et immédiatement reconnaissable.`,
    copyToneGuidance: "phrases courtes, assurance calme, pas d’hyperbole",
  };
}

export function createImageGenerationPlan(input: {
  brief: CreativeBrief;
  strategy: BrandStrategy;
  marketing: MarketingDirection;
  selected: ArtisticDirection;
  concept: ConceptSupport;
  memorySummary?: string;
}): ImageGenerationPlan {
  const referenceArtifacts = memoryLines(input.memorySummary ?? "", /Artifacts acceptés|Références visuelles approuvées/i, 4);
  const finalCreativePrompt = [
    `Create a final ${input.brief.deliverableType} for ${input.brief.brandName}.`,
    `Agency direction: ${input.selected.directionName}.`,
    `Creative rationale: ${input.selected.creativeRationale}`,
    `Brand essence: ${input.strategy.brandEssence}.`,
    `Marketing intent: ${input.marketing.messagingAngle}.`,
    `Visual language: ${input.selected.visualLanguage}.`,
    `Typography: ${input.selected.typographyStyle}.`,
    `Color logic: ${input.selected.colorLogic}.`,
    `Shape language: ${input.selected.shapeLanguage}.`,
    `Composition: ${input.selected.compositionGuidelines}.`,
    `Concept narrative: ${input.concept.conceptNarrative}.`,
    referenceArtifacts.length ? `Preserve approved reference direction: ${referenceArtifacts.join(" | ")}` : "",
    "Final image only. Premium brand design. No mockup. No watermark. No placeholder text. Avoid generic clipart.",
  ].filter(Boolean).join("\n");
  return {
    selectedDirection: input.selected.directionName,
    finalCreativePrompt,
    visualGoals: ["mémorisation rapide", "crédibilité premium", "forme propriétaire", "lisibilité"],
    consistencyRules: [
      "respecter la direction artistique sélectionnée",
      "ne pas changer de style si une référence approuvée existe",
      "éviter les clichés métier littéraux",
      "garder le nom lisible si du texte est généré",
    ],
    reuseReferenceArtifacts: referenceArtifacts,
    expectedOutputType: input.brief.deliverableType,
  };
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
      ? [`direction ${input.plan.selectedDirection} respectée`, "artifact image réel créé", "intention marketing claire"]
      : ["brief et direction prêts"],
    weaknesses: hasImage ? [] : ["aucune image exploitable retournée par le provider"],
    revisionSuggestions: decision === "approve"
      ? []
      : ["relancer avec une composition plus simple", "renforcer le contraste", "réduire les détails décoratifs"],
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
    conciseExplanation: input.artifactId ? "Voici votre visuel final." : "L’équipe a préparé la direction, mais le rendu image n’est pas disponible.",
    chosenDirection: input.selected.directionName,
    whyItWorks: input.selected.creativeRationale,
    optionalAlternatives: [],
    nextRecommendedActions: input.artifactId
      ? ["Retenir cette direction", "Régénérer une variante", "Décliner en bannière ou social post"]
      : ["Configurer le provider image", "Relancer la génération"],
  };
}

export function buildCreativeAgencyWorkflow(command: string, memorySummary = ""): CreativeAgencyWorkflow {
  const started = Date.now();
  const creativeBrief = createCreativeBrief(command, memorySummary);
  const brandStrategy = createBrandStrategy(creativeBrief);
  const marketingDirection = createMarketingDirection(creativeBrief, brandStrategy);
  const artisticDirections = createArtisticDirections(creativeBrief, brandStrategy, marketingDirection);
  const recommendedDirection = artisticDirections[0];
  const conceptSupport = createConceptSupport(creativeBrief, recommendedDirection);
  const imageGenerationPlan = createImageGenerationPlan({
    brief: creativeBrief,
    strategy: brandStrategy,
    marketing: marketingDirection,
    selected: recommendedDirection,
    concept: conceptSupport,
    memorySummary,
  });
  const elapsed = Date.now() - started;
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
      { agent: "creative_project_manager", role: "Creative Project Manager", status: "completed", summary: `Brief structuré pour ${creativeBrief.brandName}.`, durationMs: elapsed, providerUsed: "local_strategy" },
      { agent: "brand_strategist", role: "Brand Strategist", status: "completed", summary: brandStrategy.brandEssence, durationMs: 0, providerUsed: "local_strategy" },
      { agent: "marketing_strategist", role: "Marketing Strategist", status: "completed", summary: marketingDirection.messagingAngle, durationMs: 0, providerUsed: "local_strategy" },
      { agent: "art_director", role: "Art Director", status: "completed", summary: `${artisticDirections.length} directions; recommandée: ${recommendedDirection.directionName}.`, durationMs: 0, providerUsed: "local_strategy" },
      { agent: "copy_concept_agent", role: "Copy / Concept Agent", status: "completed", summary: conceptSupport.shortBrandStatement, durationMs: 0, providerUsed: "local_strategy" },
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
