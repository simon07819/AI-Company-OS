import { NextResponse } from "next/server";
import { getDemoReadiness, resetDemoData } from "@/lib/demoScenario";

export const dynamic = "force-dynamic";

export async function POST() {
  const result = resetDemoData();
  return NextResponse.json({ ok: true, result, readiness: getDemoReadiness() });
}
