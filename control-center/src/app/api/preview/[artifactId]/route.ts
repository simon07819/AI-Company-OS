import { type NextRequest, NextResponse } from "next/server";
import { listTraceableArtifacts } from "@/lib/providers/providerRegistry";

export const dynamic = "force-dynamic";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttribute(value: string): string {
  return escapeHtml(value).replace(/`/g, "&#96;");
}

function sanitizeSvg(svg: string): string {
  return svg
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/\s(?:href|xlink:href)\s*=\s*(?:"javascript:[^"]*"|'javascript:[^']*')/gi, "");
}

function strictHeaders() {
  return {
    "Content-Type": "text/html; charset=utf-8",
    "X-Frame-Options": "SAMEORIGIN",
    "Cache-Control": "no-store",
    "Content-Security-Policy": [
      "default-src 'none'",
      "img-src data: blob:",
      "style-src 'unsafe-inline'",
      "script-src 'none'",
      "base-uri 'none'",
      "form-action 'none'",
      "frame-ancestors 'self'",
    ].join("; "),
  };
}

function shell(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>
*{box-sizing:border-box}
body{margin:0;padding:16px;font-family:system-ui,-apple-system,sans-serif;background:#09090b;color:#f4f4f5;font-size:14px;line-height:1.6}
pre{margin:0;white-space:pre-wrap;word-break:break-word;background:#111113;border:1px solid #27272a;border-radius:8px;padding:16px;color:#e4e4e7}
.frame{width:100%;min-height:70vh;border:1px solid #27272a;border-radius:8px;background:white}
.svg-wrap{min-height:70vh;display:flex;align-items:center;justify-content:center}
.svg-wrap svg{max-width:100%;height:auto}
</style>
</head>
<body>${body}</body>
</html>`;
}

function htmlPreview(content: string, title: string): string {
  const srcDoc = escapeAttribute(content);
  return shell(title, `<iframe class="frame" sandbox="" referrerpolicy="no-referrer" srcdoc="${srcDoc}"></iframe>`);
}

function svgPreview(content: string, title: string): string {
  return shell(title, `<div class="svg-wrap">${sanitizeSvg(content)}</div>`);
}

function textPreview(content: string, title: string): string {
  return shell(title, `<pre>${escapeHtml(content)}</pre>`);
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ artifactId: string }> },
) {
  const { artifactId } = await params;
  const artifact = listTraceableArtifacts().find((a) => a.artifactId === artifactId);

  if (!artifact?.content) {
    return new NextResponse("Artifact introuvable.", { status: 404, headers: { "Content-Type": "text/plain" } });
  }

  const content = artifact.content.trim();
  const title = artifact.title || "Preview";

  if (content.startsWith("<!") || /<html[\s>]/i.test(content.slice(0, 100))) {
    return new NextResponse(htmlPreview(content, title), { headers: strictHeaders() });
  }

  if (/<svg[\s>]/i.test(content.slice(0, 200))) {
    return new NextResponse(svgPreview(content, title), { headers: strictHeaders() });
  }

  return new NextResponse(textPreview(content, title), { headers: strictHeaders() });
}
