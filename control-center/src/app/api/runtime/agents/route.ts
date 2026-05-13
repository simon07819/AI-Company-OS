import { NextResponse } from "next/server";
import { getAllAgentStates } from "@/lib/agentRuntime";
import { requireUser } from "@/lib/auth/serverAuth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = requireUser(req);
  if (auth.response) return auth.response;

  const agents = getAllAgentStates();
  return NextResponse.json({ ok: true, agents, count: agents.length });
}
