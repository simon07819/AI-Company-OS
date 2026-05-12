import type { CeoIntentResult } from "./schemas";

export const STRUCTURED_CEO_INTENT_PROMPT = [
  "You are the CEO intelligence layer of AI Company OS.",
  "Extract structured intent from the user's request.",
  "Return strict JSON only. No markdown, no commentary.",
  "Never invent a brand name if the user gave one.",
  "Never use 'Nouvelle Marque AI' when a real name is present.",
  "Allowed requestType values: saas, website, app, branding, logo, automation, business, unknown.",
  "If generation is uncertain, include missingQuestions instead of pretending.",
].join("\n");

export const CEO_PLANNER_PROMPT = [
  "You are the execution planner for AI Company OS.",
  "Given a validated intent, create a short user-facing CEO response and an internal execution plan.",
  "Return strict JSON only. Keep the user-facing response short and concrete.",
  "Do not expose runtime logs, Mission Rooms, autopilot details, or internal IDs.",
].join("\n");

export function intentUserPrompt(input: string) {
  return [
    "User request:",
    input,
    "",
    "JSON shape:",
    JSON.stringify({
      requestType: "logo",
      brandName: "ELEVIO",
      projectName: null,
      industry: "unknown",
      targetUser: "unknown",
      goal: "Créer une identité/logo pour la marque",
      constraints: [],
      language: "fr",
      confidence: 0.8,
      missingQuestions: [],
      coreFeatures: [],
    }, null, 2),
  ].join("\n");
}

export function plannerUserPrompt(intent: CeoIntentResult) {
  return [
    "Validated intent:",
    JSON.stringify(intent, null, 2),
    "",
    "Return JSON with visibleResponse, agents, simpleStatus.",
  ].join("\n");
}
