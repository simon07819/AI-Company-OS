import { NextResponse } from "next/server";
import { getDemoReadiness } from "@/lib/demoScenario";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ ok: true, readiness: getDemoReadiness() });
}
