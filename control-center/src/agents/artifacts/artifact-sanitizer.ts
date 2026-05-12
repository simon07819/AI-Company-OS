const SECRET_PATTERN = /NVIDIA_API_KEY|OPENAI_API_KEY|BEGIN [A-Z ]*PRIVATE KEY|\.env(?:\.local)?/i;
const SCRIPT_PATTERN = /<\s*script\b|javascript:|on[a-z]+\s*=|<\s*iframe\b/i;

export function assertNoArtifactSecrets(content: string) {
  if (SECRET_PATTERN.test(content)) throw new Error("Artifact content contains a blocked secret marker");
}

export function sanitizeSvgArtifact(svg: string) {
  assertNoArtifactSecrets(svg);
  if (!/<svg[\s>]/i.test(svg)) throw new Error("SVG artifact missing <svg>");
  if (!/\bviewBox\s*=/i.test(svg)) throw new Error("SVG artifact missing viewBox");
  if (SCRIPT_PATTERN.test(svg)) throw new Error("Unsafe SVG artifact blocked");
  if (/<\s*foreignObject\b/i.test(svg)) throw new Error("SVG foreignObject blocked");
  return svg.trim();
}

export function sanitizeHtmlPreview(html: string) {
  assertNoArtifactSecrets(html);
  if (SCRIPT_PATTERN.test(html)) throw new Error("Unsafe HTML preview blocked");
  return html.trim();
}
