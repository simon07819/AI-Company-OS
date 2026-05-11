import { NextRequest, NextResponse } from "next/server";
import { delegateTask } from "@/lib/ceoCommand";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const sessionId = body?.sessionId;
    const agentId = body?.agentId;
    if (!sessionId || !agentId) {
      return NextResponse.json({ ok: false, message: "Missing sessionId or agentId" }, { status: 400 });
    }
    const result = delegateTask(sessionId, agentId);
    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
