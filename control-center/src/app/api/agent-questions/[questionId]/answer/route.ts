import { NextRequest, NextResponse } from "next/server";
import { answerQuestion, closeQuestion } from "@/lib/agentQuestions";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ questionId: string }> }
) {
  const { questionId } = await params;
  try {
    const body = await req.json();
    const optionId = body?.optionId;
    if (!optionId) {
      return NextResponse.json({ ok: false, message: "Missing optionId" }, { status: 400 });
    }
    const q = answerQuestion(questionId, optionId, body?.freeText);
    if (!q) {
      return NextResponse.json({ ok: false, message: "Question not found or already answered" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, question: q });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
