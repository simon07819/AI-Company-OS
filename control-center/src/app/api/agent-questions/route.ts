import { NextRequest, NextResponse } from "next/server";
import { listOpenQuestions, createAgentQuestion } from "@/lib/agentQuestions";
import { type AgentId } from "@/lib/agentProfiles";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const missionId = url.searchParams.get("missionId") ?? undefined;
  const threadId = url.searchParams.get("threadId") ?? undefined;
  const agentIdRaw = url.searchParams.get("agentId");
  const agentId = agentIdRaw ? (agentIdRaw as AgentId) : undefined;
  const questions = listOpenQuestions({ missionId, threadId, agentId });
  return NextResponse.json({ ok: true, questions });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body?.question || !body?.agentId || !body?.options) {
      return NextResponse.json({ ok: false, message: "Missing question, agentId, or options" }, { status: 400 });
    }
    const q = createAgentQuestion({
      agentId: body.agentId,
      agentName: body.agentName ?? body.agentId,
      agentAvatar: body.agentAvatar ?? "🤖",
      agentColor: body.agentColor ?? "#94a3b8",
      question: body.question,
      options: body.options,
      missionId: body.missionId ?? null,
      threadId: body.threadId ?? null,
      taskId: body.taskId ?? null,
      context: body.context ?? "",
    });
    return NextResponse.json({ ok: true, question: q });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
