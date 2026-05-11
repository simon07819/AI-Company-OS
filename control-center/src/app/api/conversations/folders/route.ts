import { NextRequest, NextResponse } from "next/server";
import { listFolders, createFolder } from "@/lib/conversationStore";

export const dynamic = "force-dynamic";

export async function GET() {
  const folders = listFolders();
  return NextResponse.json({ ok: true, folders });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const name = body?.name;
    if (!name) return NextResponse.json({ ok: false, message: "Missing name" }, { status: 400 });
    const folder = createFolder(name, body?.color);
    return NextResponse.json({ ok: true, folder });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
