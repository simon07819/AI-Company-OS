export const failurePatterns = {
  brandSystemLogo: "logo_request_routed_to_brand_system",
  unnamedBrand: "brand_placeholder_used",
  wrongInitial: "unrelated_initial_symbol",
  missingBlackBackground: "requested_black_background_missing",
  textOnlyLogo: "text_only_logo",
  websiteLogoOnly: "website_logo_only_output",
  websiteMissingStructure: "website_missing_page_structure",
  previousVisualRecycled: "previous_primary_visual_recycled",
  simpleModeLeak: "simple_mode_internal_leak",
  brandNameFullSentence: "brand_name_full_sentence",
} as const;

export function roleForFailurePattern(pattern: string) {
  if (/brand_placeholder|brand_name/.test(pattern)) return "product_owner";
  if (/wrong_initial|text_only|black_background/.test(pattern)) return "logo_designer";
  if (/website_logo|website_missing|previous_primary/.test(pattern)) return "frontend_builder";
  if (/simple_mode|brand_system/.test(pattern)) return "ceo";
  return "quality_director";
}
