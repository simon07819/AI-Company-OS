import { NextRequest, NextResponse } from "next/server";
import { runAction } from "@/lib/runner";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ action: string }> }
) {
  const { action } = await params;

  let body: Record<string, string> = {};
  try {
    body = await req.json();
  } catch {
    // empty body is fine for some actions
  }

  const result = await runAction(action, body);
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
