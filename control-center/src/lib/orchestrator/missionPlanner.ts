import { generateBrandBrief } from "@/lib/brand-builder";
import { inferCeoIntentFallback } from "@/lib/ai/ceoIntent";
import { inferDomain } from "@/lib/product-builder/productSpec";
import { routeExperts } from "./expertRouter";
import type { MissionPlan, ProductionRequestType } from "./types";

function idFrom(input: string) {
  const base = input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return `mission-${base || "ai-company"}-${Date.now().toString(36)}`;
}

function normalize(input: string) {
  return input.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function requestTypeFrom(input: string): ProductionRequestType {
  const intent = inferCeoIntentFallback(input);
  if (intent.requestType === "logo" || intent.requestType === "branding") return "branding";
  if (intent.requestType === "saas") return "saas";
  if (intent.requestType === "website") return "website";
  if (intent.requestType === "app") return "app";
  if (intent.requestType === "automation" || intent.requestType === "business") return "business-system";
  return "unknown";
}

function industryFor(input: string, requestType: ProductionRequestType) {
  const lower = normalize(input);
  if (/sport|sportif|athlet|performance|fitness|gym|entrainement/.test(lower)) return "sport/performance";
  if (requestType === "branding") return generateBrandBrief(input).industry;
  const domain = inferDomain({ requestText: input, requestType: requestType === "website" ? "website" : requestType === "app" ? "app" : "saas" });
  return domain === "general business" ? "unknown" : domain;
}

function audienceFor(requestType: ProductionRequestType, industry: string) {
  if (industry === "sport/performance") return "clients actifs, équipes sportives, coachs et marques orientées performance";
  if (industry === "clinic") return "patients, réceptionnistes, praticiens et gestionnaires de clinique";
  if (industry === "construction") return "clients commerciaux, propriétaires, promoteurs et équipes terrain";
  if (requestType === "branding") return "clients de la marque et décideurs qui doivent comprendre la valeur en quelques secondes";
  if (requestType === "saas") return "opérateurs métier et utilisateurs quotidiens du produit";
  if (requestType === "website") return "visiteurs qualifiés et prospects à convertir";
  return "utilisateurs et décideurs du projet";
}

function successCriteriaFor(requestType: ProductionRequestType, brandName?: string | null) {
  if (requestType === "branding") {
    return [
      brandName ? `Le nom ${brandName} est respecté dans tous les concepts.` : "Le nom de marque est clarifié.",
      "Au moins trois directions visuelles distinctes sont produites.",
      "Chaque direction inclut palette, typographie, justification et prototype visuel.",
      "Les concepts génériques ou trop similaires sont rejetés avant sélection.",
    ];
  }
  if (requestType === "saas") {
    return [
      "Le domaine demandé se reflète dans les routes, données mockées et écrans.",
      "Un starter Next.js réel est créé.",
      "Les artifacts essentiels existent et sont listés.",
      "Le projet n'est pas marqué prêt sans fichiers réels.",
    ];
  }
  if (requestType === "website") {
    return [
      "Le contenu et la structure reflètent le secteur demandé.",
      "Une direction design et des pages concrètes sont créées.",
      "Les artifacts essentiels existent et sont listés.",
    ];
  }
  return ["La demande est structurée.", "Les artifacts requis sont explicités.", "Aucun succès n'est annoncé sans artifact."];
}

function requirementsFor(requestType: ProductionRequestType) {
  if (requestType === "branding") return ["brand-brief.json", "brand-directions.json", "logo-concept-a.svg", "logo-concept-b.svg", "logo-concept-c.svg", "artifact-manifest.json", "quality-report.json"];
  if (requestType === "saas" || requestType === "website" || requestType === "app") return ["README.md", "product-spec.json", "app-map.md", "next-app/package.json", "artifact-manifest.json", "quality-report.json"];
  return ["artifact-manifest.json", "quality-report.json"];
}

function isLogoRequest(input: string) {
  return /\blogo\b/i.test(input.normalize("NFD").replace(/[\u0300-\u036f]/g, ""));
}

export function createMissionPlan(input: string): MissionPlan {
  const requestType = requestTypeFrom(input);
  const intent = inferCeoIntentFallback(input);
  const brandBrief = generateBrandBrief(input);
  const brandName = brandBrief.explicitBrandName ? brandBrief.brandName : intent.brandName;
  const industry = industryFor(input, requestType);
  const projectName = intent.projectName ?? (brandName ? (isLogoRequest(input) ? `Logo ${brandName}` : `${brandName} brand system`) : null);
  return {
    id: idFrom(input),
    requestType,
    userGoal: intent.goal || input,
    brandName,
    projectName,
    industry,
    audience: audienceFor(requestType, industry),
    requiredExperts: routeExperts(requestType),
    successCriteria: successCriteriaFor(requestType, brandName),
    artifactRequirements: requirementsFor(requestType),
    minimumQualityScore: requestType === "branding" ? 82 : 78,
    sourcePrompt: input,
    createdAt: new Date().toISOString(),
  };
}
