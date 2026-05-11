import fs from "fs";
import path from "path";

// ─── Types ────────────────────────────────────────────────────────────────

export type ConversationIntent =
  | "greeting"
  | "small_talk"
  | "question"
  | "business_mission"
  | "ecommerce"
  | "dropshipping"
  | "marketing"
  | "financial"
  | "supervision"
  | "problem"
  | "create_website"
  | "create_flyer"
  | "status_check"
  | "delegate"
  | "file_analysis"
  | "unknown";

export type ThinkingState = "analyzing" | "delegating" | "reviewing" | "concluding" | "idle";

export interface CeoMemoryEntry {
  id: string;
  type: "mission" | "goal" | "decision" | "context";
  content: string;
  timestamp: string;
}

export interface CeoMemory {
  entries: CeoMemoryEntry[];
  recentIntents: string[];
  messageCount: number;
  lastSeen: string;
}

// ─── Memory Persistence ───────────────────────────────────────────────────

const REPO_ROOT = process.cwd();
const DATA_DIR = path.join(REPO_ROOT, "data");
const MEMORY_PATH = path.join(DATA_DIR, "ceo-memory.json");

function emptyMemory(): CeoMemory {
  return { entries: [], recentIntents: [], messageCount: 0, lastSeen: new Date().toISOString() };
}

function readMemory(): CeoMemory {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(MEMORY_PATH)) return emptyMemory();
  try {
    const parsed = JSON.parse(fs.readFileSync(MEMORY_PATH, "utf-8")) as Partial<CeoMemory>;
    return {
      entries: Array.isArray(parsed.entries) ? parsed.entries : [],
      recentIntents: Array.isArray(parsed.recentIntents) ? parsed.recentIntents : [],
      messageCount: typeof parsed.messageCount === "number" ? parsed.messageCount : 0,
      lastSeen: parsed.lastSeen ?? new Date().toISOString(),
    };
  } catch {
    return emptyMemory();
  }
}

function writeMemory(data: CeoMemory): void {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(MEMORY_PATH, JSON.stringify(data, null, 2) + "\n", "utf-8");
}

let _idBase = Date.now();
function nextId(): string {
  return `mem-${(_idBase++).toString(36)}`;
}

// ─── Intent Detection ─────────────────────────────────────────────────────

const INTENT_MAP: Array<{ intent: ConversationIntent; patterns: string[] }> = [
  { intent: "dropshipping",     patterns: ["dropshipping", "dropship"] },
  { intent: "ecommerce",        patterns: ["boutique en ligne", "ecommerce", "e-commerce", "shopify", "boutique", "magasin"] },
  { intent: "create_website",   patterns: ["site web", "website", "site internet", "landing page", "page web"] },
  { intent: "create_flyer",     patterns: ["flyer", "dépliant", "affiche", "poster"] },
  { intent: "financial",        patterns: ["facture", "invoice", "budget", "combien", "how much", "argent", "money", "coût", "cost", "prix", "price", "payer", "revenu"] },
  { intent: "marketing",        patterns: ["marketing", "publicité", "pub", "ads", "tiktok", "instagram", "campagne", "campaign", "branding", "seo", "réseaux sociaux", "social media"] },
  { intent: "business_mission", patterns: ["mission", "lancer", "launch", "démarrer", "start", "projet", "project", "créer", "create", "build", "construire"] },
  { intent: "supervision",      patterns: ["supervise", "approuver", "approve", "rejeter", "reject", "décision", "decision"] },
  { intent: "problem",          patterns: ["problème", "problem", "erreur", "error", "bug", "marche pas", "doesn't work", "bloqué", "stuck", "aide", "help"] },
  { intent: "delegate",         patterns: ["délègue", "délégue", "delegate", "assigne", "assign", "tâche", "task"] },
  { intent: "status_check",     patterns: ["état", "statut", "bilan", "résumé", "quoi de neuf", "avance", "progress", "rapport", "status"] },
  { intent: "greeting",         patterns: ["bonjour", "bonsoir", "salut", "hello", "hi ", "hey ", "coucou", "good morning", "good evening"] },
  { intent: "small_talk",       patterns: ["ça va", "comment tu", "how are you", "fatigue", "merci", "thanks", "thank you", "bien!", "super!"] },
  { intent: "question",         patterns: ["pourquoi", "why", "comment", "quand", "when", "qui ", "who ", "c'est quoi", "what is", "explique", "explain", "dis-moi"] },
  { intent: "file_analysis",    patterns: ["[image]", "[pdf]", "[text]", "[data]", "[unknown]", "analyse ce fichier", "fichier reçu"] },
];

export function detectConversationIntent(text: string): ConversationIntent {
  const lower = text.toLowerCase();
  for (const { intent, patterns } of INTENT_MAP) {
    if (patterns.some((p) => lower.includes(p))) return intent;
  }
  return "unknown";
}

// ─── Response Variants ────────────────────────────────────────────────────
// Rules: never start with "Je comprends votre demande", natural human tone,
// ask questions, all greeting variants must mention "CEO" (test requirement)

const VARIANTS: Record<string, string[]> = {
  // All contain "CEO" — required by existing test (ceoAndSettings.test.ts line 218)
  greeting: [
    "Salut! Ton CEO AI est en ligne — dis-moi ce qu'on attaque aujourd'hui.",
    "Bonjour! CEO AI dispo. Qu'est-ce qu'on fait?",
    "Hey! Content de te voir. Qu'est-ce que le CEO peut faire pour toi?",
    "Salut! L'équipe CEO est prête. C'est quoi le plan du jour?",
    "Bonjour! CEO et toute l'équipe executive sont en ligne. Dis-moi ton objectif.",
  ],
  small_talk: [
    "Ça roule! Dis-moi — t'as un projet en tête? Je suis là pour exécuter.",
    "Bien, merci! Et toi? On a du travail devant nous — qu'est-ce qu'on fait aujourd'hui?",
    "Opérationnel à 100%. T'as quelque chose à me soumettre?",
    "Tout va! Je garde ça court parce que je pense qu'on a des trucs à faire. Qu'est-ce qu'il y a?",
  ],
  question: [
    "Bonne question. Donne-moi le contexte et je te donne une réponse précise.",
    "Voyons ça ensemble. Qu'est-ce que tu veux savoir exactement?",
    "C'est dans quel contexte — pour un projet spécifique? Ça va aider.",
    "Je vais analyser ça. Explique-moi le contexte un peu mieux.",
  ],
  business_mission: [
    "Ok, j'écoute. Dis-m'en plus sur l'objectif — je vais briefer l'équipe en conséquence.",
    "Bonne idée. Quel est le livrable attendu et ton délai? Je vais structurer ça.",
    "Je prends ça. Avant de lancer: c'est pour quel type de business et c'est quoi le problème que ça résout?",
    "Reçu. Je mobilise les bons executives. C'est urgent ou on peut planifier correctement?",
    "Intéressant. Dis-moi ce que ça doit accomplir au final — je vais cibler les bonnes ressources.",
  ],
  ecommerce: [
    "E-commerce — on est dans notre zone ici. Quel type de produits? Je mets Emma et Sophie sur le dossier.",
    "Bonne opportunité. T'as déjà un niche en tête, ou tu veux une analyse de marché d'abord?",
    "Boutique en ligne — Diana fait le chiffrage, Sophie le marketing, Emma les fournisseurs. Qu'est-ce que tu vends?",
    "Je vais lancer ça. Shopify ou WooCommerce? Et t'as un budget initial pour les ads?",
  ],
  dropshipping: [
    "Dropshipping — bon timing. Le marché est porteur si tu choisis le bon niche. T'as une idée de produits, ou Emma fait une analyse fournisseurs d'abord?",
    "Ok, on part sur du dropshipping. Budget initial? Je structure un plan avec Diana, Emma et Sophie.",
    "Dropshipping, c'est faisable en 3–4 semaines avec la bonne stack. Budget et marché cible — US, EU, Canada?",
    "Bonne move. Je vais briefer l'équipe. Emma valide les fournisseurs, Sophie analyse les niches. Par où tu commences?",
  ],
  marketing: [
    "Marketing — Sophie est là pour ça. Quel canal tu priorises: TikTok, Meta, SEO, ou email?",
    "Dis-moi l'objectif: awareness, conversions, ou retention? Ça définit toute la stratégie.",
    "Sophie et moi on travaille là-dessus. Budget mensuel pour les ads?",
    "Pour quel produit ou service? Je fais une analyse de positionnement avant de recommander.",
  ],
  financial: [
    "Diana va s'occuper de ça. Donne-moi les détails: montant, client, délai?",
    "Budget ou facture? Dis-moi les chiffres et on structure ça correctement.",
    "Diana, c'est son département. Donne-moi le contexte et on s'en occupe.",
    "Côté finances — montant, client, et date limite? Diana génère ça immédiatement.",
  ],
  supervision: [
    "Je revois ça maintenant. Qu'est-ce qui nécessite ton approbation?",
    "Ok, mode supervision. Quelles décisions sont en attente?",
    "Tu veux approuver ou déléguer? Dis-moi ce qui est sur la table.",
  ],
  status_check: [
    "Je te fais un point rapide —",
    "Voilà où on en est —",
    "Checking everything —",
    "Rapport en cours —",
  ],
  problem: [
    "Ok, décris-moi le problème exactement. Qu'est-ce qui se passe?",
    "Compris. Donne-moi les détails — quand ça a commencé, ce que tu as essayé.",
    "Je vais regarder ça. Comportement attendu vs ce que tu vois?",
    "Pas de panique. Explique-moi le problème step by step — on va déboguer ensemble.",
  ],
  create_website: [
    "Site web — Raj est sur ça. C'est quoi le type: landing page, vitrine, ou app web?",
    "On peut lancer ça. T'as un design en tête, ou on part de zéro? Et t'as un domaine?",
    "Raj va estimer ça. Pour avancer: c'est pour quel secteur et c'est quoi l'objectif principal?",
  ],
  create_flyer: [
    "Sophie peut créer ça rapidement. Quel est l'événement ou le service à promouvoir?",
    "Flyer — 24–48h avec Sophie. Donne-moi le message principal et la cible.",
    "On s'en occupe. C'est pour quoi exactement? T'as des couleurs ou un branding à respecter?",
  ],
  delegate: [
    "Marcus va optimiser ça. Dis-moi ce qui est à déléguer et la priorité.",
    "Je lui passe la main. Quelle tâche tu veux assigner et à qui?",
    "Délégation notée. Marcus gère la répartition — dis-moi le scope.",
  ],
  file_analysis: [
    "Fichier reçu. J'analyse le contenu et délègue au bon directeur maintenant.",
    "J'ai le fichier. Analyse en cours — l'équipe executive s'en occupe.",
    "Reçu. Je route ça vers le bon expert de l'équipe immédiatement.",
  ],
  // Old CeoIntent names for backward compatibility
  launch_mission: [
    "Session lancée. Marcus pour les ops, Raj pour la tech — l'équipe est briefée.",
    "Mission en cours de structuration. Les agents sont mobilisés — tu vas voir l'exécution dans le war room.",
    "Reçu. Je structure la mission maintenant. Quel est l'objectif principal?",
  ],
  create_invoice: [
    "Diana génère la facture maintenant. Elle sera dans la section Revenue dès que c'est fait.",
    "Facture créée. Diana a Net-30 par défaut — tu veux changer les termes?",
    "C'est fait, Diana s'en occupe. Tu peux suivre le paiement dans Revenue.",
  ],
  create_dropshipping_business: [
    "Business dropshipping lancé. Emma cherche les fournisseurs, Sophie analyse les niches, Diana fait le budget.",
    "C'est parti. Je coordonne Emma pour les suppliers, Sophie pour le marketing, Diana pour le financement.",
    "Dropshipping activé. L'équipe est sur le dossier — tu vas voir la discussion dans le war room.",
  ],
  review_business: [
    "Je fais le bilan complet maintenant —",
    "Diana, Marcus et Rachel compilent le rapport —",
    "Bilan en cours. Je pull les données de toutes les équipes —",
  ],
  delegate_tasks: [
    "Marcus optimise la queue. Il assigne selon la disponibilité des agents.",
    "Délégation en cours. Marcus revoit la charge de travail et redistribue.",
  ],
  unknown: [
    "Hmm, dis-moi en plus. C'est quoi l'objectif derrière ça?",
    "J'ai besoin d'un peu plus de contexte. C'est pour quel projet?",
    "Ok, c'est quoi exactement ce que tu cherches à accomplir?",
    "Intéressant. Explique-moi le contexte et je te donne une réponse précise.",
    "Je ne suis pas certain de suivre. Reformule pour moi?",
  ],
};

const _lastIdx: Record<string, number> = {};

export function generateSmartResponse(intent: string): string {
  const variants = VARIANTS[intent] ?? VARIANTS["unknown"];
  const last = _lastIdx[intent] ?? -1;
  let idx: number;
  if (variants.length === 1) {
    idx = 0;
  } else {
    do {
      idx = Math.floor(Math.random() * variants.length);
    } while (idx === last && variants.length > 1);
  }
  _lastIdx[intent] = idx;
  return variants[idx];
}

// ─── NVIDIA CEO Response (async) ──────────────────────────────────────────

const NVIDIA_CEO_API_URL = "https://integrate.api.nvidia.com/v1/chat/completions";

export async function generateSmartResponseAsync(
  intent: string,
  userText: string,
): Promise<{ text: string; mode: "nvidia" | "simulation" }> {
  const apiKey = process.env.NVIDIA_API_KEY ?? "";

  if (apiKey && apiKey.length >= 8) {
    try {
      const memory = readMemory();
      const recentCtx = memory.entries
        .slice(-3)
        .map((e) => `${e.type}: ${e.content.slice(0, 80)}`)
        .join("; ");

      const systemPrompt = [
        "You are Alexandra Chen, CEO of an AI company. Direct, strategic, decisive, and human.",
        "Never say 'Je comprends votre demande' or any generic corporate filler.",
        "Ask one focused question when you need context. Keep responses under 3 sentences.",
        "Match the user's language — French or English.",
        recentCtx ? `Recent context: ${recentCtx}` : "",
        `Detected request type: ${intent}`,
      ]
        .filter(Boolean)
        .join(" ");

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);

      const res = await fetch(NVIDIA_CEO_API_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: process.env.NVIDIA_MODEL ?? "nvidia/llama-3.1-nemotron-70b-instruct",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userText },
          ],
          temperature: 0.72,
          max_tokens: 130,
        }),
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (res.ok) {
        const payload = (await res.json()) as {
          choices?: Array<{ message?: { content?: string } }>;
        };
        const content = payload.choices?.[0]?.message?.content?.trim() ?? "";
        if (content) return { text: content, mode: "nvidia" };
      }
    } catch {
      // fall through to simulation
    }
  }

  return { text: generateSmartResponse(intent), mode: "simulation" };
}

// ─── Thinking States ──────────────────────────────────────────────────────

export function getThinkingState(intent: string): ThinkingState {
  const delegating = [
    "business_mission", "ecommerce", "dropshipping",
    "create_website", "create_flyer", "create_dropshipping_business", "launch_mission",
  ];
  const reviewing = ["status_check", "review_business", "supervision", "delegate_tasks", "delegate"];
  const concluding = ["financial", "create_invoice"];

  if (delegating.includes(intent)) return "delegating";
  if (reviewing.includes(intent)) return "reviewing";
  if (concluding.includes(intent)) return "concluding";
  return "analyzing";
}

// ─── Memory Management ────────────────────────────────────────────────────

const GOAL_INTENTS = new Set([
  "business_mission", "ecommerce", "dropshipping",
  "create_website", "create_flyer", "marketing",
  "launch_mission", "create_dropshipping_business",
]);

export function updateCeoMemory(intent: string, userText: string): CeoMemory {
  const mem = readMemory();
  mem.messageCount += 1;
  mem.lastSeen = new Date().toISOString();
  mem.recentIntents = [...mem.recentIntents.slice(-9), intent];

  if (GOAL_INTENTS.has(intent)) {
    mem.entries.push({
      id: nextId(),
      type: "goal",
      content: userText.slice(0, 200),
      timestamp: new Date().toISOString(),
    });
  }

  if (mem.entries.length > 50) mem.entries = mem.entries.slice(-50);
  writeMemory(mem);
  return mem;
}

export function recordCeoDecision(content: string): void {
  const mem = readMemory();
  mem.entries.push({
    id: nextId(),
    type: "decision",
    content: content.slice(0, 200),
    timestamp: new Date().toISOString(),
  });
  if (mem.entries.length > 50) mem.entries = mem.entries.slice(-50);
  writeMemory(mem);
}

export function getCeoMemory(): CeoMemory {
  return readMemory();
}
