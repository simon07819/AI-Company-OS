import fs from "fs";
import path from "path";
import type { AgentOutput, MissionPlan, QualityCheck, QualityReport } from "./types";

function exists(artifactPath: string) {
  const absolute = path.isAbsolute(artifactPath) ? artifactPath : path.resolve(process.cwd(), artifactPath);
  return fs.existsSync(absolute);
}

function textOf(outputs: AgentOutput[]) {
  return outputs.map((output) => `${output.title}\n${output.summary}\n${output.content ?? ""}`).join("\n").toLowerCase();
}

function uniqueSignatures(outputs: AgentOutput[]) {
  const signatures = new Set<string>();
  for (const output of outputs) {
    const signature = String(output.metadata?.layoutSignature ?? output.metadata?.id ?? output.title).toLowerCase();
    signatures.add(signature);
  }
  const directions = outputs.flatMap((output) => {
    const raw = output.metadata?.directions;
    if (!Array.isArray(raw)) return [];
    return raw.map((item) => String((item as { layoutSignature?: string; id?: string }).layoutSignature ?? (item as { id?: string }).id ?? ""));
  }).filter(Boolean);
  for (const direction of directions) signatures.add(direction.toLowerCase());
  return signatures;
}

function check(id: string, title: string, passed: boolean, reason: string, weight: number): QualityCheck {
  return { id, title, passed, reason, weight };
}

function score(checks: QualityCheck[]) {
  const total = checks.reduce((sum, item) => sum + item.weight, 0) || 1;
  const passed = checks.filter((item) => item.passed).reduce((sum, item) => sum + item.weight, 0);
  return Math.round((passed / total) * 100);
}

export function scoreProductionOutput(plan: MissionPlan, outputs: AgentOutput[], artifactPaths: string[]): QualityReport {
  const allText = textOf(outputs);
  const realArtifacts = artifactPaths.filter(exists);
  const missingArtifacts = artifactPaths.filter((artifactPath) => !exists(artifactPath));
  const checks: QualityCheck[] = [
    check("real-artifacts", "Artifacts réels présents", realArtifacts.length > 0 && missingArtifacts.length === 0, missingArtifacts.length ? `Artifacts manquants: ${missingArtifacts.join(", ")}` : `${realArtifacts.length} artifact(s) existent.`, 20),
    check("no-placeholder", "Aucun placeholder générique", !/nouvelle marque ai|lorem ipsum|template generic|generic boilerplate/.test(allText), "Le résultat ne doit pas contenir de placeholder visible.", 14),
  ];

  if (plan.requestType === "branding") {
    const brandName = (plan.brandName ?? "").toLowerCase();
    const signatures = uniqueSignatures(outputs);
    const svgCount = realArtifacts.filter((artifactPath) => artifactPath.endsWith(".svg")).length;
    checks.push(
      check("brand-name", "Nom de marque respecté", Boolean(brandName && allText.includes(brandName)), `Nom attendu: ${plan.brandName ?? "non défini"}.`, 16),
      check("three-distinct-directions", "Directions distinctes", signatures.size >= 3, `${signatures.size} signature(s) de layout détectée(s).`, 18),
      check("visual-prototypes", "Prototypes visuels présents", svgCount >= 3, `${svgCount} SVG prototype(s) détecté(s).`, 16),
      check("industry-fit", "Secteur reflété", !/sport|performance/.test(plan.industry) || /sport|performance|athlet|vitesse|motion|énergie|energie/.test(allText), `Secteur demandé: ${plan.industry}.`, 16),
    );
  } else if (plan.requestType === "saas" || plan.requestType === "website" || plan.requestType === "app") {
    checks.push(
      check("readme", "README présent", realArtifacts.some((artifactPath) => artifactPath.endsWith("README.md")), "README obligatoire.", 14),
      check("spec", "Spec produit présente", realArtifacts.some((artifactPath) => artifactPath.endsWith("product-spec.json")), "product-spec.json obligatoire.", 14),
      check("domain-fit", "Domaine reflété", plan.industry === "unknown" || allText.includes(plan.industry.toLowerCase()) || artifactPaths.join("\n").toLowerCase().includes(plan.industry.toLowerCase()), `Domaine attendu: ${plan.industry}.`, 18),
    );
  }

  const finalScore = score(checks);
  const rejectedReasons = checks.filter((item) => !item.passed).map((item) => item.reason);
  const recommendations = checks.filter((item) => !item.passed).map((item) => `Corriger: ${item.title}`);
  return {
    id: `${plan.id}-quality-${Date.now().toString(36)}`,
    missionId: plan.id,
    score: finalScore,
    passed: finalScore >= plan.minimumQualityScore && rejectedReasons.length === 0,
    checks,
    rejectedReasons,
    recommendations,
    createdAt: new Date().toISOString(),
  };
}
