import type { MissionRuntimeResult } from "@/agents/runtime/types";
import type { SkillBenchmarkCase } from "./types";

type VisibleOutput = {
  kind?: string;
  deliverableType?: string;
  brandName?: string;
  primaryVisual?: string;
  primaryArtifactId?: string;
};

function visible(result: MissionRuntimeResult): VisibleOutput {
  return result.visibleOutput as VisibleOutput;
}

function visibleText(result: MissionRuntimeResult) {
  const output = visible(result);
  return [output.kind, output.deliverableType, output.brandName, output.primaryVisual].filter(Boolean).join("\n");
}

function expectedTypeMatches(actual: string | undefined, expected: string) {
  if (expected === "website") return actual === "website" || actual === "landing_page";
  return actual === expected;
}

export function evaluateBenchmarkOutput(result: MissionRuntimeResult, benchmark: SkillBenchmarkCase, previousResult?: MissionRuntimeResult) {
  const failures: string[] = [];
  const output = visible(result);
  const text = visibleText(result);

  if (!expectedTypeMatches(output.deliverableType, benchmark.expectedDeliverableType)) failures.push(`deliverableType expected ${benchmark.expectedDeliverableType}, received ${output.deliverableType}`);
  if (output.kind !== benchmark.expectedVisibleOutputKind) failures.push(`visibleOutput.kind expected ${benchmark.expectedVisibleOutputKind}, received ${output.kind}`);
  if (benchmark.expectedBrandName && output.brandName !== benchmark.expectedBrandName) failures.push(`brandName expected ${benchmark.expectedBrandName}, received ${output.brandName}`);

  for (const rule of benchmark.mustPass) {
    if (rule === "primaryVisual" && !output.primaryVisual) failures.push("primaryVisual missing");
    if (rule === "primaryArtifact" && !output.primaryArtifactId) failures.push("primaryArtifactId missing");
    if (rule === "notBrandSystem" && /Brand system/i.test(text)) failures.push("Brand system visible");
    if (rule === "notMarqueANommer" && /Marque à nommer/i.test(text)) failures.push("Marque à nommer visible");
    if (rule === "notWrongInitial" && output.brandName === "EKIDA" && />\s*[AB]\s*</.test(text)) failures.push("EKIDA uses unrelated A/B initial");
    if (rule === "logoComposed") {
      const shapeCount = (text.match(/<(path|circle|rect|polygon|line)\b/g) ?? []).length;
      if (shapeCount < 3) failures.push("Logo composition is too close to text-only");
    }
    if (rule === "blackBackground" && !/(#000000|#000|black|rgb\(0,\s*0,\s*0\))/i.test(text)) failures.push("Requested black background missing");
    if (rule === "proshotsContext" && !/PROSHOTS|PS|camera|viewfinder|viseur|photo|sport|shoot/i.test(text)) failures.push("PROSHOTS lacks photo/sport signal");
    if (rule === "brandNameNotFullSentence" && /photographes sportifs|ses des/i.test(String(output.brandName ?? ""))) failures.push("brandName includes context sentence");
    if (rule === "websiteStructure" && !(/aria-label="nav"/.test(text) && /aria-label="hero"/.test(text) && /aria-label="sections"/.test(text) && /Voir la collection|Découvrir|CTA|Boutique|Collection/i.test(text))) failures.push("Website structure missing");
    if (rule === "notLogoOnly" && output.kind === "website_preview" && !/aria-label="sections"/.test(text)) failures.push("Website output is logo-only");
    if (rule === "notPreviousPrimaryVisual" && previousResult && output.primaryVisual === visible(previousResult).primaryVisual) failures.push("Previous primaryVisual reused");
    if (rule === "temporaryClothingContent" && !/linge|vêtement|vetement|collection|textile|apparel/i.test(text)) failures.push("Temporary clothing content missing");
    if (rule === "simpleModeClean") {
      const leak = benchmark.mustNotExposeInSimpleMode.find((term) => new RegExp(term, "i").test(text));
      if (leak) failures.push(`Simple mode leak: ${leak}`);
    }
  }

  for (const term of benchmark.mustNotExposeInSimpleMode) {
    if (new RegExp(term, "i").test(text)) failures.push(`Simple mode leak: ${term}`);
  }

  return Array.from(new Set(failures));
}

export function compareBenchmarkFailures(baselineFailures: string[], candidateFailures: string[]) {
  const improvements = baselineFailures.filter((failure) => !candidateFailures.includes(failure));
  const regressions = candidateFailures.filter((failure) => !baselineFailures.includes(failure));
  const safetyIssues = candidateFailures.filter((failure) => /secret|NVIDIA_API_KEY|\.env|simple mode leak|process|artifact|benchmark|skillLab/i.test(failure));
  return { improvements, regressions, safetyIssues };
}

