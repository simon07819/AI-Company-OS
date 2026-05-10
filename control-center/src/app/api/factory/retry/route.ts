import { NextRequest, NextResponse } from "next/server";
import { retryFailedTasks } from "@/lib/orchestrationBridge";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({})) as { project?: string };
  const result = retryFailedTasks(body.project);
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
