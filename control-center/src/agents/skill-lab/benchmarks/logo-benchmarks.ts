import type { SkillBenchmarkCase } from "../types";

const simpleHidden = ["Brand system", "Marque à nommer", "score", "quality report", "artifacts", "JSON", "README", "workspace", "logs", "runtime", "ids", "process", "toolTrace", "checkpoints", "candidates", "playbookTrace", "coaching", "lessons", "benchmarks", "skillLab"];

export const logoBenchmarks: SkillBenchmarkCase[] = [
  {
    id: "skill_lab_logo_ekida_basic",
    name: "Logo EKIDA basic",
    prompt: "logo EKIDA",
    expectedDeliverableType: "logo",
    expectedVisibleOutputKind: "visual",
    expectedBrandName: "EKIDA",
    mustPass: ["primaryVisual", "primaryArtifact", "notBrandSystem", "notMarqueANommer", "notWrongInitial", "logoComposed"],
    mustNotExposeInSimpleMode: simpleHidden,
  },
  {
    id: "skill_lab_logo_ekida_black_background",
    name: "Logo EKIDA black background",
    prompt: "logo EKIDA sur fond noir",
    expectedDeliverableType: "logo",
    expectedVisibleOutputKind: "visual",
    expectedBrandName: "EKIDA",
    mustPass: ["primaryVisual", "primaryArtifact", "blackBackground", "notWrongInitial", "logoComposed"],
    mustNotExposeInSimpleMode: simpleHidden,
  },
  {
    id: "skill_lab_logo_sportif_elevio",
    name: "Logo sportif ELEVIO",
    prompt: "logo sportif ELEVIO",
    expectedDeliverableType: "logo",
    expectedVisibleOutputKind: "visual",
    expectedBrandName: "ELEVIO",
    mustPass: ["primaryVisual", "primaryArtifact", "logoComposed"],
    mustNotExposeInSimpleMode: simpleHidden,
  },
  {
    id: "skill_lab_logo_proshots_photo_sport",
    name: "Logo PROSHOTS photographers",
    prompt: "fais-moi un logo pour PROSHOTS ses des photographes sportifs",
    expectedDeliverableType: "logo",
    expectedVisibleOutputKind: "visual",
    expectedBrandName: "PROSHOTS",
    mustPass: ["primaryVisual", "primaryArtifact", "proshotsContext", "brandNameNotFullSentence", "logoComposed"],
    mustNotExposeInSimpleMode: simpleHidden,
  },
];

