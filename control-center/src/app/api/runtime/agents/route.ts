import { NextResponse } from "next/server";
import { getAllAgentStates } from "@/lib/agentRuntime";

export const dynamic = "force-dynamic";

export async function GET() {
  const agents = getAllAgentStates();
  return NextResponse.json({ ok: true, agents, count: agents.length });
}
