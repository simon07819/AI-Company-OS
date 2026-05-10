import { NextResponse } from "next/server";
import { getExecutiveCommandOverview } from "@/lib/executiveCommand";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ ok: true, overview: getExecutiveCommandOverview() });
}
