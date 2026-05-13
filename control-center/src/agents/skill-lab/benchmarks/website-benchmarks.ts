import type { SkillBenchmarkCase } from "../types";

const simpleHidden = ["Brand system", "Marque à nommer", "score", "quality report", "artifacts", "JSON", "README", "workspace", "logs", "runtime", "ids", "process", "toolTrace", "checkpoints", "candidates", "playbookTrace", "coaching", "lessons", "benchmarks", "skillLab"];

export const websiteBenchmarks: SkillBenchmarkCase[] = [
  {
    id: "skill_lab_website_ekida_after_logo",
    name: "Website EKIDA after logo",
    previousTurns: [{ prompt: "logo EKIDA", expectedDeliverableType: "logo", expectedBrandName: "EKIDA" }],
    prompt: "Je veux une page web bien simple avec le logo ekida, tu peux mettre du contenu temporaire ses une compagnie de linge",
    expectedDeliverableType: "website",
    expectedVisibleOutputKind: "website_preview",
    expectedBrandName: "EKIDA",
    mustPass: ["primaryVisual", "primaryArtifact", "websiteStructure", "notLogoOnly", "notPreviousPrimaryVisual", "temporaryClothingContent"],
    mustNotExposeInSimpleMode: simpleHidden,
  },
  {
    id: "skill_lab_website_ekida_direct",
    name: "Website EKIDA direct",
    prompt: "fais-moi un site simple pour EKIDA, compagnie de linge",
    expectedDeliverableType: "website",
    expectedVisibleOutputKind: "website_preview",
    expectedBrandName: "EKIDA",
    mustPass: ["primaryVisual", "primaryArtifact", "websiteStructure", "temporaryClothingContent"],
    mustNotExposeInSimpleMode: simpleHidden,
  },
];

