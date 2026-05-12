import { generateBrandBrief } from "@/lib/brandGeneration";
import { generateStructuredObject } from "./structuredGeneration";
import { STRUCTURED_CEO_INTENT_PROMPT, intentUserPrompt } from "./prompts";
import { prototypeNotice } from "./llmClient";
import { validateCeoIntent, type CeoIntentResult, type CeoRequestType } from "./schemas";

function normalize(input: string) {
  return input.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function languageOf(input: string): CeoIntentResult["language"] {
  const lower = normalize(input);
  if (/\b(je|veux|pour|compagnie|entreprise|site|gerer|créer|creer)\b/.test(lower)) return "fr";
  if (/\b(i|want|for|company|build|create|manage)\b/.test(lower)) return "en";
  return "unknown";
}

function detectRequestType(input: string): CeoRequestType {
  const lower = normalize(input);
  if (/\bsaas\b|software as a service|logiciel/.test(lower)) return "saas";
  if (/site web|site internet|website|landing page|page web|page d'accueil|homepage|web page|cree une page|crée une page/.test(lower)) return "website";
  if (/\blogo\b/.test(lower)) return "logo";
  if (/branding|identite visuelle|charte|marque|plus premium|plus sportif|plus moderne|plus elegant|style plus/.test(lower)) return "branding";
  if (/\bapp\b|application mobile|ios|android/.test(lower)) return "app";
  if (/automation|automatisation|workflow|zapier|processus/.test(lower)) return "automation";
  if (/business|compagnie|entreprise|startup|commerce/.test(lower)) return "business";
  return "unknown";
}

function inferIndustry(input: string, brandName: string | null): string {
  const lower = normalize(`${input} ${brandName ?? ""}`);
  if (/elevio|elevateur|elevator|ascenseur|monte[- ]?charge|hoist|lift|vertical/.test(lower)) return "elevator";
  if (/gym|gyms|fitness|entrainement|coachs?|abonnement/.test(lower)) return "fitness";
  if (/photo|photographie|photographe|camera/.test(lower)) return "photography";
  if (/construction|chantier|contracteur|batiment/.test(lower)) return "construction";
  if (/restaurant|cafe|bistro|food/.test(lower)) return "restaurant";
  if (/vetement|vêtements|fashion|mode/.test(lower)) return "fashion";
  if (/linge|apparel|clothing/.test(lower)) return "fashion";
  return "unknown";
}

function extractProjectName(input: string, requestType: CeoRequestType, industry: string): string | null {
  const lower = normalize(input);
  const explicit = input.match(/(?:projet|project|app|saas|site)\s+(?:nomme|nommé|called|qui s['’]?appelle)\s+([A-Za-z0-9À-ÿ][A-Za-z0-9À-ÿ&\- ]{1,48})/i)?.[1]?.trim();
  if (explicit) return explicit.replace(/[.,;!?]$/, "");
  if (requestType === "saas" && industry === "fitness") return "Gym management SaaS";
  if (requestType === "website" && industry !== "unknown") return `Site web ${industry}`;
  if (requestType === "app" && industry !== "unknown") return `${industry} app`;
  if (requestType === "automation" && lower.includes("crm")) return "CRM automation workflow";
  return null;
}

function coreFeaturesFor(requestType: CeoRequestType, industry: string): string[] {
  if (requestType === "saas" && industry === "fitness") {
    return ["membres", "abonnements", "horaires", "coachs", "paiements", "dashboard"];
  }
  if (requestType === "website") return ["sitemap", "page accueil", "sections contenu", "CTA", "formulaire contact", "responsive"];
  if (requestType === "app") return ["authentification", "onboarding", "navigation", "données utilisateur", "notifications"];
  if (requestType === "automation") return ["déclencheurs", "actions", "validation", "journal d'exécution"];
  if (requestType === "logo" || requestType === "branding") return ["brief de marque", "concepts visuels", "palette", "typographie", "recommandations"];
  return [];
}

function goalFor(requestType: CeoRequestType, brandName: string | null, projectName: string | null) {
  if (requestType === "logo") return `Créer une identité/logo pour ${brandName ? `la marque ${brandName}` : "la marque"}`;
  if (requestType === "branding") return `Créer une direction de marque structurée${brandName ? ` pour ${brandName}` : ""}`;
  if (requestType === "saas") return `Créer un SaaS concret${projectName ? `: ${projectName}` : ""}`;
  if (requestType === "website") return "Créer un site web concret avec structure, contenu et pages";
  if (requestType === "app") return "Créer une application concrète avec parcours utilisateur et écrans";
  if (requestType === "automation") return "Créer un workflow automatisé traçable";
  if (requestType === "business") return "Structurer une entreprise et ses premiers projets";
  return "Clarifier la demande et proposer une prochaine action";
}

export function inferCeoIntentFallback(input: string): CeoIntentResult {
  const requestType = detectRequestType(input);
  const brandBrief = generateBrandBrief(input);
  const brandName = brandBrief.explicitBrandName ? brandBrief.brandName : null;
  const industry = inferIndustry(input, brandName);
  const projectName = extractProjectName(input, requestType, industry);
  const coreFeatures = coreFeaturesFor(requestType, industry);
  const missingQuestions = requestType === "unknown"
    ? ["Quel type de résultat veux-tu créer: SaaS, site, app, branding, logo ou workflow?"]
    : [];

  return {
    requestType,
    brandName,
    projectName,
    industry,
    targetUser: industry === "fitness" ? "gestionnaires de gyms, coachs et membres" : "unknown",
    goal: goalFor(requestType, brandName, projectName),
    constraints: [],
    language: languageOf(input),
    confidence: requestType === "unknown" ? 0.35 : brandName || projectName || industry !== "unknown" ? 0.82 : 0.68,
    missingQuestions,
    coreFeatures,
    mode: "prototype",
    prototypeNotice: prototypeNotice(),
  };
}

export async function analyzeCeoIntent(input: string): Promise<CeoIntentResult> {
  const fallback = inferCeoIntentFallback(input);
  const generated = await generateStructuredObject(
    {
      system: STRUCTURED_CEO_INTENT_PROMPT,
      user: intentUserPrompt(input),
      purpose: "CEO structured intent extraction",
    },
    fallback,
    validateCeoIntent,
  );

  return {
    ...generated.value,
    mode: generated.mode,
    prototypeNotice: generated.mode === "prototype" ? prototypeNotice() : undefined,
  };
}
