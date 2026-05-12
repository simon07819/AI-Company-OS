import type { ExpertRole, ProductionRequestType } from "./types";

const EXPERTS_BY_TYPE: Record<ProductionRequestType, ExpertRole[]> = {
  branding: ["BrandStrategist", "CreativeDirector", "LogoDesigner", "QualityDirector"],
  saas: ["BusinessStrategist", "SaaSArchitect", "UXDirector", "QualityDirector"],
  website: ["BusinessStrategist", "WebsiteArchitect", "UXDirector", "QualityDirector"],
  app: ["BusinessStrategist", "SaaSArchitect", "UXDirector", "QualityDirector"],
  "business-system": ["BusinessStrategist", "SaaSArchitect", "UXDirector", "QualityDirector"],
  unknown: ["BusinessStrategist", "QualityDirector"],
};

export function routeExperts(requestType: ProductionRequestType): ExpertRole[] {
  return [...EXPERTS_BY_TYPE[requestType]];
}
