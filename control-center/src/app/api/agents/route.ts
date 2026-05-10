import { NextResponse } from "next/server";
import { AGENTS } from "@/lib/agents";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    agents: AGENTS,
    total: AGENTS.length,
    available: AGENTS.filter((a) => a.status === "available").length,
    lastSelected: null,
  });
}
