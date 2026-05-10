import { NextRequest, NextResponse } from "next/server";
import { completeOnboarding } from "@/lib/onboarding";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const state = completeOnboarding({ preferences: body.preferences });
    return NextResponse.json({ ok: true, state });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
