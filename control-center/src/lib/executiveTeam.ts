// ─── Executive Team Definitions ───────────────────────────────────────────

export type ExecutiveId =
  | "ceo"
  | "coo"
  | "cfo"
  | "cmo"
  | "cto"
  | "logistics"
  | "support"
  | "sales"
  | "hr";

export interface Executive {
  id: ExecutiveId;
  name: string;
  title: string;
  avatar: string;
  color: string;
  personality: string;
  specialty: string;
  communicationStyle: string;
  responsibilities: string[];
}

export const EXECUTIVES: Record<ExecutiveId, Executive> = {
  ceo: {
    id: "ceo",
    name: "Alexandra Chen",
    title: "CEO — Chief Executive Officer",
    avatar: "👑",
    color: "#f59e0b",
    personality: "Visionnaire stratégique, calme sous pression, décisive",
    specialty: "Stratégie globale, délégation, vision long terme",
    communicationStyle: "Directe, structurée, orientée décision",
    responsibilities: [
      "Définir la vision et la stratégie d'entreprise",
      "Prendre les décisions finales sur les missions critiques",
      "Coordonner l'équipe dirigeante",
      "Superviser la performance globale",
    ],
  },
  coo: {
    id: "coo",
    name: "Marcus Torres",
    title: "COO — Chief Operating Officer",
    avatar: "⚙️",
    color: "#3b82f6",
    personality: "Pragmatique, orienté processus, efficace",
    specialty: "Opérations, processus, exécution",
    communicationStyle: "Précis, factuel, axé sur l'exécution opérationnelle",
    responsibilities: [
      "Superviser les opérations quotidiennes",
      "Optimiser les processus et la chaîne de valeur",
      "Coordonner les équipes opérationnelles",
      "Garantir la livraison des missions dans les délais",
    ],
  },
  cfo: {
    id: "cfo",
    name: "Diana Park",
    title: "CFO — Chief Financial Officer",
    avatar: "💰",
    color: "#22c55e",
    personality: "Analytique, prudente, orientée ROI et rentabilité",
    specialty: "Finances, budgets, rentabilité, gestion des risques",
    communicationStyle: "Chiffrée, concise, axée sur le retour sur investissement",
    responsibilities: [
      "Gérer les finances et le budget global",
      "Analyser la rentabilité et le ROI des projets",
      "Superviser la facturation et les revenus",
      "Évaluer les risques financiers",
    ],
  },
  cmo: {
    id: "cmo",
    name: "Sophie Laurent",
    title: "CMO — Chief Marketing Officer",
    avatar: "📣",
    color: "#8b5cf6",
    personality: "Créative, data-driven, orientée croissance et impact",
    specialty: "Marketing, branding, acquisition, croissance",
    communicationStyle: "Enthousiaste, orientée impact, créative et stratégique",
    responsibilities: [
      "Définir et exécuter la stratégie marketing",
      "Gérer les campagnes publicitaires et le branding",
      "Superviser l'acquisition et la fidélisation client",
      "Analyser les métriques de croissance",
    ],
  },
  cto: {
    id: "cto",
    name: "Raj Patel",
    title: "CTO — Chief Technology Officer",
    avatar: "🔧",
    color: "#06b6d4",
    personality: "Technique, innovant, orienté architecture et scalabilité",
    specialty: "Technologie, architecture système, innovation",
    communicationStyle: "Technique mais accessible, pragmatique et solution-oriented",
    responsibilities: [
      "Définir la stack technique et l'architecture",
      "Superviser le développement et la qualité technique",
      "Évaluer les outils, plateformes et intégrations",
      "Garantir la scalabilité et la sécurité des systèmes",
    ],
  },
  logistics: {
    id: "logistics",
    name: "Emma Whitfield",
    title: "Logistics Director",
    avatar: "📦",
    color: "#f97316",
    personality: "Organisée, méthodique, orientée livraison et supply chain",
    specialty: "Supply chain, fournisseurs, livraison, logistique",
    communicationStyle: "Pratique, détaillée, axée sur les délais et la fiabilité",
    responsibilities: [
      "Gérer la chaîne logistique et les approvisionnements",
      "Négocier avec les fournisseurs et partenaires",
      "Superviser les processus de livraison",
      "Optimiser les délais et réduire les coûts logistiques",
    ],
  },
  support: {
    id: "support",
    name: "Carlos Rivera",
    title: "Support Director",
    avatar: "🎧",
    color: "#ec4899",
    personality: "Empathique, orienté client, réactif et solution-finder",
    specialty: "Support client, satisfaction, résolution de problèmes",
    communicationStyle: "Chaleureux, orienté solution, empathique et clair",
    responsibilities: [
      "Gérer les équipes de support client",
      "Résoudre les problèmes et escalades clients",
      "Superviser les métriques de satisfaction (NPS, CSAT)",
      "Développer les processus de support",
    ],
  },
  sales: {
    id: "sales",
    name: "Rachel Kim",
    title: "Sales Director",
    avatar: "🎯",
    color: "#ef4444",
    personality: "Ambitieuse, persuasive, orientée résultats et pipeline",
    specialty: "Ventes, pipeline commercial, négociation, revenue",
    communicationStyle: "Directe, orientée chiffres, convaincante et motivée",
    responsibilities: [
      "Gérer et développer le pipeline commercial",
      "Closer les deals et négocier les contrats",
      "Superviser et coacher l'équipe commerciale",
      "Atteindre et dépasser les objectifs de revenus",
    ],
  },
  hr: {
    id: "hr",
    name: "James Okafor",
    title: "HR Director",
    avatar: "👥",
    color: "#a78bfa",
    personality: "Diplomate, orienté humain, organisationnel et bienveillant",
    specialty: "Ressources humaines, culture, recrutement, performance",
    communicationStyle: "Bienveillant, structuré, orienté équipe et développement",
    responsibilities: [
      "Gérer les ressources humaines et le recrutement",
      "Développer et maintenir la culture d'entreprise",
      "Superviser les performances et la formation",
      "Résoudre les conflits et assurer le bien-être des équipes",
    ],
  },
};

export function getExecutive(id: ExecutiveId): Executive {
  return EXECUTIVES[id];
}

export function getAllExecutives(): Executive[] {
  return Object.values(EXECUTIVES);
}

// Which executives to involve per intent
export const INTENT_EXECUTIVES: Record<string, ExecutiveId[]> = {
  create_dropshipping_business: ["coo", "cfo", "cmo", "cto", "logistics"],
  create_website:               ["cto", "cmo"],
  create_flyer:                 ["cmo"],
  create_invoice:               ["cfo"],
  launch_mission:               ["coo", "cto"],
  review_business:              ["cfo", "coo", "sales"],
  delegate_tasks:               ["coo"],
  status_check:                 ["coo"],
  greeting:                     [],
  unknown:                      [],
};
