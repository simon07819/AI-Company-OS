import { generateBrandBrief } from "@/lib/brand-builder";
import { generateWithLlm } from "@/lib/ai/llmClient";
import type { AgentOutput, MissionPlan } from "@/lib/orchestrator/types";

const BRAND_STRATEGIST_SYSTEM = `Tu es le Brand Strategist de AI Company OS.
Tu analyses les briefs et définis le positionnement stratégique des marques.
Tu fournis des recommandations concrètes: positionnement, audience, valeurs, ton, différenciation.
Réponds toujours dans la langue de l'utilisateur (français ou anglais).`;

async function enrichBriefWithLlm(plan: MissionPlan, brief: ReturnType<typeof generateBrandBrief>): Promise<string | null> {
  const prompt = `Analyse ce brief de marque et fournis une stratégie de positionnement en 3-4 phrases:

Marque: ${plan.brandName ?? brief.brandName}
Secteur: ${plan.industry}
Audience: ${plan.audience}
Demande originale: ${plan.sourcePrompt}

Focus sur: positionnement unique, valeurs clés, ton de communication, différenciation concurrentielle.`;

  const result = await generateWithLlm({
    system: BRAND_STRATEGIST_SYSTEM,
    user: prompt,
    purpose: "brand_strategy",
  });

  return result.ok ? result.text : null;
}

export function runBrandStrategist(plan: MissionPlan): AgentOutput {
  const brief = generateBrandBrief(plan.sourcePrompt);
  const summary = `${brief.brandName} doit être positionné avec une personnalité ${brief.brandPersonality.join(", ")} pour ${brief.targetAudience}.`;
  return {
    id: `${plan.id}-brand-strategy`,
    missionId: plan.id,
    expert: "BrandStrategist",
    title: "Brand strategy brief",
    kind: "brief",
    summary,
    content: JSON.stringify(brief, null, 2),
    artifactPaths: [],
    metadata: { brief },
  };
}

export async function runBrandStrategistAsync(plan: MissionPlan): Promise<AgentOutput> {
  const brief = generateBrandBrief(plan.sourcePrompt);
  const baseSummary = `${brief.brandName} — personnalité: ${brief.brandPersonality.join(", ")} — audience: ${brief.targetAudience}.`;
  const llmEnrichment = await enrichBriefWithLlm(plan, brief);

  const summary = llmEnrichment ?? baseSummary;
  const content = JSON.stringify({
    ...brief,
    strategistAnalysis: llmEnrichment ?? null,
    brandName: plan.brandName ?? brief.brandName,
    industry: plan.industry,
    audience: plan.audience,
  }, null, 2);

  return {
    id: `${plan.id}-brand-strategy`,
    missionId: plan.id,
    expert: "BrandStrategist",
    title: "Brand strategy brief",
    kind: "brief",
    summary,
    content,
    artifactPaths: [],
    metadata: { brief, llmEnriched: Boolean(llmEnrichment) },
  };
}
