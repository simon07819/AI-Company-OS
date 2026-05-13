import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/serverAuth";
import { resetRuntime } from "@/lib/agentRuntime";
import { clearQueue } from "@/lib/runtimeQueue";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const auth = requireAdmin(req);
  if (auth.response) return auth.response;

  resetRuntime();
  clearQueue();
  return NextResponse.json({ ok: true, message: "Runtime reset — all agents idle, queue cleared." });
}
