import { type NextRequest, NextResponse } from "next/server";
import { listTraceableArtifacts } from "@/lib/providers/providerRegistry";

export const dynamic = "force-dynamic";

function inferExt(content: string, type: string): string {
  if (type === "code" || type === "nvidia_text") return "tsx";
  const trimmed = content.trimStart();
  if (trimmed.startsWith("<svg")) return "svg";
  if (trimmed.startsWith("<!") || /<html[\s>]/i.test(trimmed.slice(0, 80))) return "html";
  return "txt";
}

function safeFilename(title: string, ext: string): string {
  return `${title.replace(/[^a-zA-Z0-9\-_]/g, "-").replace(/-+/g, "-").slice(0, 60)}.${ext}`;
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

  const ext = inferExt(artifact.content, artifact.type);
  const filename = safeFilename(artifact.title, ext);

  return new NextResponse(artifact.content, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
