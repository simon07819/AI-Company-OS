import { generateWithLlm } from "@/lib/ai/llmClient";
import type { AgentOutput, MissionPlan } from "@/lib/orchestrator/types";

const CREATIVE_DIRECTOR_SYSTEM = `Tu es le Directeur Artistique de AI Company OS.
Tu proposes des directions créatives concrètes et distinctes pour chaque projet.
Chaque direction doit avoir: nom, rationale, langage visuel, palette couleurs, typographie, ce qui la différencie.
Réponds toujours dans la langue de l'utilisateur (français ou anglais).`;

function deterministicDirection(plan: MissionPlan): string {
  const sport = /sport|performance|fitness|athlet/i.test(plan.industry);
  const premium = /premium|luxe|luxury|high.end/i.test(plan.sourcePrompt);
  const tech = /tech|saas|app|digital|software/i.test(plan.industry);

  if (sport) return "Explorer une identité active: vitesse, tension, précision, contraste fort et signal visuel immédiatement lisible en mouvement.";
  if (premium) return "Créer une identité premium: minimalisme raffiné, espaces généreux, typographie haute couture et palette monochrome distinctive.";
  if (tech) return "Développer une identité tech-forward: géométrie précise, couleurs saturées sur fond sombre, logique systémique et modernité assumée.";
  return "Construire une identité premium: clarté absolue, différenciation forte entre les directions, lisibilité multi-supports prioritaire.";
}

async function enrichDirectionWithLlm(plan: MissionPlan): Promise<string | null> {
  const prompt = `Propose 3 directions artistiques distinctes pour ce projet:

Marque: ${plan.brandName ?? "À définir"}
Secteur: ${plan.industry}
Type: ${plan.requestType}
Objectif: ${plan.userGoal}
Demande: ${plan.sourcePrompt}

Pour chaque direction donne: nom, langage visuel, palette, typographie et ce qui la rend unique.
Format: texte structuré, pas de JSON. Maximum 200 mots.`;

  const result = await generateWithLlm({
    system: CREATIVE_DIRECTOR_SYSTEM,
    user: prompt,
    purpose: "creative_direction",
  });

  return result.ok ? result.text : null;
}

export function runCreativeDirector(plan: MissionPlan): AgentOutput {
  const direction = deterministicDirection(plan);
  return {
    id: `${plan.id}-creative-direction`,
    missionId: plan.id,
    expert: "CreativeDirector",
    title: "Creative direction",
    kind: "plan",
    summary: direction,
    content: direction,
    artifactPaths: [],
    metadata: { industry: plan.industry, sport: /sport|performance|fitness/i.test(plan.industry) },
  };
}

export async function runCreativeDirectorAsync(plan: MissionPlan): Promise<AgentOutput> {
  const fallbackDirection = deterministicDirection(plan);
  const llmDirections = await enrichDirectionWithLlm(plan);

  const content = llmDirections ?? fallbackDirection;
  const summary = llmDirections
    ? llmDirections.split("\n")[0] ?? fallbackDirection
    : fallbackDirection;

  return {
    id: `${plan.id}-creative-direction`,
    missionId: plan.id,
    expert: "CreativeDirector",
    title: "Creative direction",
    kind: "plan",
    summary,
    content,
    artifactPaths: [],
    metadata: {
      industry: plan.industry,
      llmEnriched: Boolean(llmDirections),
      sport: /sport|performance|fitness/i.test(plan.industry),
    },
  };
}
