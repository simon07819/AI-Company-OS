import fs from "fs";
import path from "path";
import { type AgentId } from "./agentTypes";
import { archiveEntity, restoreEntity, softDeleteEntity } from "./archiveSystem";

// ─── Paths ────────────────────────────────────────────────────────────────

const REPO_ROOT = process.cwd();
const DATA_DIR = path.join(REPO_ROOT, "data");
const OUTPUTS_PATH = path.join(DATA_DIR, "visible-outputs.json");

// ─── Types ────────────────────────────────────────────────────────────────

export type OutputType =
  | "creative_brief"
  | "logo_direction"
  | "style_direction"
  | "color_palette"
  | "typography"
  | "moodboard"
  | "concept_card"
  | "architecture_doc"
  | "api_spec"
  | "sitemap"
  | "wireframe"
  | "copywriting"
  | "marketing_plan"
  | "financial_projection"
  | "task_list"
  | "progress_report"
  | "validation_report"
  | "before_after"
  | "estimate_preview"
  | "invoice_preview"
  | "taxes_summary"
  | "profit_summary"
  | "hero_section"
  | "ux_recommendation"
  | "page_preview"
  | "uploaded_file_analysis";

export type OutputStatus = "draft" | "in_progress" | "review" | "approved" | "delivered";

export interface VisibleOutput {
  id: string;
  sessionId: string;
  projectId: string | null;
  title: string;
  type: OutputType;
  summary: string;
  preview: string;
  status: OutputStatus;
  assignedAgent: AgentId;
  sourceFile: string | null;
  sourceFiles: string[];
  createdAt: string;
  updatedAt: string;
  archivedAt?: string | null;
  deletedAt?: string | null;
  favorite?: boolean;
  versionHistory?: { version: number; title: string; preview: string; updatedAt: string }[];
  revisions?: { id: string; note: string; createdAt: string }[];
}

interface OutputsData {
  outputs: VisibleOutput[];
}

// ─── Persistence ──────────────────────────────────────────────────────────

function ensureDataDir() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readData(): OutputsData {
  ensureDataDir();
  if (!fs.existsSync(OUTPUTS_PATH)) return { outputs: [] };
  try {
    const parsed = JSON.parse(fs.readFileSync(OUTPUTS_PATH, "utf-8")) as Partial<OutputsData>;
    return { outputs: Array.isArray(parsed.outputs) ? parsed.outputs : [] };
  } catch {
    return { outputs: [] };
  }
}

function writeData(data: OutputsData) {
  ensureDataDir();
  fs.writeFileSync(OUTPUTS_PATH, JSON.stringify(data, null, 2) + "\n", "utf-8");
}

// ─── Helpers ──────────────────────────────────────────────────────────────

let idCounter = Date.now();
function nextId(): string {
  return `vo-${(idCounter++).toString(36)}`;
}

// ─── Agent-specific output generators ─────────────────────────────────────

const LOGO_OUTPUTS: Omit<VisibleOutput, "id" | "sessionId" | "projectId" | "createdAt" | "updatedAt">[] = [
  { title: "Direction créative", type: "creative_brief", summary: "Branding premium — identité visuelle mémorable et distinctive", preview: "Branding premium — objectif: identité visuelle mémorable, émotionnelle, distinctive. Références: Apple, Nike, Tesla. Style: moderne 2026.", status: "in_progress", assignedAgent: "cmo", sourceFile: null, sourceFiles: [] },
  { title: "Concept logo", type: "logo_direction", summary: "3 propositions de direction logo", preview: "Propositions: ① Sportif/Dynamique — typographie bold, angles vifs, palette énergie ② Premium/Minimaliste — espace blanc, serif élégant, monochrome or ③ Luxe/Noir — fond sombre, or métallique, emblème sculptural", status: "draft", assignedAgent: "frontend_agent", sourceFile: null, sourceFiles: [] },
  { title: "Direction style", type: "style_direction", summary: "Direction visuelle et guidelines", preview: "Direction visuelle: minimalisme premium avec accents dynamiques. Inspiration: Apple HIG + Nike branding. Grid: 8px baseline. Border radius: 12px cards, 24px buttons.", status: "draft", assignedAgent: "frontend_agent", sourceFile: null, sourceFiles: [] },
  { title: "Palette couleurs", type: "color_palette", summary: "Palette de couleurs primaire et secondaire", preview: "Primaire: #1A1A2E (Deep Navy) | Accent: #E94560 (Energetic Red) | Surface: #16213E (Dark Blue) | Text: #F5F5F5 | Success: #0F9D58 | Warning: #F4B400", status: "draft", assignedAgent: "frontend_agent", sourceFile: null, sourceFiles: [] },
  { title: "Typographie", type: "typography", summary: "Système typographique complet", preview: "Headings: Inter Bold 700 | Body: Inter Regular 400 | Labels: Inter Medium 500 | Code: JetBrains Mono | Taille: 32/24/16/14/12px", status: "draft", assignedAgent: "frontend_agent", sourceFile: null, sourceFiles: [] },
  { title: "Moodboard", type: "moodboard", summary: "Moodboard direction artistique", preview: "Mood: Premium, confiant, moderne. Visuels: dark mode interfaces, gradients subtils, photography noir/or, icônes minimaliste, whitespace généreux. Émotion: 'Je fais confiance à cette marque.'", status: "draft", assignedAgent: "cmo", sourceFile: null, sourceFiles: [] },
  { title: "Avant/Après", type: "before_after", summary: "Comparaison concept avant/après", preview: "Avant: logo actuel, identité existante | Après: nouvelle direction premium, palette réactualisée, typographie moderne. Objectif: transformation visible et mémorable.", status: "draft", assignedAgent: "frontend_agent", sourceFile: null, sourceFiles: [] },
  { title: "Analyse fichier uploadé", type: "uploaded_file_analysis", summary: "Analyse des fichiers fournis par le client", preview: "Fichier(s) analysé(s): le contenu a été examiné pour inspirer la direction créative. Éléments clés extraits: couleurs dominantes, style typographique, ton visuel.", status: "draft", assignedAgent: "cmo", sourceFile: null, sourceFiles: [] },
];

const WEBSITE_OUTPUTS: Omit<VisibleOutput, "id" | "sessionId" | "projectId" | "createdAt" | "updatedAt">[] = [
  { title: "Architecture technique", type: "architecture_doc", summary: "Stack technique et architecture du site", preview: "Stack: Next.js 15 + TypeScript + Tailwind CSS + PostgreSQL. Architecture: App Router, Server Components, API Routes. Deploy: Vercel. Auth: NextAuth.js.", status: "in_progress", assignedAgent: "cto", sourceFile: null, sourceFiles: [] },
  { title: "Spécifications API", type: "api_spec", summary: "Endpoints et contrats API", preview: "RESTful API avec endpoints: /api/auth, /api/users, /api/projects, /api/tasks. Auth: JWT Bearer tokens. Rate limiting: 100 req/min. Stripe-quality docs.", status: "draft", assignedAgent: "backend_agent", sourceFile: null, sourceFiles: [] },
  { title: "Sitemap & structure", type: "sitemap", summary: "Structure des pages et navigation", preview: "Pages: / (landing), /dashboard, /projects, /settings, /api-docs. Navigation: sidebar + breadcrumbs. Mobile-first responsive.", status: "draft", assignedAgent: "product_agent", sourceFile: null, sourceFiles: [] },
  { title: "Wireframes", type: "wireframe", summary: "Maquettes fonctionnelles des pages clés", preview: "Landing: hero + CTA + features + testimonials. Dashboard: stats cards + activity feed + quick actions. Projects: card grid + filters + search.", status: "draft", assignedAgent: "frontend_agent", sourceFile: null, sourceFiles: [] },
  { title: "Hero section", type: "hero_section", summary: "Concept de la section héro", preview: "Hero: headline percutante + sous-titre + CTA primaire + image/illustration. Style: plein écran, gradient subtil, animation d'entrée. Référence: stripe.com hero.", status: "draft", assignedAgent: "frontend_agent", sourceFile: null, sourceFiles: [] },
  { title: "Recommandations UX", type: "ux_recommendation", summary: "Recommandations d'expérience utilisateur", preview: "UX: navigation claire, CTA visible, feedback immédiat, loading states, error recovery. Mobile: hamburger menu, touch targets 44px, scroll optimisé.", status: "draft", assignedAgent: "product_agent", sourceFile: null, sourceFiles: [] },
  { title: "Aperçu page", type: "page_preview", summary: "Aperçu visuel de la page d'accueil", preview: "Homepage: hero full-width → features grid (3 colonnes) → testimonials carousel → pricing table → footer. Responsive: stack vertical sur mobile.", status: "draft", assignedAgent: "frontend_agent", sourceFile: null, sourceFiles: [] },
];

const FLYER_OUTPUTS: Omit<VisibleOutput, "id" | "sessionId" | "projectId" | "createdAt" | "updatedAt">[] = [
  { title: "Concept créatif", type: "creative_brief", summary: "Concept créatif du flyer", preview: "Flyer événementiel premium. Format: A5 digital + print. Style: bold typographie + photo hero + CTA percutant. Référence: Nike campaigns.", status: "in_progress", assignedAgent: "cmo", sourceFile: null, sourceFiles: [] },
  { title: "Direction visuelle", type: "style_direction", summary: "Direction visuelle et style", preview: "Style: impactful, émotionnel. Photo: lifestyle hero shot. Typography: bold sans-serif 48px headline. Palette: brand primary + accent énergie.", status: "draft", assignedAgent: "frontend_agent", sourceFile: null, sourceFiles: [] },
  { title: "Copywriting", type: "copywriting", summary: "Texte et message du flyer", preview: "Headline: [À définir selon événement]. Subhead: Date, lieu, call-to-action. Corps: 3 points clés. Footer: logo + contact + social.", status: "draft", assignedAgent: "cmo", sourceFile: null, sourceFiles: [] },
];

const BRANDING_OUTPUTS: Omit<VisibleOutput, "id" | "sessionId" | "projectId" | "createdAt" | "updatedAt">[] = [
  { title: "Direction créative branding", type: "creative_brief", summary: "Identité de marque complète et cohérente", preview: "Identité de marque complète. Vision: premium, mémorable, cohérente. Références: Apple minimalisme + Nike énergie + Tesla futurisme. Objectif: marque qui inspire confiance et désir.", status: "in_progress", assignedAgent: "cmo", sourceFile: null, sourceFiles: [] },
  { title: "Concept identité visuelle", type: "logo_direction", summary: "3 propositions d'identité visuelle", preview: "Propositions identité: ① Premium minimaliste — monogramme + serif élégant ② Sportif dynamique — logotype bold + accent couleur ③ Luxe affirmé — emblème + or métallique + noir profond", status: "draft", assignedAgent: "frontend_agent", sourceFile: null, sourceFiles: [] },
  { title: "Charte graphique", type: "style_direction", summary: "Guide de charte graphique complet", preview: "Guide complet: logo déclinaisons, couleurs primaires/secondaires, typographie, iconographie, photography style, spacing, composants UI. Format: brand book PDF.", status: "draft", assignedAgent: "frontend_agent", sourceFile: null, sourceFiles: [] },
  { title: "Palette couleurs branding", type: "color_palette", summary: "Palette de couleurs de la marque", preview: "Primaire: #0A0A0A (Noir absolu) | Accent: #C9A96E (Or premium) | Secondaire: #1A1A2E (Bleu nuit) | Surface: #F8F8F8 | Texte: #333333", status: "draft", assignedAgent: "frontend_agent", sourceFile: null, sourceFiles: [] },
  { title: "Typography Direction", type: "typography", summary: "Direction typographique pour la marque", preview: "Headings: Inter Black 900 pour impact logo | Body: Inter Regular 400 pour lisibilité | Accent: Space Grotesk 700 pour détails premium.", status: "draft", assignedAgent: "frontend_agent", sourceFile: null, sourceFiles: [] },
  { title: "Design Recommendation", type: "style_direction", summary: "Recommandation design finale", preview: "Recommandation: direction premium minimaliste avec monogramme simple, palette sombre + accent or, typographie géométrique. Prêt pour approbation avant production des variantes.", status: "review", assignedAgent: "cmo", sourceFile: null, sourceFiles: [] },
  { title: "Approval Preview", type: "concept_card", summary: "Aperçu à approuver", preview: "Aperçu approbation: logo concept + palette + typographie + recommandations de déclinaison. Aucun approval ne devrait être fait sans vérifier cette preview.", status: "review", assignedAgent: "qa_agent", sourceFile: null, sourceFiles: [] },
  { title: "Plan marketing", type: "marketing_plan", summary: "Stratégie de lancement branding", preview: "Stratégie de lancement branding: Phase 1 — Audit & recherche (semaine 1) | Phase 2 — Concepts & directions (semaine 2-3) | Phase 3 — Production & déclinaisons (semaine 4) | Phase 4 — Lancement & diffusion", status: "draft", assignedAgent: "cmo", sourceFile: null, sourceFiles: [] },
];

const DROPSHIPPING_OUTPUTS: Omit<VisibleOutput, "id" | "sessionId" | "projectId" | "createdAt" | "updatedAt">[] = [
  { title: "Plan dropshipping", type: "creative_brief", summary: "Business model dropshipping complet", preview: "Business model dropshipping: sélection produits, fournisseurs vérifiés, marges optimisées. Zone: Canada/US. Objectif: 30% marge nette.", status: "in_progress", assignedAgent: "logistics", sourceFile: null, sourceFiles: [] },
  { title: "Projections financières", type: "financial_projection", summary: "Projections financières détaillées", preview: "Investissement initial: $500. Marge produit: 30-50%. ROI estimé: 3-6 mois. Break-even: 50 commandes/mois. Revenus projetés: $2000-5000/mois.", status: "draft", assignedAgent: "cfo", sourceFile: null, sourceFiles: [] },
  { title: "Estimation", type: "estimate_preview", summary: "Estimation des coûts et revenus", preview: "Coûts démarrage: $500 (site + ads initial). Coûts mensuels: $200 (ads) + $50 (outils). Revenus projetés mois 3: $2000. Marge nette: 30%.", status: "draft", assignedAgent: "cfo", sourceFile: null, sourceFiles: [] },
  { title: "Résumé taxes", type: "taxes_summary", summary: "Résumé des obligations fiscales", preview: "TPS: 5% sur ventes > $30K/an. TVQ: 9.975% au Québec. Revenu d'entreprise: impôt selon tranche. TVA EU si vente > €10K.", status: "draft", assignedAgent: "cfo", sourceFile: null, sourceFiles: [] },
  { title: "Résumé profits", type: "profit_summary", summary: "Analyse de rentabilité", preview: "Profit brut: 30-50% par produit. Profit net estimé: 15-25% après ads et frais. ROI 6 mois: 200-400% si exécution optimale.", status: "draft", assignedAgent: "cfo", sourceFile: null, sourceFiles: [] },
  { title: "Plan marketing e-commerce", type: "marketing_plan", summary: "Stratégie marketing e-commerce", preview: "Canaux: Instagram ads + TikTok + SEO. Budget pub: $200/mois initial. CAC cible: < $15. LTV cible: > $80. Stratégie contenu: UGC + product demos.", status: "draft", assignedAgent: "cmo", sourceFile: null, sourceFiles: [] },
];

const GENERIC_OUTPUTS: Omit<VisibleOutput, "id" | "sessionId" | "projectId" | "createdAt" | "updatedAt">[] = [
  { title: "Plan d'exécution", type: "task_list", summary: "Plan d'exécution de la mission", preview: "Phase 1: Planification & architecture | Phase 2: Développement core | Phase 3: Design & UX | Phase 4: Validation & livraison. Chaque phase avec deliverables clairs.", status: "in_progress", assignedAgent: "coo", sourceFile: null, sourceFiles: [] },
  { title: "Rapport de progression", type: "progress_report", summary: "Rapport de progression en cours", preview: "Mission démarrée. Équipe assignée. Premiers deliverables en production. Timeline respectée. Prochaines étapes: validation creative, review architecture.", status: "in_progress", assignedAgent: "ceo", sourceFile: null, sourceFiles: [] },
];

const OUTPUT_TEMPLATES: Record<string, Omit<VisibleOutput, "id" | "sessionId" | "projectId" | "createdAt" | "updatedAt">[]> = {
  redesign_logo: LOGO_OUTPUTS,
  branding_pack: BRANDING_OUTPUTS,
  design_review: LOGO_OUTPUTS.slice(0, 3),
  create_website: WEBSITE_OUTPUTS,
  website: WEBSITE_OUTPUTS,
  create_flyer: FLYER_OUTPUTS,
  flyer: FLYER_OUTPUTS,
  create_dropshipping_business: DROPSHIPPING_OUTPUTS,
  ecommerce_store: DROPSHIPPING_OUTPUTS,
  launch_mission: GENERIC_OUTPUTS,
  saas_project: WEBSITE_OUTPUTS,
};

// ─── Public API ───────────────────────────────────────────────────────────

export function generateVisibleOutputs(sessionId: string, missionType: string, projectId: string | null = null, sourceFiles: string[] = []): VisibleOutput[] {
  const templates = OUTPUT_TEMPLATES[missionType] ?? GENERIC_OUTPUTS;
  const now = new Date().toISOString();
  const outputs: VisibleOutput[] = templates.map((t) => ({
    ...t,
    id: nextId(),
    sessionId,
    projectId,
    sourceFiles: sourceFiles.length > 0 ? sourceFiles : t.sourceFiles,
    createdAt: now,
    updatedAt: now,
  }));

  const data = readData();
  data.outputs.push(...outputs);
  writeData(data);
  return outputs;
}

export function ensureFallbackVisibleOutput(sessionId: string, missionType: string, projectId: string | null = null): VisibleOutput {
  const existing = getOutputsForSession(sessionId);
  if (existing.length > 0) return existing[0];

  const now = new Date().toISOString();
  const output: VisibleOutput = {
    id: nextId(),
    sessionId,
    projectId,
    title: "Design Recommendation",
    type: "style_direction",
    summary: "Fallback visible design recommendation generated because the mission had progress but no visible output.",
    preview: [
      "Creative Direction: premium, simple, immediately usable.",
      "Logo Concept: clean wordmark with a strong geometric mark.",
      "Color Palette: #0F172A, #38BDF8, #F8FAFC, #22C55E.",
      "Typography Direction: Inter Bold for headings, Inter Regular for body.",
      "Design Recommendation: approve this direction for first visual production.",
    ].join("\n"),
    status: "review",
    assignedAgent: missionType === "branding_pack" || missionType === "flyer" ? "cmo" : "frontend_agent",
    sourceFile: null,
    sourceFiles: [],
    createdAt: now,
    updatedAt: now,
  };

  const data = readData();
  data.outputs.push(output);
  writeData(data);
  return output;
}

export function getOutputsForSession(sessionId: string): VisibleOutput[] {
  return readData().outputs.filter((o) => o.sessionId === sessionId && !o.archivedAt && !o.deletedAt)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function getOutputsForProject(projectId: string): VisibleOutput[] {
  return readData().outputs.filter((o) => o.projectId === projectId && !o.archivedAt && !o.deletedAt)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function updateOutputStatus(outputId: string, status: OutputStatus): VisibleOutput | null {
  const data = readData();
  const idx = data.outputs.findIndex((o) => o.id === outputId);
  if (idx === -1) return null;
  data.outputs[idx].status = status;
  data.outputs[idx].updatedAt = new Date().toISOString();
  writeData(data);
  return data.outputs[idx];
}

export function getOutputCountForSession(sessionId: string): number {
  return readData().outputs.filter((o) => o.sessionId === sessionId).length;
}

export function getAllOutputs(): VisibleOutput[] {
  return readData().outputs.filter((o) => !o.archivedAt && !o.deletedAt).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export function getOutputById(outputId: string): VisibleOutput | null {
  return readData().outputs.find((o) => o.id === outputId) ?? null;
}

export function updateOutputMetadata(outputId: string, patch: Partial<Pick<VisibleOutput, "title" | "summary" | "preview" | "status" | "assignedAgent" | "favorite">>): VisibleOutput | null {
  const data = readData();
  const idx = data.outputs.findIndex((o) => o.id === outputId);
  if (idx === -1) return null;
  const current = data.outputs[idx];
  const history = current.versionHistory ?? [];
  data.outputs[idx] = {
    ...current,
    ...patch,
    versionHistory: [...history, { version: history.length + 1, title: current.title, preview: current.preview, updatedAt: current.updatedAt }],
    updatedAt: new Date().toISOString(),
  };
  writeData(data);
  return data.outputs[idx];
}

export function addOutputRevision(outputId: string, note: string): VisibleOutput | null {
  const data = readData();
  const idx = data.outputs.findIndex((o) => o.id === outputId);
  if (idx === -1) return null;
  const revisions = data.outputs[idx].revisions ?? [];
  data.outputs[idx].revisions = [{ id: `rev-${Date.now().toString(36)}`, note, createdAt: new Date().toISOString() }, ...revisions];
  data.outputs[idx].updatedAt = new Date().toISOString();
  writeData(data);
  return data.outputs[idx];
}

export function archiveOutput(outputId: string): VisibleOutput | null {
  const output = updateOutputMetadata(outputId, { status: getOutputById(outputId)?.status });
  if (!output) return null;
  const data = readData();
  const idx = data.outputs.findIndex((o) => o.id === outputId);
  data.outputs[idx].archivedAt = new Date().toISOString();
  writeData(data);
  archiveEntity({ entityType: "outputs", entityId: output.id, snapshot: data.outputs[idx], label: output.title });
  return data.outputs[idx];
}

export function restoreOutput(outputId: string): VisibleOutput | null {
  const data = readData();
  const idx = data.outputs.findIndex((o) => o.id === outputId);
  if (idx === -1) return null;
  data.outputs[idx].archivedAt = null;
  data.outputs[idx].deletedAt = null;
  data.outputs[idx].updatedAt = new Date().toISOString();
  writeData(data);
  restoreEntity("outputs", outputId);
  return data.outputs[idx];
}

export function softDeleteOutput(outputId: string): VisibleOutput | null {
  const data = readData();
  const idx = data.outputs.findIndex((o) => o.id === outputId);
  if (idx === -1) return null;
  data.outputs[idx].deletedAt = new Date().toISOString();
  data.outputs[idx].archivedAt = data.outputs[idx].archivedAt ?? data.outputs[idx].deletedAt;
  data.outputs[idx].updatedAt = new Date().toISOString();
  writeData(data);
  softDeleteEntity({ entityType: "outputs", entityId: outputId, snapshot: data.outputs[idx], label: data.outputs[idx].title });
  return data.outputs[idx];
}
