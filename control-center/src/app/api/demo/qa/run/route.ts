import { NextResponse } from "next/server";
import { runDemoQa } from "@/lib/demoQa";

export const dynamic = "force-dynamic";

export async function POST() {
  const result = runDemoQa();
  return NextResponse.json({ ok: true, qa: result });
}
