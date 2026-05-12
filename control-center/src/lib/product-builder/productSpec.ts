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
  if (input.requestType === "saas" && /clinique|clinic|patient|rendez[- ]?vous|appointment|praticien|doctor|medecin|médecin/.test(text)) return "Clinic appointments SaaS";
  if (input.requestType === "saas" && /immobilier|real estate|propriet|propriété|visite|contrat|courtier/.test(text)) return "Real estate operations SaaS";
  if (input.requestType === "saas" && /e-?commerce|boutique|produit|commande|revenu|shop/.test(text)) return "E-commerce operations SaaS";
  if (input.requestType === "website" && /restaurant|cafe|bistro/.test(text)) return "Restaurant website";
  if (input.requestType === "website" && /construction|contractor|building|renovation|chantier|entrepreneur/.test(text)) return "Construction website";
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
  const domain = inferDomain(input);
  if (input.requestType === "website" && domain === "construction") {
    return ["projets réalisés", "services construction", "preuves terrain", "soumission", "processus", "contact"];
  }
  if (input.coreFeatures?.length && input.coreFeatures.length >= 4) return input.coreFeatures;
  if (input.requestType === "saas" && domain === "clinic") {
    return ["patients", "rendez-vous", "praticiens", "facturation", "disponibilités", "tableau de bord"];
  }
  if (input.requestType === "saas" && domain === "real-estate") {
    return ["propriétés", "clients", "visites", "contrats", "pipeline", "tableau de bord"];
  }
  if (input.requestType === "saas" && domain === "ecommerce") {
    return ["produits", "commandes", "clients", "revenus", "inventaire", "tableau de bord"];
  }
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
  const domain = inferDomain(input);
  if (domain === "fitness") return "gestionnaires de gyms, coachs et membres";
  if (domain === "clinic") return "réceptionnistes, gestionnaires de clinique, praticiens et patients";
  if (domain === "real-estate") return "courtiers, équipes immobilières, clients acheteurs et vendeurs";
  if (domain === "ecommerce") return "opérateurs e-commerce, support client et gestionnaires de revenus";
  if (domain === "restaurant") return "clients locaux et gestionnaires de restaurant";
  if (domain === "construction") return "propriétaires, promoteurs, gestionnaires immobiliers et clients commerciaux";
  return "utilisateurs et opérateurs du futur produit";
}

export function inferDomain(input: ProductBuilderInput): string {
  const industry = clean(input.industry);
  if (/clinic|health|medical|clinique|sant/.test(industry)) return "clinic";
  if (/fitness|gym/.test(industry)) return "fitness";
  if (/real estate|immobilier/.test(industry)) return "real-estate";
  if (/ecommerce|commerce|shop/.test(industry)) return "ecommerce";
  if (/restaurant/.test(industry)) return "restaurant";
  if (/construction|contractor|building|renovation|chantier|entrepreneur/.test(industry)) return "construction";
  const text = input.requestText.toLowerCase();
  if (/gym|fitness/.test(text)) return "fitness";
  if (/clinique|clinic|patient|rendez[- ]?vous|appointment|praticien|doctor|medecin|médecin|santé|sante/.test(text)) return "clinic";
  if (/immobilier|real estate|propriet|propriété|visite|contrat|courtier/.test(text)) return "real-estate";
  if (/e-?commerce|boutique|produit|commande|revenu|shop/.test(text)) return "ecommerce";
  if (/restaurant|cafe|bistro/.test(text)) return "restaurant";
  if (/construction|contractor|building|renovation|chantier|entrepreneur/.test(text)) return "construction";
  if (/photo|photograph|camera/.test(text)) return "photography";
  return "general business";
}

function inferIndustry(input: ProductBuilderInput) {
  const industry = clean(input.industry);
  if (industry && industry !== "unknown") return industry;
  return inferDomain(input);
}

export function createProductSpec(input: ProductBuilderInput): ProductSpec {
  const name = inferName(input);
  const goal = clean(input.goal) || `Créer un ${labelForKind(input.requestType).toLowerCase()} concret avec des artifacts traçables.`;
  return {
    slug: slugify(name),
    kind: input.requestType,
    name,
    domain: inferDomain(input),
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
