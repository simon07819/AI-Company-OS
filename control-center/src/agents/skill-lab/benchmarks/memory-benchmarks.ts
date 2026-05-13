import type { SkillBenchmarkCase } from "../types";

const simpleHidden = ["Brand system", "Marque à nommer", "score", "quality report", "artifacts", "JSON", "README", "workspace", "logs", "runtime", "ids", "process", "toolTrace", "checkpoints", "candidates", "playbookTrace", "coaching", "lessons", "benchmarks", "skillLab"];

export const memoryBenchmarks: SkillBenchmarkCase[] = [
  {
    id: "skill_lab_memory_modify_logo_allowed",
    name: "Modify logo can reuse compatible artifact",
    previousTurns: [{ prompt: "logo EKIDA", expectedDeliverableType: "logo", expectedBrandName: "EKIDA" }],
    prompt: "modifie ce logo en noir",
    expectedDeliverableType: "logo",
    expectedVisibleOutputKind: "visual",
    expectedBrandName: "EKIDA",
    mustPass: ["primaryVisual", "primaryArtifact", "blackBackground"],
    mustNotExposeInSimpleMode: simpleHidden,
  },
  {
    id: "skill_lab_memory_new_brand_blocks_reuse",
    name: "New brand blocks previous logo reuse",
    previousTurns: [{ prompt: "logo EKIDA", expectedDeliverableType: "logo", expectedBrandName: "EKIDA" }],
    prompt: "logo PROSHOTS pour photographes sportifs",
    expectedDeliverableType: "logo",
    expectedVisibleOutputKind: "visual",
    expectedBrandName: "PROSHOTS",
    mustPass: ["primaryVisual", "primaryArtifact", "proshotsContext", "notPreviousPrimaryVisual"],
    mustNotExposeInSimpleMode: simpleHidden,
  },
];

