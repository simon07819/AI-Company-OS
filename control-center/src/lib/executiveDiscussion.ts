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

// Multiple variants per intent to avoid repetition
type MsgVariants = Array<Array<Parameters<ReturnType<typeof makeMessageBuilder>>>>;

function makeMessageBuilder(now: number) {
  let cumulativeDelay = 0;
  const MSG_INTERVAL = 2000;

  return (
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
}

const _lastVariant: Record<string, number> = {};

function pickVariant<T>(intent: string, variants: T[][]): T[] {
  if (variants.length === 1) return variants[0];
  const last = _lastVariant[intent] ?? -1;
  let idx: number;
  do { idx = Math.floor(Math.random() * variants.length); }
  while (idx === last && variants.length > 1);
  _lastVariant[intent] = idx;
  return variants[idx];
}

function buildMessages(intent: string, userText: string): DiscussionMessage[] {
  const now = Date.now();
  const msg = makeMessageBuilder(now);
  const short = userText.slice(0, 60);

  // ── Dropshipping ──
  if (intent === "create_dropshipping_business") {
    const variants = [
      [
        msg("ceo", `Team, priority request: "${short}". Strategy session now. Marcus, Diana, Sophie, Raj, Emma — full analysis needed.`, "delegation", "all"),
        msg("coo", "Operational baseline reviewed. Dropshipping workflow: 2–3 weeks. Recommend single niche, 10–15 hero products to start. I'll own process mapping.", "analysis", "ceo"),
        msg("logistics", "I'll vet 5 AliExpress/CJ Dropshipping suppliers in 48h and negotiate priority shipping. Target: <15 day delivery to US/EU. Requiring sample orders before launch.", "analysis", "ceo"),
        msg("cfo", "Month 1 cost: Shopify $29 + domain $15 + DSers free + $500 ads = $544 total. Break-even at ~$1,100 revenue (3.2% conversion). Achievable by month 2–3.", "analysis", "ceo"),
        msg("cmo", "Hot niches right now: pet accessories, home organization, fitness micro-gear. TikTok + UGC outperforming Meta by 35%. I'll run a $500 3-audience test from day 1.", "analysis", "ceo"),
        msg("cto", "Stack: Shopify + DSers (automated order routing) + Klaviyo (email flows). 5 days total setup. Zero custom dev — proven SaaS stack.", "analysis", "ceo"),
        msg("coo", "Diana — ad budget from Q2 reserves or do we need a capital injection?", "question", "cfo"),
        msg("cfo", "We have runway. Allocate from Q2 marketing. ROI gate: $3 return per $1 ad spend within 60 days, otherwise we pivot niche.", "agreement", "coo"),
        msg("ceo", "Aligned. Proceeding to formal proposal. Green-light recommendation — pending your approval.", "synthesis", "all"),
      ],
      [
        msg("ceo", `New request: "${short}". Emma — lead on supplier research. Sophie — niche analysis. Diana — financial model. Raj — tech stack. Go.`, "delegation", "all"),
        msg("logistics", "I'll shortlist 3 niches with verified AliExpress supplier pools. Criteria: <$20 unit cost, <3 week ship time, >4.5 star rating. Report in 48h.", "analysis", "ceo"),
        msg("cmo", "Niche scoring framework ready. Analyzing: search volume trend, competition density, TikTok organic potential. Will cross-reference Emma's supplier list.", "analysis", "ceo"),
        msg("cfo", "Lean launch budget: $544 Month 1. If we hit 2% conversion on 1,000 visitors, we're at break-even. I'll model 3 scenarios: conservative, base, optimistic.", "analysis", "ceo"),
        msg("cto", "Tech is the easy part here. Shopify handles everything. My recommendation: launch fast, iterate. Don't over-engineer. Store can be live in 72h.", "analysis", "ceo"),
        msg("cmo", "Raj's point is right — speed to market matters here. I need Emma's supplier data to finalize ad creative. How fast can you confirm the niche?", "question", "logistics"),
        msg("logistics", "48 hours on my end. I'll prioritize the top 2 niches so Sophie can start creative before I'm done with all 3.", "agreement", "cmo"),
        msg("ceo", "Good parallel execution. Proposal ready for your review.", "synthesis", "all"),
      ],
    ];
    return pickVariant(intent, variants);
  }

  // ── Website ──
  if (intent === "create_website") {
    const variants = [
      [
        msg("ceo", `Website request: "${short}". Raj, Sophie — your assessment.`, "delegation", "all"),
        msg("cto", "Next.js 14 + Vercel. Landing page: 3 days. Full multi-page site: 8–10 days. SEO-first architecture built in from day 1.", "analysis", "ceo"),
        msg("cmo", "SEO brief needed before dev starts — sitemap, meta strategy, keyword targeting. I can have it ready in 4 hours. Target: top 3 for 3 primary keywords in 90 days.", "analysis", "ceo"),
        msg("cto", "Agreed. I'll wire structured data, sitemap generation, and Core Web Vitals from the jump. No performance debt.", "agreement", "cmo"),
        msg("ceo", "Raj leads tech, Sophie owns positioning and SEO. Proposal incoming.", "synthesis", "all"),
      ],
      [
        msg("ceo", `Site build request: "${short}". What's the fastest path to production?`, "delegation", "all"),
        msg("cto", "Fastest path: Vercel + Next.js scaffold, deploy in 1 day. Full-featured site adds 5–7 days. What's the priority — speed or polish?", "question", "ceo"),
        msg("cmo", "I'd say neither — priority is conversion. Whatever we build needs a clear CTA and SEO foundation. Sophie — I'll need your buyer persona brief upfront.", "debate", "cto"),
        msg("cto", "Fair. I'll reserve a day at the start for Sophie's brief, then we build fast. Total: 5 days to live site.", "agreement", "cmo"),
        msg("ceo", "Speed with intent. 5 days, SEO-first, conversion-optimized. That's the scope.", "synthesis", "all"),
      ],
    ];
    return pickVariant(intent, variants);
  }

  // ── Flyer ──
  if (intent === "create_flyer") {
    const variants = [
      [
        msg("ceo", `Creative request: "${short}". Sophie — lead on this.`, "delegation", "cmo"),
        msg("cmo", "On it. High-impact A4 flyer, strong headline, clear CTA, branded visuals. 24–48h turnaround. Need key message and target audience confirmed.", "analysis", "ceo"),
        msg("ceo", "Sophie has this. Fast, quality first.", "synthesis", "all"),
      ],
      [
        msg("ceo", `Flyer needed: "${short}". Sophie, what's your read?`, "delegation", "cmo"),
        msg("cmo", "Straightforward. Send me the event details and target audience — I'll have a first draft in 24h. If it needs photography, add 1 day for asset sourcing.", "analysis", "ceo"),
        msg("ceo", "Sophie's on it. 24h clock starts when you confirm the brief details.", "synthesis", "all"),
      ],
    ];
    return pickVariant(intent, variants);
  }

  // ── Invoice ──
  if (intent === "create_invoice") {
    const variants = [
      [
        msg("ceo", "Diana — invoice creation needed.", "delegation", "cfo"),
        msg("cfo", "On it. Standard Net-30 terms. Confirm client and amount and I'll dispatch immediately. Payment tracking automated.", "analysis", "ceo"),
        msg("ceo", "Diana owns this. Ready within minutes.", "synthesis", "all"),
      ],
      [
        msg("ceo", "Diana, we need an invoice generated.", "delegation", "cfo"),
        msg("cfo", "Invoice system ready. I'll set up Net-30, automated reminder at day 15 and 30. Send me the client name and amount.", "analysis", "ceo"),
        msg("ceo", "Diana's on it — invoice will be in the Revenue section shortly.", "synthesis", "all"),
      ],
    ];
    return pickVariant(intent, variants);
  }

  // ── Launch Mission ──
  if (intent === "launch_mission") {
    const variants = [
      [
        msg("ceo", `Mission request: "${short}". Marcus, Raj — rapid assessment.`, "delegation", "all"),
        msg("coo", "Operational framework: 24h to define scope, assign agents, set milestones. Priority level — standard or critical path?", "question", "ceo"),
        msg("cto", "Tech scoping: 4–6h for architecture if it's a build mission. Parallel workstreams possible. Delivery: 1–3 weeks.", "analysis", "ceo"),
        msg("coo", "Treating as critical path. Agents mobilized on approval.", "agreement", "ceo"),
        msg("ceo", "Framework locked. Ready to launch on your go.", "synthesis", "all"),
      ],
      [
        msg("ceo", `New mission: "${short}". Marcus — what's the fastest execution path?`, "delegation", "coo"),
        msg("coo", "If we have all requirements, I can have agents running in 2h. The blocker is usually unclear scope. What's the definition of done here?", "question", "ceo"),
        msg("cto", "From tech side — I need 30 minutes to define the architecture. After that, agents can run in parallel. I've done similar scope before.", "analysis", "coo"),
        msg("coo", "Good. Raj handles architecture, I'll coordinate agent assignments. We can be in execution mode in 3h.", "agreement", "ceo"),
        msg("ceo", "Execute. Session is live.", "synthesis", "all"),
      ],
    ];
    return pickVariant(intent, variants);
  }

  // ── Business Review ──
  if (intent === "review_business") {
    const variants = [
      [
        msg("ceo", "Full business review. Diana, Marcus, Rachel — comprehensive status.", "delegation", "all"),
        msg("cfo", "Pulling P&L, pipeline value, and outstanding invoices. Any red flags flagged immediately.", "analysis", "ceo"),
        msg("coo", "Agent utilization, active missions, delivery metrics — compiling now.", "analysis", "ceo"),
        msg("sales", "Adding conversion rates, active deals, and lead velocity. Need full picture for recommendations.", "analysis", "ceo"),
        msg("ceo", "Comprehensive review compiling. All systems audited.", "synthesis", "all"),
      ],
      [
        msg("ceo", "Business health check. Diana leads, Marcus and Rachel support.", "delegation", "all"),
        msg("cfo", "Running financial audit. I'll flag anything that needs immediate attention — margins, burn rate, outstanding receivables.", "analysis", "ceo"),
        msg("coo", "Operations look stable. I'll confirm agent utilization and any mission blockers.", "analysis", "ceo"),
        msg("sales", "Pipeline is healthy. I'll quantify it — deal count, weighted value, velocity compared to last period.", "analysis", "ceo"),
        msg("cfo", "One flag upfront: if outstanding invoices are above 30 days, Rachel and I need to align on a collection strategy.", "debate", "sales"),
        msg("ceo", "Good catch Diana. Rachel — add that to your report. Full review incoming.", "synthesis", "all"),
      ],
    ];
    return pickVariant(intent, variants);
  }

  // ── Status Check ──
  if (intent === "status_check") {
    const variants = [
      [
        msg("ceo", "Marcus, quick status sweep across all operations.", "delegation", "coo"),
        msg("coo", "Scanning active agents, running missions, any blockers. Back in 30 seconds.", "analysis", "ceo"),
        msg("ceo", "Status report compiling.", "synthesis", "all"),
      ],
      [
        msg("ceo", "Status check — Marcus, what's the current operational picture?", "delegation", "coo"),
        msg("coo", "On it. I'll look at agent load, mission progress, and any escalations that need your attention.", "analysis", "ceo"),
        msg("ceo", "Good. Pull everything into one view.", "synthesis", "all"),
      ],
    ];
    return pickVariant(intent, variants);
  }

  // ── Delegate ──
  if (intent === "delegate_tasks") {
    const variants = [
      [
        msg("ceo", "Marcus, task delegation needed. Prioritize and assign to available agents.", "delegation", "coo"),
        msg("coo", "Auditing task queue, identifying bandwidth by agent, assigning optimally. Expect assignments in 2 minutes.", "analysis", "ceo"),
        msg("ceo", "Marcus handling delegation. Queue being optimized.", "synthesis", "all"),
      ],
      [
        msg("ceo", "Marcus — I need the current task queue rebalanced.", "delegation", "coo"),
        msg("coo", "Understood. I'll look at current agent load and move tasks to whoever has capacity. Any priority tasks I should push to the front of the queue?", "question", "ceo"),
        msg("ceo", "Prioritize anything that's blocking client deliverables. You have full authority to reassign.", "synthesis", "all"),
      ],
    ];
    return pickVariant(intent, variants);
  }

  // ── Greeting ──
  if (intent === "greeting") {
    const variants = [
      [
        msg("ceo", "Good to have you. I'm Alexandra Chen, your CEO AI. The team is on standby — Marcus (Ops), Diana (Finance), Sophie (Marketing), Raj (Tech), Emma (Logistics). What's on the agenda?", "opening", "all"),
      ],
      [
        msg("ceo", "Welcome back. Alexandra Chen here. Your executive team is ready — just tell me what you want to tackle today.", "opening", "all"),
      ],
      [
        msg("ceo", "Hey — Alexandra Chen, CEO. Team is online: Marcus, Diana, Sophie, Raj, Emma, Carlos, Rachel, James. All systems operational. What do you need?", "opening", "all"),
      ],
    ];
    return pickVariant(intent, variants);
  }

  // ── Unknown / Default ──
  const defaultVariants = [
    [
      msg("ceo", `Received: "${userText.slice(0, 80)}". Analyzing the best approach — routing to the right director. Can you give me more specifics?`, "clarification", "all"),
    ],
    [
      msg("ceo", `I've got your message. To give you a precise recommendation, I need a bit more context — what's the end goal here?`, "clarification", "all"),
    ],
    [
      msg("ceo", `"${userText.slice(0, 70)}" — interesting. Let me think about who's best positioned to handle this. Give me more context on what you're trying to accomplish.`, "clarification", "all"),
    ],
  ];
  return pickVariant("unknown", defaultVariants);
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

// ─── File Analysis Discussion ─────────────────────────────────────────────

export interface FileDiscussionParams {
  fileName: string;
  fileId: string;
  category: string;
  delegateTo: string;
  delegationMessage: string;
  taskType: string;
}

const FILE_EXEC_RESPONSES: Record<string, string[]> = {
  design_review: [
    "Logo analysé. Points clés: cohérence des couleurs, lisibilité sur fond sombre et clair, scalabilité en petit format. Rapport de recommandations branding prêt.",
    "Analyse visuelle complète. Palette définie, formes distinctives. Recommandation: valider déclinaisons (monochrome, inversé, favicon) avant déploiement.",
  ],
  competitive_analysis: [
    "Screenshot analysé. Observations: dark branding dominant, urgency CTA visible, social proof highlighted. Concurrent mise sur la FOMO — je recommande de contrer avec notre différenciation qualité.",
    "3 patterns identifiés: preuve sociale en header, CTA contrastant, pricing affiché upfront. Analyse positionnement comparative disponible.",
  ],
  product_review: [
    "Photo produit évaluée. Éclairage correct, angle principal bon. Recommandations: 3 angles supplémentaires (détail, lifestyle, taille en contexte). Potentiel e-commerce: fort.",
    "Image utilisable pour ads et listing. Je recommande une série lifestyle en plus pour augmenter le CVR. Disponibilité fournisseur à confirmer.",
  ],
  visual_review: [
    "Image analysée. Usage recommandé: assets social media et landing page hero. Qualité suffisante pour digital, vérifier droits avant usage commercial.",
    "Image adaptée pour: header site, vignette blog, social posts. Version haute résolution requise pour print.",
  ],
  finance_review: [
    "Document financier analysé. Termes vérifiés, montants cohérents. Intégration au tracker de paiement en cours. Rappel automatique configuré à J+15.",
    "Facture/devis examiné. Tout est conforme. Suivi configuré: Net-30, reminders à J+15 et J+28. Aucun red flag identifié.",
  ],
  legal_review: [
    "Document juridique révisé. Points d'attention: clauses de responsabilité, délais de préavis, conditions de renouvellement. Vérification externe recommandée avant signature.",
    "Contrat analysé. Risques identifiés: clause d'exclusivité large à négocier, pénalités asymétriques en section 4. Liste de points à renégocier prête.",
  ],
  strategy_review: [
    "Brief analysé. Objectifs clairs, ressources estimées correctement. Plan proposé: Phase 1 (S1-2) recherche et validation, Phase 2 (S3-4) implémentation, Phase 3 optimisation.",
    "Faisabilité: haute. Ressources: 2 agents + 1 directeur lead. Timeline: 3 semaines. Points critiques: dépendances API et validation marché.",
  ],
  document_review: [
    "Document analysé. 3 points d'action extraits — ajoutés à la queue de tâches. Résumé exécutif disponible.",
    "PDF examiné. Contenu structuré, actions identifiées et intégrées dans le backlog opérationnel. Briefing résumé en cours.",
  ],
  data_analysis: [
    "Données analysées. 5 champs principaux identifiés, 2% d'entrées nulles à corriger. 3 patterns significatifs détectés — rapport complet disponible.",
    "Structure valide et cohérente. Dashboard de visualisation en cours de construction. Anomalies identifiées et documentées. Délai: 2h.",
  ],
  content_review: [
    "Document texte analysé. 4 points d'action identifiés. Plan d'implémentation priorisé en cours de rédaction.",
    "Texte synthétisé. Objectifs, contraintes et livrables documentés. Plan d'action disponible.",
  ],
  general_review: [
    "Fichier analysé. Action déterminée. Prochaines étapes documentées.",
    "Reçu et traité. Recommandation disponible dans les minutes à venir.",
  ],
};

function buildFileAnalysisMessages(params: FileDiscussionParams): DiscussionMessage[] {
  const now = Date.now();
  const msg = makeMessageBuilder(now);
  const { fileName, category, delegateTo, delegationMessage, taskType } = params;
  const delegateId = delegateTo as ExecutiveId;

  const categoryLabels: Record<string, string> = {
    image: "image",
    pdf: "document PDF",
    text: "document texte",
    data: "fichier de données",
    unknown: "fichier",
  };
  const label = categoryLabels[category] ?? "fichier";

  const responses = FILE_EXEC_RESPONSES[taskType] ?? FILE_EXEC_RESPONSES["general_review"];
  const execResponse = responses[Math.floor(Math.random() * responses.length)];

  return [
    msg("ceo", `Fichier reçu: "${fileName}" (${label}). Analyse immédiate — délégation à l'équipe en cours.`, "delegation", "all"),
    msg(delegateId, delegationMessage, "analysis", "ceo"),
    msg(delegateId, execResponse, "analysis", "ceo"),
    msg("ceo", `Analyse de "${fileName}" complète. Recommandations documentées — tu peux procéder selon le rapport.`, "synthesis", "all"),
  ];
}

export function createFileDiscussion(params: FileDiscussionParams): ExecutiveDiscussion {
  const store = readStore();
  const involvedExecutives: ExecutiveId[] = ["ceo", params.delegateTo as ExecutiveId];
  const messages = buildFileAnalysisMessages(params);
  const now = new Date().toISOString();

  const discussion: ExecutiveDiscussion = {
    id: nextId("disc"),
    userRequest: `Analyse de fichier: ${params.fileName}`,
    intent: "file_analysis",
    status: "concluded",
    involvedExecutives,
    messages,
    createdAt: now,
    updatedAt: now,
  };

  store.discussions.push(discussion);
  if (store.discussions.length > 20) store.discussions = store.discussions.slice(-20);
  writeStore(store);
  return discussion;
}
