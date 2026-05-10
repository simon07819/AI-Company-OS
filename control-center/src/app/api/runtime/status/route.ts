import { NextResponse } from "next/server";
import { bridgeStatus } from "@/lib/orchestrationBridge";

export const dynamic = "force-dynamic";

export async function GET() {
  const result = bridgeStatus();
  return NextResponse.json({
    ...result,
    action: "runtime-status",
    message: "Runtime status checked without exposing provider secrets.",
  });
}
