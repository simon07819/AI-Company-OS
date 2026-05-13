import { logoEvalCases } from "./golden-cases/logo-cases";
import { memoryEvalCases } from "./golden-cases/memory-cases";
import { visibilityEvalCases } from "./golden-cases/visibility-cases";
import { websiteEvalCases } from "./golden-cases/website-cases";

export const ceoAgentEvalCases = [
  ...logoEvalCases,
  ...websiteEvalCases,
  ...memoryEvalCases,
  ...visibilityEvalCases,
];
