import { NextRequest, NextResponse } from "next/server";
import { startAutopilot } from "@/lib/autopilot";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const session = startAutopilot(body);
  return NextResponse.json({
    ok: true,
    message: "Autopilot session started.",
    session,
  });
}
