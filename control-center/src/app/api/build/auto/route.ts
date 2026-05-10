import { NextRequest, NextResponse } from "next/server";
import { runProjectAction } from "@/lib/orchestrationBridge";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({})) as { project?: string };
  const result = await runProjectAction("auto-build", body.project);
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
