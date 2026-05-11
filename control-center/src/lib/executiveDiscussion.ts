import fs from "fs";
import path from "path";
import {
  type ExecutiveId,
  INTENT_EXECUTIVES,
} from "./executiveTeam";

// ─── Types ────────────────────────────────────────────────────────────────

export type DiscussionMessageType =
  | "opening"
  | "delegation"
  | "analysis"
  | "debate"
  | "agreement"
  | "synthesis"
  | "proposal"
  | "question"
  | "clarification";

export interface DiscussionMessage {
  id: string;
  from: ExecutiveId;
  to?: ExecutiveId | "all";
  text: string;
  type: DiscussionMessageType;
  timestamp: string;
  delayMs: number;
}

export interface StrategyOption {
  label: string;
  description: string;
  tradeoff: string;
}

export interface ExecutiveProposal {
  headline: string;
  strategy: string;
  estimatedCost: string;
  estimatedTime: string;
  risks: string[];
  roi: string;
  difficulty: "low" | "medium" | "high";
  recommendedApproach: string;
  alternatives: StrategyOption[];
}

export type DiscussionStatus =
  | "thinking"
  | "consulting"
  | "deliberating"
  | "concluded"
  | "awaiting_approval"
  | "approved"
  | "rejected"
  | "revision_requested";

export interface ExecutiveDiscussion {
  id: string;
  userRequest: string;
  intent: string;
  status: DiscussionStatus;
  involvedExecutives: ExecutiveId[];
  messages: DiscussionMessage[];
  proposal?: ExecutiveProposal;
  createdAt: string;
  updatedAt: string;
}

// ─── Persistence ──────────────────────────────────────────────────────────

const REPO_ROOT = process.cwd();
const DATA_DIR = path.join(REPO_ROOT, "data");
const DISCUSSIONS_PATH = path.join(DATA_DIR, "executive-discussions.json");

interface DiscussionStore {
  discussions: ExecutiveDiscussion[];
}

function readStore(): DiscussionStore {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DISCUSSIONS_PATH)) return { discussions: [] };
  try {
    return JSON.parse(fs.readFileSync(DISCUSSIONS_PATH, "utf-8")) as DiscussionStore;
  } catch {
    return { discussions: [] };
  }
}

function writeStore(store: DiscussionStore) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DISCUSSIONS_PATH, JSON.stringify(store, null, 2) + "\n", "utf-8");
}

let _idBase = Date.now();
function nextId(prefix: string): string {
  return `${prefix}-${(_idBase++).toString(36)}`;
}

// ─── Discussion Message Templates ─────────────────────────────────────────

function buildMessages(intent: string, userText: string): DiscussionMessage[] {
  const now = Date.now();
  let cumulativeDelay = 0;
  const MSG_INTERVAL = 2000;

  const msg = (
    from: ExecutiveId,
    text: string,
    type: DiscussionMessageType,
    to?: ExecutiveId | "all",
  ): DiscussionMessage => {
    cumulativeDelay += MSG_INTERVAL;
    return {
      id: nextId("dm"),
      from,
      to,
      text,
      type,
      timestamp: new Date(now + cumulativeDelay).toISOString(),
      delayMs: cumulativeDelay,
    };
  };

  // ── Dropshipping ──
  if (intent === "create_dropshipping_business") {
    return [
      msg("ceo", `Team, priority request received: "${userText.slice(0, 60)}". I'm calling an immediate strategy session. Marcus, Diana, Sophie, Raj, Emma — I need your full analysis.`, "delegation", "all"),
      msg("coo", "I've reviewed our operational baseline. We can stand up a dropshipping workflow in 2–3 weeks. Recommend starting with a single niche, 10–15 hero products, then expanding. I'll own the process mapping.", "analysis", "ceo"),
      msg("logistics", "I can vet 5 AliExpress/CJ Dropshipping suppliers within 48 hours and negotiate priority shipping. Targeting <15 day delivery to US/EU. Main risk: quality consistency — I'll require sample orders before launch.", "analysis", "ceo"),
      msg("cfo", "Financial model: Shopify Basic $29/mo, domain $15, DSers $0 (free tier), initial ad budget $500. Month 1 total cost ≈ $544. Break-even at ~$1,100 monthly revenue assuming 3.2% conversion. Achievable by month 2–3.", "analysis", "ceo"),
      msg("cmo", "Strong market opportunity. Winning niches right now: pet accessories, home organization, fitness micro-gear. TikTok ads + UGC content outperforming Meta by 35%. I'll launch a $500 test split across 3 audiences and optimize from day 3.", "analysis", "ceo"),
      msg("cto", "Tech stack recommendation: Shopify + DSers for automated order routing + Klaviyo for email flows. Setup time: 3 days for store, 1 day for payment gateway, 1 day for automations. No custom dev required — proven SaaS stack, zero technical debt.", "analysis", "ceo"),
      msg("coo", "One question for Diana: are we allocating the ad budget from existing reserves or do we need a capital injection?", "question", "cfo"),
      msg("cfo", "We have runway. I recommend allocating from Q2 marketing reserves. ROI threshold: $3 return per $1 ad spend within 60 days, or we pivot the niche.", "agreement", "coo"),
      msg("cmo", "Agreed on the ROI threshold. Sophie — I'll have the first creative brief ready for Emma's supplier samples within 24 hours of kickoff.", "agreement", "ceo"),
      msg("ceo", "Clear alignment from the team. Proceeding to formal proposal. This is a green-light recommendation pending your approval.", "synthesis", "all"),
    ];
  }

  // ── Website ──
  if (intent === "create_website") {
    return [
      msg("ceo", `Team, we need to build a website. Request: "${userText.slice(0, 60)}". Raj, Sophie — your assessment.`, "delegation", "all"),
      msg("cto", "I recommend Next.js 14 + Vercel deployment. Build time: 5–10 days depending on complexity. Clean architecture, fast performance, built-in SEO. If it's a landing page only, 3 days. Full multi-page site: 8–10 days.", "analysis", "ceo"),
      msg("cmo", "SEO strategy should be built in from day 1. I'll need the sitemap architecture and meta strategy defined before Raj starts development. Target: top 3 for 3 primary keywords within 90 days.", "analysis", "ceo"),
      msg("cto", "Agreed on SEO-first approach. I'll add structured data, sitemap generation, and Core Web Vitals optimization to the scope from the start. No performance debt.", "agreement", "cmo"),
      msg("ceo", "Good coordination. Raj leads tech, Sophie owns positioning and SEO. I'll formalize the proposal now.", "synthesis", "all"),
    ];
  }

  // ── Flyer ──
  if (intent === "create_flyer") {
    return [
      msg("ceo", `Creative request: flyer needed. "${userText.slice(0, 60)}". Sophie, lead on this.`, "delegation", "cmo"),
      msg("cmo", "On it. I'll design a high-impact A4 flyer with strong headline, clear CTA, and branded visuals. Turnaround: 24–48 hours. I need the key message and target audience confirmed first.", "analysis", "ceo"),
      msg("ceo", "Sophie has this. Fast turnaround, quality first. Proposal incoming.", "synthesis", "all"),
    ];
  }

  // ── Invoice ──
  if (intent === "create_invoice") {
    return [
      msg("ceo", "Diana, invoice creation needed — please handle.", "delegation", "cfo"),
      msg("cfo", "Already on it. I'll generate the invoice with standard Net-30 terms. Once you confirm the client and amount, I'll dispatch immediately. Payment tracking automated.", "analysis", "ceo"),
      msg("ceo", "Diana owns this. Invoice will be ready within minutes.", "synthesis", "all"),
    ];
  }

  // ── Launch Mission ──
  if (intent === "launch_mission") {
    return [
      msg("ceo", `Strategic mission request: "${userText.slice(0, 60)}". Marcus, Raj — rapid assessment.`, "delegation", "all"),
      msg("coo", "I can have the operational framework ready in 24 hours. Define scope, assign agents, set milestones. What's the priority level — standard or critical path?", "analysis", "ceo"),
      msg("cto", "Technical scoping depends on the mission type. If it's a build mission, I'll run architecture planning first — 4–6 hours. Parallel workstreams possible. Estimated delivery: 1–3 weeks.", "analysis", "ceo"),
      msg("coo", "Let's treat it as critical path. I'll mobilize agents immediately upon approval.", "agreement", "ceo"),
      msg("ceo", "Good. Mission framework locked. Ready to launch on your approval.", "synthesis", "all"),
    ];
  }

  // ── Business Review ──
  if (intent === "review_business") {
    return [
      msg("ceo", "Full business review requested. Diana, Marcus, Rachel — comprehensive status.", "delegation", "all"),
      msg("cfo", "Revenue systems are operational. I'll pull the latest P&L, pipeline value, and outstanding invoices. Any red flags will be flagged immediately.", "analysis", "ceo"),
      msg("coo", "Operations are running at normal capacity. I'll compile agent utilization, active missions, and delivery metrics into a single dashboard view.", "analysis", "ceo"),
      msg("sales", "Pipeline health is critical context here. I'll add conversion rates, active deals, and lead velocity to the review. Need the full picture to make good recommendations.", "analysis", "ceo"),
      msg("ceo", "Comprehensive review incoming. All systems being audited.", "synthesis", "all"),
    ];
  }

  // ── Status Check ──
  if (intent === "status_check") {
    return [
      msg("ceo", "Marcus, quick status sweep across all operations.", "delegation", "coo"),
      msg("coo", "On it. Scanning active agents, running missions, and any blockers. Back to you in 30 seconds.", "analysis", "ceo"),
      msg("ceo", "Status report compiling now.", "synthesis", "all"),
    ];
  }

  // ── Delegate ──
  if (intent === "delegate_tasks") {
    return [
      msg("ceo", "Marcus, task delegation needed. Prioritize and assign to available agents.", "delegation", "coo"),
      msg("coo", "Received. I'll audit the current task queue, identify bandwidth by agent, and assign optimally. Expect task assignments within 2 minutes.", "analysis", "ceo"),
      msg("ceo", "Marcus is handling delegation. Queue being optimized now.", "synthesis", "all"),
    ];
  }

  // ── Greeting ──
  if (intent === "greeting") {
    return [
      msg("ceo", "Good to have you. I'm Alexandra Chen, your CEO AI. The executive team is standing by — Marcus (Operations), Diana (Finance), Sophie (Marketing), Raj (Technology), Emma (Logistics), Carlos (Support), Rachel (Sales), James (HR). What's on the agenda?", "opening", "all"),
    ];
  }

  // ── Unknown / Default ──
  return [
    msg("ceo", `I've received your message: "${userText.slice(0, 80)}". I'm analyzing the best approach and will route to the appropriate director. Can you provide more specifics so I can give you a precise recommendation?`, "clarification", "all"),
  ];
}

// ─── Proposal Generation ──────────────────────────────────────────────────

function buildProposal(intent: string): ExecutiveProposal | undefined {
  const proposals: Record<string, ExecutiveProposal> = {
    create_dropshipping_business: {
      headline: "Launch Dropshipping Business",
      strategy: "Lancer une boutique e-commerce dropshipping dans un niche ciblé, avec automatisation complète des commandes et campagnes d'acquisition payante.",
      estimatedCost: "$544 – $1,200 (mois 1)",
      estimatedTime: "3–4 semaines",
      risks: [
        "Qualité produit incohérente des fournisseurs",
        "Délais de livraison longs (10–21 jours)",
        "Saturation du marché dans les niches populaires",
        "ROAS publicitaire volatile",
      ],
      roi: "150–300% en 3–6 mois (estimation)",
      difficulty: "medium",
      recommendedApproach: "Shopify + DSers + TikTok Ads — niche sélectionnée, 10 produits héros, $500 test campaign.",
      alternatives: [
        {
          label: "Bootstrap minimal",
          description: "Gratuit avec WooCommerce + AliExpress, sans paid ads",
          tradeoff: "Croissance plus lente, 6–12 mois pour rentabiliser",
        },
        {
          label: "Marque blanche",
          description: "Produits personnalisés avec logo, meilleure marge",
          tradeoff: "Coût initial plus élevé ($3–8k), mais différenciation forte",
        },
      ],
    },
    create_website: {
      headline: "Création de Site Web",
      strategy: "Développer un site web professionnel optimisé SEO avec stack Next.js moderne, déployé sur Vercel.",
      estimatedCost: "$0 (déploiement) + temps dev",
      estimatedTime: "5–10 jours",
      risks: [
        "Scope creep si les exigences ne sont pas fixées",
        "Délais SEO (3–6 mois pour trafic organique)",
      ],
      roi: "Retour à long terme via trafic organique et conversions",
      difficulty: "medium",
      recommendedApproach: "Next.js 14 + Vercel + SEO-first architecture, Core Web Vitals optimisés dès le départ.",
      alternatives: [
        {
          label: "No-code Webflow",
          description: "Plus rapide (2–3 jours), moins flexible",
          tradeoff: "Limitations techniques pour features avancées",
        },
      ],
    },
    create_flyer: {
      headline: "Création de Flyer",
      strategy: "Design de flyer professionnel A4 avec messaging fort et CTA clair.",
      estimatedCost: "$0 (in-house)",
      estimatedTime: "24–48 heures",
      risks: ["Révisions multiples si le brief est flou"],
      roi: "Impact marketing direct sur l'audience cible",
      difficulty: "low",
      recommendedApproach: "Brief précis → design CMO → révision rapide → finalisation.",
      alternatives: [],
    },
    create_invoice: {
      headline: "Génération de Facture",
      strategy: "Créer et envoyer une facture professionnelle avec suivi de paiement automatisé.",
      estimatedCost: "$0",
      estimatedTime: "< 5 minutes",
      risks: ["Retard de paiement si Net-30 mal suivi"],
      roi: "Encaissement immédiat + tracking automatisé",
      difficulty: "low",
      recommendedApproach: "Facture générée automatiquement, Net-30, relance automatique à J+15 et J+30.",
      alternatives: [],
    },
    launch_mission: {
      headline: "Lancement de Mission",
      strategy: "Démarrer une nouvelle mission avec équipe d'agents dédiée et timeline structurée.",
      estimatedCost: "Selon scope de la mission",
      estimatedTime: "1–3 semaines",
      risks: ["Dépendances externes", "Blocages techniques inattendus"],
      roi: "Livrable client ou capability interne générée",
      difficulty: "medium",
      recommendedApproach: "Scope défini → agents assignés → phases planifiées → livrables validés.",
      alternatives: [],
    },
  };

  return proposals[intent];
}

// ─── Public API ───────────────────────────────────────────────────────────

export function createDiscussion(userRequest: string, intent: string): ExecutiveDiscussion {
  const store = readStore();
  const involvedExecutives: ExecutiveId[] = ["ceo", ...(INTENT_EXECUTIVES[intent] ?? [])];
  const messages = buildMessages(intent, userRequest);
  const proposal = buildProposal(intent);
  const now = new Date().toISOString();

  const discussion: ExecutiveDiscussion = {
    id: nextId("disc"),
    userRequest,
    intent,
    status: "awaiting_approval",
    involvedExecutives,
    messages,
    proposal,
    createdAt: now,
    updatedAt: now,
  };

  store.discussions.push(discussion);
  // Keep last 20 discussions
  if (store.discussions.length > 20) {
    store.discussions = store.discussions.slice(-20);
  }
  writeStore(store);
  return discussion;
}

export function getDiscussions(): ExecutiveDiscussion[] {
  return readStore().discussions;
}

export function getLatestDiscussion(): ExecutiveDiscussion | null {
  const store = readStore();
  if (store.discussions.length === 0) return null;
  return store.discussions[store.discussions.length - 1];
}

export function getDiscussionById(id: string): ExecutiveDiscussion | null {
  const store = readStore();
  return store.discussions.find((d) => d.id === id) ?? null;
}

export function updateDiscussionStatus(
  id: string,
  status: DiscussionStatus,
): { ok: boolean } {
  const store = readStore();
  const disc = store.discussions.find((d) => d.id === id);
  if (!disc) return { ok: false };
  disc.status = status;
  disc.updatedAt = new Date().toISOString();
  writeStore(store);
  return { ok: true };
}
