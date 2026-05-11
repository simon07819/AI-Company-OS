import { NextResponse } from "next/server";
import { getSimpleAgencyViewModel } from "@/lib/simpleAgencyView";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ ok: true, view: getSimpleAgencyViewModel() });
}
