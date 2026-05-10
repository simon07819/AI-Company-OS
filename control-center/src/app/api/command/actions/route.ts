import { NextResponse } from "next/server";
import { getExecutiveActions } from "@/lib/executiveCommand";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ ok: true, actions: getExecutiveActions() });
}
