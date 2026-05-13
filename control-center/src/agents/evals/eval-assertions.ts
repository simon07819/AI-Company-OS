import type { MissionRuntimeResult } from "@/agents/runtime/types";
import type { EvalExpectation, RuntimeVisibleOutput } from "./types";

const SIMPLE_FORBIDDEN = [
  "Brand system",
  "Marque à nommer",
  "quality report",
  "README",
  "workspace",
  "toolTrace",
  "checkpoints",
  "executionTrace",
  "runtime",
  "sessionId",
  "process",
  "logs",
];

function visible(result: MissionRuntimeResult): RuntimeVisibleOutput {
  return result.visibleOutput as RuntimeVisibleOutput;
}

function visibleText(result: MissionRuntimeResult) {
  const output = visible(result);
  return [output.kind, output.deliverableType, output.brandName, output.mediaType, output.primaryVisual].filter(Boolean).join("\n");
}

function failIf(condition: boolean, failures: string[], message: string) {
  if (condition) failures.push(message);
}

export function assertDeliverableType(result: MissionRuntimeResult, expectedType: string, failures: string[]) {
  failIf(visible(result).deliverableType !== expectedType, failures, `deliverableType attendu ${expectedType}, reçu ${visible(result).deliverableType}`);
}

export function assertVisibleOutputKind(result: MissionRuntimeResult, expectedKind: string, failures: string[]) {
  failIf(visible(result).kind !== expectedKind, failures, `visibleOutput.kind attendu ${expectedKind}, reçu ${visible(result).kind}`);
}

export function assertBrandName(result: MissionRuntimeResult, expectedBrandName: string, failures: string[]) {
  failIf(visible(result).brandName !== expectedBrandName, failures, `brandName attendu ${expectedBrandName}, reçu ${visible(result).brandName}`);
}

export function assertPrimaryVisualExists(result: MissionRuntimeResult, failures: string[]) {
  failIf(!visible(result).primaryVisual || !String(visible(result).primaryVisual).includes("<svg"), failures, "primaryVisual SVG manquant");
}

export function assertPrimaryArtifactExists(result: MissionRuntimeResult, failures: string[]) {
  failIf(!visible(result).primaryArtifactId, failures, "primaryArtifactId manquant");
}

export function assertDoesNotContainVisibleText(result: MissionRuntimeResult, forbiddenText: string, failures: string[]) {
  failIf(visibleText(result).includes(forbiddenText), failures, `texte interdit visible: ${forbiddenText}`);
}

export function assertContainsVisibleText(result: MissionRuntimeResult, requiredText: string, failures: string[]) {
  failIf(!visibleText(result).includes(requiredText), failures, `texte requis absent: ${requiredText}`);
}

export function assertNoSimpleModeInternals(result: MissionRuntimeResult, failures: string[]) {
  const text = visibleText(result);
  for (const term of SIMPLE_FORBIDDEN) {
    failIf(new RegExp(term, "i").test(text), failures, `détail interne visible en mode simple: ${term}`);
  }
  failIf(/\bscore\b|quality\s*report|artifacts?\b|JSON|fichiers|refinement|attempts/i.test(text), failures, "bruit interne visible dans le livrable simple");
}

export function assertNoBrandSystem(result: MissionRuntimeResult, failures: string[]) {
  assertDoesNotContainVisibleText(result, "Brand system", failures);
}

export function assertNoMarqueANommer(result: MissionRuntimeResult, failures: string[]) {
  assertDoesNotContainVisibleText(result, "Marque à nommer", failures);
}

export function assertNoGenericWrongInitial(result: MissionRuntimeResult, brandName: string, failures: string[]) {
  const text = visibleText(result);
  if (brandName === "EKIDA") {
    failIf(/>\s*[AB]\s*</.test(text), failures, "EKIDA ne doit pas utiliser A/B comme symbole principal");
  }
  if (brandName === "PROSHOTS") {
    failIf(!/PROSHOTS|PS|camera|viewfinder|sport|shoot/i.test(text), failures, "PROSHOTS doit contenir un signal photo/sport pertinent");
  }
}

export function assertWebsiteHasStructure(result: MissionRuntimeResult, failures: string[]) {
  const text = visibleText(result);
  for (const required of ["aria-label=\"nav\"", "aria-label=\"hero\"", "aria-label=\"sections\""]) {
    failIf(!text.includes(required), failures, `structure website absente: ${required}`);
  }
  failIf(!/Voir la collection|Découvrir|CTA|Boutique|Collection/i.test(text), failures, "CTA website absent");
}

export function assertLogoIsNotTextOnly(result: MissionRuntimeResult, failures: string[]) {
  const text = visibleText(result);
  const pathCount = (text.match(/<path\b/g) ?? []).length;
  const shapeCount = (text.match(/<(path|circle|rect|polygon|line)\b/g) ?? []).length;
  failIf(pathCount < 2 && shapeCount < 3, failures, "logo trop proche d'un texte seul");
}

export function assertNoPreviousPrimaryArtifactLeak(result: MissionRuntimeResult, previousResult: MissionRuntimeResult | undefined, failures: string[]) {
  if (!previousResult) return;
  const current = visible(result).primaryVisual;
  const previous = visible(previousResult).primaryVisual;
  failIf(Boolean(current && previous && current === previous), failures, "ancien primaryVisual recyclé comme réponse principale");
}

export function assertHiddenDetailsOnlyVisibleInDetailsMode(result: MissionRuntimeResult, failures: string[]) {
  const text = visibleText(result);
  const hidden = JSON.stringify(result.hiddenDetails);
  failIf(!/executionTrace|qualityResults|artifacts|checkpoints/i.test(hidden), failures, "hiddenDetails ne contient pas les détails attendus");
  failIf(/executionTrace|qualityResults|checkpoints|toolTrace/i.test(text), failures, "hiddenDetails exposés dans visibleOutput");
}

export function evaluateRuntimeResult(input: {
  result: MissionRuntimeResult;
  previousResults?: MissionRuntimeResult[];
  expected: EvalExpectation;
}) {
  const failures: string[] = [];
  const previous = input.previousResults?.at(-1);

  assertDeliverableType(input.result, input.expected.deliverableType, failures);
  assertVisibleOutputKind(input.result, input.expected.visibleOutputKind, failures);
  if (input.expected.brandName) assertBrandName(input.result, input.expected.brandName, failures);
  if (input.expected.style) failIf(input.result.workOrder.style !== input.expected.style, failures, `style attendu ${input.expected.style}, reçu ${input.result.workOrder.style}`);
  if (input.expected.industry) failIf(input.result.workOrder.industry !== input.expected.industry, failures, `industry attendu ${input.expected.industry}, reçu ${input.result.workOrder.industry}`);
  if (input.expected.mustHavePrimaryVisual) assertPrimaryVisualExists(input.result, failures);
  if (input.expected.mustHavePrimaryArtifact) assertPrimaryArtifactExists(input.result, failures);
  for (const required of input.expected.mustContain ?? []) assertContainsVisibleText(input.result, required, failures);
  if (input.expected.mustContainOneOf?.length) {
    failIf(!input.expected.mustContainOneOf.some((term) => visibleText(input.result).includes(term)), failures, `aucun des textes requis présent: ${input.expected.mustContainOneOf.join(", ")}`);
  }
  for (const forbidden of input.expected.mustNotContain ?? []) assertDoesNotContainVisibleText(input.result, forbidden, failures);
  if (input.expected.mustHideInternalsInSimpleMode) assertNoSimpleModeInternals(input.result, failures);
  assertNoBrandSystem(input.result, failures);
  assertNoMarqueANommer(input.result, failures);
  if (input.expected.brandName) assertNoGenericWrongInitial(input.result, input.expected.brandName, failures);
  if (input.expected.mustBeWebsiteStructured) assertWebsiteHasStructure(input.result, failures);
  if (input.expected.mustBeLogoComposed) assertLogoIsNotTextOnly(input.result, failures);
  if (input.expected.mustDifferFromPreviousPrimaryVisual) assertNoPreviousPrimaryArtifactLeak(input.result, previous, failures);
  if (input.expected.mustUseWorkflow) failIf(input.result.missionPlan.workflowId !== input.expected.mustUseWorkflow, failures, `workflow attendu ${input.expected.mustUseWorkflow}, reçu ${input.result.missionPlan.workflowId}`);
  for (const agent of input.expected.mustCallAgents ?? []) failIf(!input.result.hiddenDetails.executionTrace.agentsCalled.includes(agent), failures, `agent non appelé: ${agent}`);
  for (const skill of input.expected.mustCallSkills ?? []) failIf(!input.result.hiddenDetails.executionTrace.skillsCalled.includes(skill), failures, `skill non appelée: ${skill}`);
  for (const tool of input.expected.mustCallTools ?? []) failIf(!input.result.hiddenDetails.executionTrace.toolsCalled.includes(tool), failures, `tool non appelé: ${tool}`);
  assertHiddenDetailsOnlyVisibleInDetailsMode(input.result, failures);

  return failures;
}
