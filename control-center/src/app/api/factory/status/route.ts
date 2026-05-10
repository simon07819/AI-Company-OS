import { NextResponse } from "next/server";
import { bridgeStatus } from "@/lib/orchestrationBridge";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(bridgeStatus());
}
