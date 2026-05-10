import { NextResponse } from "next/server";
import { getExecutiveAlerts } from "@/lib/executiveCommand";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ ok: true, alerts: getExecutiveAlerts() });
}
