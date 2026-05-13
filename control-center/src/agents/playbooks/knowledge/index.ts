import { artifactProductionKnowledgePack } from "./artifact-production-knowledge";
import { brandStrategyKnowledgePack } from "./brand-strategy-knowledge";
import { frontendPreviewKnowledgePack } from "./frontend-preview-knowledge";
import { logoDesignKnowledgePack } from "./logo-design-knowledge";
import { qualityReviewKnowledgePack } from "./quality-review-knowledge";
import { svgProductionKnowledgePack } from "./svg-production-knowledge";
import { uxDesignKnowledgePack } from "./ux-design-knowledge";
import { websiteDesignKnowledgePack } from "./website-design-knowledge";

export const knowledgePackRegistry = {
  [logoDesignKnowledgePack.id]: logoDesignKnowledgePack,
  [brandStrategyKnowledgePack.id]: brandStrategyKnowledgePack,
  [uxDesignKnowledgePack.id]: uxDesignKnowledgePack,
  [websiteDesignKnowledgePack.id]: websiteDesignKnowledgePack,
  [frontendPreviewKnowledgePack.id]: frontendPreviewKnowledgePack,
  [svgProductionKnowledgePack.id]: svgProductionKnowledgePack,
  [qualityReviewKnowledgePack.id]: qualityReviewKnowledgePack,
  [artifactProductionKnowledgePack.id]: artifactProductionKnowledgePack,
};

export {
  artifactProductionKnowledgePack,
  brandStrategyKnowledgePack,
  frontendPreviewKnowledgePack,
  logoDesignKnowledgePack,
  qualityReviewKnowledgePack,
  svgProductionKnowledgePack,
  uxDesignKnowledgePack,
  websiteDesignKnowledgePack,
};
