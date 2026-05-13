import type { SkillBenchmarkCase } from "../types";

const simpleHidden = ["Brand system", "Marque à nommer", "score", "quality report", "artifacts", "JSON", "README", "workspace", "logs", "runtime", "ids", "process", "toolTrace", "checkpoints", "candidates", "playbookTrace", "coaching", "lessons", "benchmarks", "skillLab"];

export const routingBenchmarks: SkillBenchmarkCase[] = [
  {
    id: "skill_lab_route_website_with_logo",
    name: "Route website with logo as asset",
    prompt: "crée une landing page avec le logo EKIDA",
    expectedDeliverableType: "website",
    expectedVisibleOutputKind: "website_preview",
    expectedBrandName: "EKIDA",
    mustPass: ["websiteStructure", "notLogoOnly"],
    mustNotExposeInSimpleMode: simpleHidden,
  },
];

