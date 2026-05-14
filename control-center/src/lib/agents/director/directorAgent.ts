/**
 * Director Agent — CEO → Directeur → Équipe → Directeur → CEO
 *
 * Le Directeur valide les briefs avant production, coordonne les agents
 * spécialisés, revoit les livrables et synthétise le résultat final pour le CEO.
 */

import { generateWithLlm } from "@/lib/ai/llmClient";

// ─── Types ────────────────────────────────────────────────────────────────

export interface DirectorBrief {
  sourcePrompt: string;
  requestType: string;
  brandName: string | null;
  industry: string;
  userGoal: string;
  requiredAgents?: string[];
}

export interface DirectorEnrichment {
  enrichedDirection: string;
  agentSequence: AgentInstruction[];
  qualityGates: string[];
  mode: "llm" | "prototype";
}

export interface AgentInstruction {
  agentRole: string;
  task: string;
  priority: number;
}

export interface DirectorValidation {
  approved: boolean;
  qualityScore: number;
  directorMessage: string;
  strengths: string[];
  improvements: string[];
  revisionNeeded: boolean;
  ceoSummary: string;
  mode: "llm" | "prototype";
}

export interface DirectorSynthesis {
  ceoFacingMessage: string;
  deliverableSummary: string;
  nextSteps: string[];
  kpiEstimate: {
    completionRate: number;
    qualityScore: number;
    iterationsUsed: number;
  };
  mode: "llm" | "prototype";
}

// ─── Prompts ──────────────────────────────────────────────────────────────

const DIRECTOR_SYSTEM = `Tu es le Directeur de Création et Chef de Projet de AI Company OS.
Ton rôle est de:
1. Valider et enrichir les briefs créatifs avant de les transmettre à l'équipe
2. Coordonner les agents spécialisés (Brand Strategist, Art Director, Designer, QA)
3. Contrôler la qualité des livrables avant transmission au CEO
4. Synthétiser les résultats pour le CEO de façon claire et professionnelle

Tu réponds toujours dans la langue de l'utilisateur (français ou anglais).
Sois concis, directif et orienté résultat. Priorité: qualité, cohérence, impact.`;

// ─── Fallbacks déterministes ──────────────────────────────────────────────

function enrichmentFallback(brief: DirectorBrief): DirectorEnrichment {
  const agentSequence = buildAgentSequence(brief.requestType);
  const qualityGates = qualityGatesFor(brief.requestType);
  const enrichedDirection = buildEnrichedDirectionFallback(brief);
  return { enrichedDirection, agentSequence, qualityGates, mode: "prototype" };
}

function buildAgentSequence(requestType: string): AgentInstruction[] {
  const sequences: Record<string, AgentInstruction[]> = {
    branding: [
      { agentRole: "Brand Strategist", task: "Définir positionnement, valeurs et personnalité de marque", priority: 1 },
      { agentRole: "Marketing Strategist", task: "Définir angle marketing et intention persuasive", priority: 2 },
      { agentRole: "Art Director", task: "Proposer 3 directions artistiques distinctes avec justification", priority: 3 },
      { agentRole: "Copy Agent", task: "Suggérer noms, slogans et concepts narratifs", priority: 4 },
      { agentRole: "Logo Designer", task: "Générer visuels selon directions approuvées", priority: 5 },
      { agentRole: "Creative QA", task: "Évaluer cohérence, lisibilité et impact visuel", priority: 6 },
    ],
    logo: [
      { agentRole: "Brand Strategist", task: "Analyser identité de marque et contraintes visuelles", priority: 1 },
      { agentRole: "Art Director", task: "Définir direction artistique et moodboard", priority: 2 },
      { agentRole: "Logo Designer", task: "Créer concepts visuels selon direction validée", priority: 3 },
      { agentRole: "Creative QA", task: "Vérifier lisibilité multi-supports et cohérence", priority: 4 },
    ],
    website: [
      { agentRole: "Business Strategist", task: "Définir objectifs business et audience cible", priority: 1 },
      { agentRole: "UX Director", task: "Architecting parcours utilisateur et arborescence", priority: 2 },
      { agentRole: "Frontend Builder", task: "Développer structure et composants UI", priority: 3 },
      { agentRole: "Creative QA", task: "Valider expérience, accessibilité et performance", priority: 4 },
    ],
    saas: [
      { agentRole: "Business Strategist", task: "Définir modèle économique et valeur produit", priority: 1 },
      { agentRole: "SaaS Architect", task: "Architecturer produit, API et structure de données", priority: 2 },
      { agentRole: "UX Director", task: "Concevoir flux utilisateur et tableau de bord", priority: 3 },
      { agentRole: "Creative QA", task: "Valider cohérence, qualité et livrables", priority: 4 },
    ],
  };
  return sequences[requestType] ?? sequences.saas;
}

function qualityGatesFor(requestType: string): string[] {
  const gates: Record<string, string[]> = {
    branding: ["Nom de marque respecté", "Minimum 3 concepts distincts", "Palette et typographie définis", "Score > 82/100"],
    logo: ["Identité visuelle cohérente", "Lisible en format réduit", "Vectorisé et traçable", "Score > 80/100"],
    website: ["Structure et navigation claires", "Contenu pertinent pour l'industrie", "Mobile-friendly", "Score > 78/100"],
    saas: ["Spec produit complète", "Routes et données mockées", "Starter réel créé", "Score > 78/100"],
  };
  return gates[requestType] ?? ["Livrables traçables créés", "Score qualité > 78/100"];
}

function buildEnrichedDirectionFallback(brief: DirectorBrief): string {
  const { requestType, brandName, industry, userGoal } = brief;
  const brand = brandName ? `${brandName} ` : "";
  const ind = industry && industry !== "unknown" ? ` dans le secteur ${industry}` : "";
  return [
    `Direction: Produire ${requestType === "branding" || requestType === "logo" ? `une identité visuelle ${brand}` : `un ${requestType} ${brand}`}${ind}.`,
    `Objectif: ${userGoal || "Créer un livrable professionnel et différenciant"}.`,
    "Critères: originalité, cohérence visuelle, impact immédiat. Aucun concept générique accepté.",
  ].join(" ");
}

function validationFallback(brief: DirectorBrief, qualityScore: number): DirectorValidation {
  const approved = qualityScore >= 78;
  const brand = brief.brandName ? `pour ${brief.brandName} ` : "";
  return {
    approved,
    qualityScore,
    directorMessage: approved
      ? `Le Directeur valide le livrable ${brand}(score: ${qualityScore}/100). L'équipe a produit un résultat conforme aux standards de l'agence.`
      : `Le Directeur demande des révisions ${brand}(score: ${qualityScore}/100). Des améliorations sont nécessaires avant la validation finale.`,
    strengths: approved
      ? ["Structure conforme aux standards", "Livrables traçables et versionés", "Critères de qualité respectés"]
      : ["Livrables créés et traçables", "Pipeline exécuté correctement"],
    improvements: !approved
      ? ["Renforcer la différenciation des concepts", "Améliorer l'impact visuel", "Revoir la cohérence de marque"]
      : [],
    revisionNeeded: !approved,
    ceoSummary: `${brief.requestType === "branding" || brief.requestType === "logo" ? "Identité visuelle" : brief.requestType} ${brand}— score ${qualityScore}/100. ${approved ? "Prêt." : "Révision conseillée."}`,
    mode: "prototype",
  };
}

function synthesisFallback(brief: DirectorBrief, qualityScore: number, iterationsUsed: number): DirectorSynthesis {
  const brand = brief.brandName ? ` pour ${brief.brandName}` : "";
  return {
    ceoFacingMessage: `L'équipe a complété la mission${brand}. Score final: ${qualityScore}/100.`,
    deliverableSummary: `${brief.requestType}${brand} — livrables créés, versionnés et traçables.`,
    nextSteps: ["Réviser les artifacts dans le workspace projet", "Approuver ou demander des modifications"],
    kpiEstimate: { completionRate: Math.round(qualityScore * 0.9), qualityScore, iterationsUsed },
    mode: "prototype",
  };
}

// ─── LLM-powered Director calls ───────────────────────────────────────────

export async function runDirectorBriefing(brief: DirectorBrief): Promise<DirectorEnrichment> {
  const fallback = enrichmentFallback(brief);

  const prompt = `Brief mission à valider et enrichir:
- Demande: ${brief.sourcePrompt}
- Type: ${brief.requestType}
- Marque: ${brief.brandName ?? "À définir"}
- Secteur: ${brief.industry}
- Objectif: ${brief.userGoal}

En tant que Directeur, fournis en JSON:
{
  "enrichedDirection": "Direction créative/stratégique en 2-3 phrases",
  "agentSequence": [{"agentRole": "string", "task": "string", "priority": number}],
  "qualityGates": ["critère 1", "critère 2", "critère 3"]
}`;

  const result = await generateWithLlm({
    system: DIRECTOR_SYSTEM,
    user: prompt,
    purpose: "director_brief_enrichment",
  });

  if (!result.ok) return fallback;

  try {
    const match = result.text.match(/\{[\s\S]*\}/);
    if (!match) return { ...fallback, mode: "prototype" };
    const parsed = JSON.parse(match[0]) as Partial<DirectorEnrichment>;
    return {
      enrichedDirection: typeof parsed.enrichedDirection === "string" ? parsed.enrichedDirection : fallback.enrichedDirection,
      agentSequence: Array.isArray(parsed.agentSequence) ? parsed.agentSequence : fallback.agentSequence,
      qualityGates: Array.isArray(parsed.qualityGates) ? parsed.qualityGates : fallback.qualityGates,
      mode: "llm",
    };
  } catch {
    return { ...fallback, mode: "prototype" };
  }
}

export async function runDirectorValidation(
  brief: DirectorBrief,
  outputsSummary: string,
  qualityScore: number,
): Promise<DirectorValidation> {
  const fallback = validationFallback(brief, qualityScore);

  const prompt = `Revue du livrable par le Directeur.

Mission: ${brief.sourcePrompt}
Marque: ${brief.brandName ?? "N/A"}
Score qualité: ${qualityScore}/100

Résumé des outputs agents:
${outputsSummary}

Évalue ce travail et réponds en JSON:
{
  "approved": boolean,
  "qualityScore": number,
  "directorMessage": "2-3 phrases professionnelles",
  "strengths": ["point fort 1", "point fort 2"],
  "improvements": ["amélioration 1"],
  "revisionNeeded": boolean,
  "ceoSummary": "1 phrase synthèse pour le CEO"
}`;

  const result = await generateWithLlm({
    system: DIRECTOR_SYSTEM,
    user: prompt,
    purpose: "director_quality_validation",
  });

  if (!result.ok) return fallback;

  try {
    const match = result.text.match(/\{[\s\S]*\}/);
    if (!match) return fallback;
    const parsed = JSON.parse(match[0]) as Partial<DirectorValidation>;
    return {
      approved: typeof parsed.approved === "boolean" ? parsed.approved : fallback.approved,
      qualityScore: typeof parsed.qualityScore === "number" ? parsed.qualityScore : qualityScore,
      directorMessage: typeof parsed.directorMessage === "string" ? parsed.directorMessage : fallback.directorMessage,
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths : fallback.strengths,
      improvements: Array.isArray(parsed.improvements) ? parsed.improvements : fallback.improvements,
      revisionNeeded: typeof parsed.revisionNeeded === "boolean" ? parsed.revisionNeeded : fallback.revisionNeeded,
      ceoSummary: typeof parsed.ceoSummary === "string" ? parsed.ceoSummary : fallback.ceoSummary,
      mode: "llm",
    };
  } catch {
    return fallback;
  }
}

export async function runDirectorSynthesis(
  brief: DirectorBrief,
  validation: DirectorValidation,
  iterationsUsed: number,
): Promise<DirectorSynthesis> {
  const fallback = synthesisFallback(brief, validation.qualityScore, iterationsUsed);

  const prompt = `Synthèse finale de mission pour le CEO.

Mission: ${brief.sourcePrompt}
Marque: ${brief.brandName ?? "N/A"}
Validation directeur: ${validation.directorMessage}
Score: ${validation.qualityScore}/100
Itérations: ${iterationsUsed}

Génère une synthèse CEO en JSON:
{
  "ceoFacingMessage": "Message direct et professionnel pour le CEO (3-4 phrases)",
  "deliverableSummary": "Résumé du livrable (1 phrase)",
  "nextSteps": ["prochaine étape 1", "prochaine étape 2"],
  "kpiEstimate": {
    "completionRate": number (0-100),
    "qualityScore": number,
    "iterationsUsed": number
  }
}`;

  const result = await generateWithLlm({
    system: DIRECTOR_SYSTEM,
    user: prompt,
    purpose: "director_ceo_synthesis",
  });

  if (!result.ok) return fallback;

  try {
    const match = result.text.match(/\{[\s\S]*\}/);
    if (!match) return fallback;
    const parsed = JSON.parse(match[0]) as Partial<DirectorSynthesis>;
    return {
      ceoFacingMessage: typeof parsed.ceoFacingMessage === "string" ? parsed.ceoFacingMessage : fallback.ceoFacingMessage,
      deliverableSummary: typeof parsed.deliverableSummary === "string" ? parsed.deliverableSummary : fallback.deliverableSummary,
      nextSteps: Array.isArray(parsed.nextSteps) ? parsed.nextSteps : fallback.nextSteps,
      kpiEstimate: parsed.kpiEstimate && typeof parsed.kpiEstimate === "object"
        ? {
          completionRate: Number(parsed.kpiEstimate.completionRate) || fallback.kpiEstimate.completionRate,
          qualityScore: Number(parsed.kpiEstimate.qualityScore) || validation.qualityScore,
          iterationsUsed,
        }
        : fallback.kpiEstimate,
      mode: "llm",
    };
  } catch {
    return fallback;
  }
}
