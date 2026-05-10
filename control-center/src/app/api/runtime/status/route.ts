import { NextResponse } from "next/server";
import { bridgeStatus } from "@/lib/orchestrationBridge";
import { getAutopilotStatus } from "@/lib/autopilot";

export const dynamic = "force-dynamic";

export async function GET() {
  const result = bridgeStatus();
  return NextResponse.json({
    ...result,
    action: "runtime-status",
    message: "Runtime status checked without exposing provider secrets.",
    autopilot: getAutopilotStatus(),
  });
}
