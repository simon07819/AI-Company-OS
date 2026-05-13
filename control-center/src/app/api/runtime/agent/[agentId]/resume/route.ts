import { NextRequest, NextResponse } from "next/server";
import { resumeAgent, getAgentState } from "@/lib/agentRuntime";
import { requireAdmin } from "@/lib/auth/serverAuth";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const auth = requireAdmin(req);
  if (auth.response) return auth.response;

  const { agentId } = await params;
  const ok = resumeAgent(agentId);

  if (!ok) {
    return NextResponse.json(
      { ok: false, message: `Agent '${agentId}' not found.` },
      { status: 404 }
    );
  }

  return NextResponse.json({
    ok: true,
    message: `Agent '${agentId}' resumed.`,
    agent: getAgentState(agentId),
  });
}
