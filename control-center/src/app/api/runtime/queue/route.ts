import { NextResponse } from "next/server";
import { listQueue, getQueueStats } from "@/lib/runtimeQueue";

export const dynamic = "force-dynamic";

export async function GET() {
  const queue = listQueue();
  const completedIds = new Set<string>();
  const stats = getQueueStats(completedIds);
  return NextResponse.json({ ok: true, queue, stats });
}
