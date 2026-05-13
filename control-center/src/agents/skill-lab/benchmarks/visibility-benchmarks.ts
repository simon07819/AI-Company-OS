import type { SkillBenchmarkCase } from "../types";

export const simpleModeForbiddenTerms = ["Brand system", "Marque à nommer", "LOGO", "Prototype visuel", "score", "quality report", "artifacts", "fichiers", "JSON", "README", "workspace", "logs", "runtime", "ids", "process", "toolTrace", "checkpoints", "candidates", "playbookTrace", "coaching", "lessons", "benchmarks", "skillLab"];

export const visibilityBenchmarks: SkillBenchmarkCase[] = [
  {
    id: "skill_lab_visibility_logo_simple",
    name: "Logo simple mode visibility",
    prompt: "logo EKIDA",
    expectedDeliverableType: "logo",
    expectedVisibleOutputKind: "visual",
    expectedBrandName: "EKIDA",
    mustPass: ["primaryVisual", "simpleModeClean"],
    mustNotExposeInSimpleMode: simpleModeForbiddenTerms,
  },
  {
    id: "skill_lab_visibility_website_simple",
    prompt: "Je veux une page web bien simple avec le logo ekida, tu peux mettre du contenu temporaire ses une compagnie de linge",
    name: "Website simple mode visibility",
    expectedDeliverableType: "website",
    expectedVisibleOutputKind: "website_preview",
    expectedBrandName: "EKIDA",
    mustPass: ["primaryVisual", "websiteStructure", "simpleModeClean"],
    mustNotExposeInSimpleMode: simpleModeForbiddenTerms,
  },
];

