import { NextResponse } from "next/server";
import { listQueue, getQueueStats } from "@/lib/runtimeQueue";
import { requireUser } from "@/lib/auth/serverAuth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = requireUser(req);
  if (auth.response) return auth.response;

  const queue = listQueue();
  const completedIds = new Set<string>();
  const stats = getQueueStats(completedIds);
  return NextResponse.json({ ok: true, queue, stats });
}
