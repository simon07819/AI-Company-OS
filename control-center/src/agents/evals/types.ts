import type { MissionRuntimeResult } from "@/agents/runtime/types";

export type EvalPreviousTurn = {
  prompt: string;
  expectedDeliverableType: string;
  expectedBrandName?: string;
};

export type EvalExpectation = {
  deliverableType: "logo" | "website" | "landing_page";
  visibleOutputKind: "visual" | "website_preview";
  brandName?: string;
  style?: string;
  industry?: string;
  mustContain?: string[];
  mustContainOneOf?: string[];
  mustNotContain?: string[];
  mustHavePrimaryVisual?: boolean;
  mustHavePrimaryArtifact?: boolean;
  mustUseWorkflow?: string;
  mustCallAgents?: string[];
  mustCallSkills?: string[];
  mustCallTools?: string[];
  mustHideInternalsInSimpleMode?: boolean;
  mustDifferFromPreviousPrimaryVisual?: boolean;
  mustBeWebsiteStructured?: boolean;
  mustBeLogoComposed?: boolean;
};

export type EvalCase = {
  id: string;
  name: string;
  prompt: string;
  previousTurns?: EvalPreviousTurn[];
  expected: EvalExpectation;
  tags: string[];
};

export type EvalResult = {
  id: string;
  status: "pass" | "fail";
  failures: string[];
  summary: string;
};

export type EvalRuntimeResult = {
  result: MissionRuntimeResult;
  previousResults: MissionRuntimeResult[];
};

export type RuntimeVisibleOutput = {
  kind?: string;
  deliverableType?: string;
  brandName?: string;
  mediaType?: string;
  primaryArtifactId?: string;
  primaryVisual?: string;
};
