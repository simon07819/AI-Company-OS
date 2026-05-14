/**
 * KPI Tracker — Suivi business par mission
 * Chaque mission génère des KPIs traçables: qualité, temps, itérations, valeur estimée.
 */

export interface MissionKpi {
  missionId: string;
  requestType: string;
  brandName: string | null;
  startedAt: string;
  completedAt: string;
  durationMs: number;
  qualityScore: number;
  iterationsUsed: number;
  approved: boolean;
  artifactCount: number;
  estimatedValue: number;
  deliverableType: string;
  agentsUsed: string[];
  directorApproved: boolean;
  revisionNeeded: boolean;
}

export interface KpiReport {
  mission: MissionKpi;
  scoreBreakdown: {
    quality: number;
    speed: number;
    completeness: number;
    overall: number;
  };
  businessImpact: {
    estimatedRevenue: number;
    timeToDelivery: string;
    qualityGrade: "A" | "B" | "C" | "D";
  };
  recommendation: string;
}

function estimateValue(requestType: string, qualityScore: number): number {
  const baseValues: Record<string, number> = {
    branding: 2500,
    logo: 800,
    website: 4000,
    saas: 8000,
    app: 6000,
    "business-system": 5000,
    unknown: 1000,
  };
  const base = baseValues[requestType] ?? 1000;
  const multiplier = qualityScore >= 90 ? 1.2 : qualityScore >= 80 ? 1.0 : qualityScore >= 70 ? 0.8 : 0.6;
  return Math.round(base * multiplier);
}

function qualityGrade(score: number): "A" | "B" | "C" | "D" {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  return "D";
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}min`;
}

function speedScore(durationMs: number): number {
  if (durationMs < 5000) return 100;
  if (durationMs < 15000) return 85;
  if (durationMs < 30000) return 70;
  if (durationMs < 60000) return 55;
  return 40;
}

function completenessScore(artifactCount: number, requestType: string): number {
  const expected: Record<string, number> = {
    branding: 7,
    logo: 5,
    website: 6,
    saas: 6,
    app: 5,
    "business-system": 4,
  };
  const exp = expected[requestType] ?? 4;
  return Math.min(100, Math.round((artifactCount / exp) * 100));
}

export function buildKpiReport(
  missionId: string,
  requestType: string,
  brandName: string | null,
  startedAt: Date,
  qualityScore: number,
  iterationsUsed: number,
  artifactCount: number,
  agentsUsed: string[],
  directorApproved: boolean,
  revisionNeeded: boolean,
  deliverableType?: string,
): KpiReport {
  const completedAt = new Date();
  const durationMs = completedAt.getTime() - startedAt.getTime();
  const estimatedValue = estimateValue(requestType, qualityScore);

  const mission: MissionKpi = {
    missionId,
    requestType,
    brandName,
    startedAt: startedAt.toISOString(),
    completedAt: completedAt.toISOString(),
    durationMs,
    qualityScore,
    iterationsUsed,
    approved: directorApproved,
    artifactCount,
    estimatedValue,
    deliverableType: deliverableType ?? requestType,
    agentsUsed,
    directorApproved,
    revisionNeeded,
  };

  const quality = qualityScore;
  const speed = speedScore(durationMs);
  const completeness = completenessScore(artifactCount, requestType);
  const overall = Math.round((quality * 0.5 + speed * 0.2 + completeness * 0.3));

  const grade = qualityGrade(qualityScore);
  const timeToDelivery = formatDuration(durationMs);
  const estimatedRevenue = estimatedValue;

  const recommendation = directorApproved
    ? `Mission ${requestType} complétée avec succès (${grade}). Livrable prêt pour présentation client.`
    : revisionNeeded
      ? `Score ${qualityScore}/100: révision recommandée avant présentation. Points à améliorer identifiés.`
      : `Mission en cours de validation. Score: ${qualityScore}/100.`;

  return {
    mission,
    scoreBreakdown: { quality, speed, completeness, overall },
    businessImpact: { estimatedRevenue, timeToDelivery, qualityGrade: grade },
    recommendation,
  };
}
