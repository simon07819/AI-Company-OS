import { NextRequest, NextResponse } from "next/server";
import { getSettings, saveSettings } from "@/lib/settingsStore";

export const dynamic = "force-dynamic";

export async function GET() {
  const settings = getSettings();
  return NextResponse.json({ ok: true, settings });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const updated = saveSettings(body);
    return NextResponse.json({ ok: true, settings: updated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
