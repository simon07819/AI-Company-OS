import { NextRequest, NextResponse } from "next/server";
import { rejectDecision } from "@/lib/ceoCommand";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const decisionId = body?.decisionId;
    if (!decisionId) {
      return NextResponse.json({ ok: false, message: "Missing decisionId" }, { status: 400 });
    }
    const result = rejectDecision(decisionId);
    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
