import { NextRequest, NextResponse } from "next/server";
import { createBackup } from "@/lib/systemHealth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const note = body?.note ?? "Manual backup";
    const manifest = createBackup(note);
    if (!manifest) {
      return NextResponse.json({ ok: false, message: "Backup creation failed" }, { status: 500 });
    }
    return NextResponse.json({ ok: true, backup: manifest });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
