import { NextRequest, NextResponse } from "next/server";
import { linkMissionToClient } from "@/lib/clientCrm";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: { clientId: string } },
) {
  const { clientId } = params;
  try {
    const body = await req.json();
    const sessionId = body?.sessionId;
    if (!sessionId) {
      return NextResponse.json({ ok: false, message: "Missing sessionId" }, { status: 400 });
    }
    const client = linkMissionToClient(clientId, sessionId);
    if (!client) {
      return NextResponse.json({ ok: false, message: "Client not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, client });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
