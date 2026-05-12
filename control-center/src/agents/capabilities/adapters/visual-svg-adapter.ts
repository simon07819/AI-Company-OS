import type { ToolAdapter } from "../types";

export const visualSvgAdapter: ToolAdapter<{ svg: string; brandName?: string }, { svg: string; valid: boolean; issues: string[] }> = {
  id: "visual.svg",
  name: "Visual SVG",
  description: "Validate and normalize SVG visual deliverables without exposing internal process in simple chat.",
  permissions: [{ id: "svg.render", description: "Render and validate SVG strings in memory.", allowed: true }],
  run(input) {
    const issues = [
      ...(!input.svg || !/<svg\b/i.test(input.svg) ? ["SVG missing"] : []),
      ...(!/viewBox=/i.test(input.svg) ? ["viewBox missing"] : []),
      ...(input.brandName && !input.svg.includes(input.brandName) ? ["brandName missing from SVG"] : []),
      ...(/>A<|>B</.test(input.svg) && input.brandName && !/[AB]/.test(input.brandName) ? ["unrelated generic initial"] : []),
    ];
    return { svg: input.svg, valid: issues.length === 0, issues };
  },
};
