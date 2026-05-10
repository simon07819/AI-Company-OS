import { NextResponse } from "next/server";
import { getSystemHealth } from "@/lib/systemHealth";

export const dynamic = "force-dynamic";

export async function GET() {
  const report = getSystemHealth();
  return NextResponse.json({ ok: true, health: report });
}
