import { NextRequest, NextResponse } from "next/server";
import { archiveClient, restoreClient, softDeleteClient, updateClient } from "@/lib/clientCrm";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = await params;
  const body = await req.json().catch(() => ({}));
  const action = body.action as string | undefined;
  const client = action === "archive" ? archiveClient(clientId)
    : action === "restore" ? restoreClient(clientId)
      : updateClient(clientId, body);
  if (!client) return NextResponse.json({ ok: false, message: "Client not found" }, { status: 404 });
  return NextResponse.json({ ok: true, client });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = await params;
  const client = softDeleteClient(clientId);
  if (!client) return NextResponse.json({ ok: false, message: "Client not found" }, { status: 404 });
  return NextResponse.json({ ok: true, client });
}
