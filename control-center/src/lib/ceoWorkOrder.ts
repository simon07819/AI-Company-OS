import { generateBrandBrief } from "@/lib/brand-builder";

export type CeoDeliverableType = "logo" | "landing_page" | "website" | "saas" | "app" | "business-system" | "unknown";
export type CeoVisibleKind = "logo" | "website_preview" | "product_preview" | "unknown";

export interface CeoWorkOrder {
  turnId: string;
  originalPrompt: string;
  requestType: "branding" | "website" | "saas" | "app" | "business-system" | "unknown";
  deliverableType: CeoDeliverableType;
  visibleKind: CeoVisibleKind;
  brandName: string | null;
  assetRequests: string[];
  style?: string;
  contentMode?: "temporary" | "real";
  industry?: string;
  shouldReusePreviousLogo: boolean;
}

export interface PreviousDeliverable {
  deliverableType?: string | null;
  primaryVisual?: string | null;
  primaryArtifactFingerprint?: string | null;
  brandName?: string | null;
}

function normalize(input: string) {
  return input.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function turnIdFrom(input: string) {
  const base = normalize(input).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48);
  return `turn-${base || "ai-company"}-${Date.now().toString(36)}`;
}

function isWebsitePrompt(lower: string) {
  return /site web|site internet|website|landing|landing page|page web|page d'accueil|homepage|web page|cree une page|crée une page|je veux une page web|fais-moi un site|fais moi un site/.test(lower);
}

function isLogoPrompt(lower: string) {
  return /\blogo\b|identite visuelle|branding|charte/.test(lower);
}

function isModificationPrompt(lower: string) {
  return /(modifie|modifier|change|changer|variante|reprends|reprendre|le meme|le même|celui-la|celui là|ce logo|mets-le|met le|agrandis|raffine|ameliore|améliore|fond noir|en noir|plus sportif|plus moderne)/.test(lower);
}

function inferStyle(lower: string) {
  if (/simple|minimal|minimaliste/.test(lower)) return "simple";
  if (/premium|haut de gamme|luxe/.test(lower)) return "premium";
  if (/sportif|sport|performance/.test(lower)) return "sportif";
  return undefined;
}

function inferIndustry(lower: string) {
  if (/linge|vetement|vêtement|apparel|clothing|mode|fashion/.test(lower)) return "apparel";
  if (/construction|chantier|contracteur|batiment|bâtiment/.test(lower)) return "construction";
  if (/photo|photographe|photographie|camera/.test(lower)) return "photography";
  return undefined;
}

export function createWorkOrderFromPrompt(userPrompt: string, previousDeliverable?: PreviousDeliverable | null): CeoWorkOrder {
  const lower = normalize(userPrompt);
  const modification = isModificationPrompt(lower);
  const brandBrief = generateBrandBrief(userPrompt);
  const extractedBrandName = brandBrief.explicitBrandName
    ? /^[a-z0-9]+$/.test(brandBrief.brandName) ? brandBrief.brandName.toUpperCase() : brandBrief.brandName
    : null;
  const brandName = modification && previousDeliverable?.brandName
    ? previousDeliverable.brandName
    : extractedBrandName;
  const website = isWebsitePrompt(lower);
  const logo = isLogoPrompt(lower);
  const assetRequests = logo && website ? ["logo"] : [];
  const contentMode = /temporaire|placeholder|faux contenu|contenu temporaire|lorem/.test(lower) ? "temporary" : undefined;
  const explicitDeliverableType: CeoDeliverableType = website
    ? lower.includes("landing") || lower.includes("page web") || lower.includes("page d'accueil")
      ? "landing_page"
      : "website"
    : logo
      ? "logo"
      : /\bsaas\b|logiciel/.test(lower)
        ? "saas"
        : /\bapp\b|application/.test(lower)
          ? "app"
          : /automation|automatisation|workflow|systeme|système/.test(lower)
            ? "business-system"
            : "unknown";
  const deliverableType = (explicitDeliverableType === "unknown" || (modification && !website && !logo)) && previousDeliverable?.deliverableType
    ? previousDeliverable.deliverableType as CeoDeliverableType
    : explicitDeliverableType;
  const requestType = deliverableType === "landing_page" || deliverableType === "website"
    ? "website"
    : deliverableType === "logo"
      ? "branding"
      : deliverableType === "saas" || deliverableType === "app" || deliverableType === "business-system"
        ? deliverableType
        : "unknown";
  const visibleKind = requestType === "website" ? "website_preview" : deliverableType === "logo" ? "logo" : requestType === "unknown" ? "unknown" : "product_preview";
  const shouldReusePreviousLogo = shouldReusePreviousDeliverable({ prompt: userPrompt, deliverableType }, previousDeliverable);

  return {
    turnId: turnIdFrom(userPrompt),
    originalPrompt: userPrompt,
    requestType,
    deliverableType,
    visibleKind,
    brandName,
    assetRequests,
    style: inferStyle(lower),
    contentMode,
    industry: inferIndustry(lower),
    shouldReusePreviousLogo,
  };
}

export function shouldReusePreviousDeliverable(
  current: { prompt: string; deliverableType: CeoDeliverableType },
  previous?: PreviousDeliverable | null,
) {
  if (!previous?.deliverableType) return false;
  const lower = normalize(current.prompt);
  if (!isModificationPrompt(lower)) return false;
  if (current.deliverableType !== previous.deliverableType) return false;
  return true;
}
