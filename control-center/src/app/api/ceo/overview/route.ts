import { NextResponse } from "next/server";
import { getCeoOverview } from "@/lib/ceoCommand";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const overview = getCeoOverview();
    return NextResponse.json({ ok: true, overview });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
