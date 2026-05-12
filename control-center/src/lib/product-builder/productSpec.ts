import type { ProductBuilderInput, ProductKind, ProductSpec } from "./types";

const DEFAULT_NOTICE = "Prototype produit: fichiers locaux générés pour cadrer et tester le projet. Aucun déploiement ni génération d'image finale n'est prétendu.";

function clean(value: string | null | undefined) {
  return (value ?? "").trim();
}

export function slugify(value: string): string {
  const slug = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);
  return slug || "ai-company-project";
}

function titleCase(value: string) {
  return value
    .split(/[\s-_]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function inferName(input: ProductBuilderInput): string {
  const explicit = clean(input.projectName) || clean(input.brandName);
  if (explicit) return explicit;

  const text = input.requestText.toLowerCase();
  if (input.requestType === "saas" && /gym|fitness|coach|abonnement/.test(text)) return "Gym management SaaS";
  if (input.requestType === "website" && /restaurant|cafe|bistro/.test(text)) return "Restaurant website";
  if (input.requestType === "app" && /gym|fitness/.test(text)) return "Fitness mobile app";

  const industry = clean(input.industry);
  if (industry && industry !== "unknown") return `${titleCase(industry)} ${labelForKind(input.requestType)}`;
  return `AI Company ${labelForKind(input.requestType)}`;
}

function labelForKind(kind: ProductKind) {
  if (kind === "saas") return "SaaS";
  if (kind === "website") return "Website";
  return "App";
}

function inferFeatures(input: ProductBuilderInput): string[] {
  if (input.coreFeatures?.length) return input.coreFeatures;
  const text = input.requestText.toLowerCase();
  if (input.requestType === "saas" && /gym|fitness/.test(text)) {
    return ["membres", "abonnements", "horaires", "coachs", "paiements", "dashboard"];
  }
  if (input.requestType === "website") return ["page accueil", "pages contenu", "CTA", "formulaire contact", "responsive"];
  return ["onboarding", "navigation", "écrans principaux", "données locales", "prototype interactif"];
}

function inferTargetUser(input: ProductBuilderInput) {
  const target = clean(input.targetUser);
  if (target && target !== "unknown") return target;
  const text = input.requestText.toLowerCase();
  if (/gym|fitness/.test(text)) return "gestionnaires de gyms, coachs et membres";
  if (/restaurant|cafe|bistro/.test(text)) return "clients locaux et gestionnaires de restaurant";
  return "utilisateurs et opérateurs du futur produit";
}

function inferIndustry(input: ProductBuilderInput) {
  const industry = clean(input.industry);
  if (industry && industry !== "unknown") return industry;
  const text = input.requestText.toLowerCase();
  if (/gym|fitness/.test(text)) return "fitness";
  if (/restaurant|cafe|bistro/.test(text)) return "restaurant";
  if (/photo|photograph|camera/.test(text)) return "photography";
  return "general business";
}

export function createProductSpec(input: ProductBuilderInput): ProductSpec {
  const name = inferName(input);
  const goal = clean(input.goal) || `Créer un ${labelForKind(input.requestType).toLowerCase()} concret avec des artifacts traçables.`;
  return {
    slug: slugify(name),
    kind: input.requestType,
    name,
    industry: inferIndustry(input),
    targetUser: inferTargetUser(input),
    goal,
    constraints: input.constraints ?? [],
    coreFeatures: inferFeatures(input),
    language: input.language ?? "fr",
    prototypeNotice: DEFAULT_NOTICE,
    createdAt: new Date().toISOString(),
  };
}
