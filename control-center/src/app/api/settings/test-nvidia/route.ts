import { NextResponse } from "next/server";
import { testNvidia } from "@/lib/settingsStore";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const result = await testNvidia();
    return NextResponse.json({ ok: true, result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
