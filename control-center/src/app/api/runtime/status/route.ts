import { NextResponse } from "next/server";
import { bridgeStatus } from "@/lib/orchestrationBridge";
import { getAutopilotStatus } from "@/lib/autopilot";
import { requireUser } from "@/lib/auth/serverAuth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = requireUser(req);
  if (auth.response) return auth.response;

  const result = bridgeStatus();
  return NextResponse.json({
    ...result,
    action: "runtime-status",
    message: "Runtime status checked without exposing provider secrets.",
    autopilot: getAutopilotStatus(),
  });
}
