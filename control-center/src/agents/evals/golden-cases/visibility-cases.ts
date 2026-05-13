import type { EvalCase } from "../types";

export const visibilityEvalCases: EvalCase[] = [
  {
    id: "simple_chat_logo_visibility",
    name: "Logo simple sans bruit interne",
    prompt: "logo EKIDA",
    tags: ["visibility", "simple-mode"],
    expected: {
      deliverableType: "logo",
      visibleOutputKind: "visual",
      brandName: "EKIDA",
      mustHavePrimaryVisual: true,
      mustHavePrimaryArtifact: true,
      mustNotContain: [
        "Brand system",
        "Marque à nommer",
        "LOGO",
        "Prototype visuel",
        "score",
        "quality report",
        "artifacts",
        "JSON",
        "README",
        "workspace",
        "logs",
        "runtime",
        "process",
        "toolTrace",
        "checkpoints",
      ],
      mustHideInternalsInSimpleMode: true,
    },
  },
];
