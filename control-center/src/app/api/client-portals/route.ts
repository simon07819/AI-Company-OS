import { NextRequest, NextResponse } from "next/server";
import { createPortal, listPortals } from "@/lib/clientPortalStore";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ ok: true, portals: listPortals() });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({})) as Record<string, unknown>;
  const { title, conversationId, artifactIds, missionId } = body as {
    title?: string;
    conversationId?: string;
    artifactIds?: string[];
    missionId?: string;
  };

  if (!title || !conversationId) {
    return NextResponse.json({ ok: false, error: "title and conversationId required" }, { status: 400 });
  }

  const portal = createPortal({
    title: String(title),
    conversationId: String(conversationId),
    artifactIds: Array.isArray(artifactIds) ? artifactIds.map(String) : [],
    missionId: missionId ? String(missionId) : undefined,
  });

  const baseUrl = req.headers.get("origin") ?? req.headers.get("host") ?? "";
  const url = `${baseUrl.startsWith("http") ? baseUrl : `https://${baseUrl}`}/client/${portal.token}`;

  return NextResponse.json({ ok: true, token: portal.token, url });
}
