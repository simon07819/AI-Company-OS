export type BrandRequestType = "logo" | "branding" | "app" | "site" | "business" | "unknown";
export type VisualDirectionId = "premium-corporate" | "vertical-movement" | "safety-infrastructure";

export interface BrandPaletteColor {
  name: string;
  hex: string;
  justification: string;
}

export interface BrandBrief {
  requestType: BrandRequestType;
  brandName: string;
  explicitBrandName: boolean;
  industry: string;
  industryConfidence: "explicit" | "inferred" | "weak";
  industryAssumption: string;
  targetAudience: string;
  brandPersonality: string[];
  creativeDirection: string;
  logoPrompt: string;
  taglineOptions: string[];
  colorPalette: BrandPaletteColor[];
  typographyRecommendation: string;
  concepts: string[];
  recommendedConcept: string;
}

export interface LogoConcept {
  id: VisualDirectionId;
  label: "A" | "B" | "C";
  title: string;
  brandName: string;
  tagline: string;
  palette: BrandPaletteColor[];
  typography: string;
  rationale: string;
  keywords: string[];
  visualStyle: "construction-tech" | "vertical-signal" | "safety-reliability";
  recommended: boolean;
  prototypeNotice: string;
  imagePrompt: string;
}

