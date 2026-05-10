import { NextResponse } from "next/server";
import { resetRuntime } from "@/lib/agentRuntime";
import { clearQueue } from "@/lib/runtimeQueue";

export const dynamic = "force-dynamic";

export async function POST() {
  resetRuntime();
  clearQueue();
  return NextResponse.json({ ok: true, message: "Runtime reset — all agents idle, queue cleared." });
}
