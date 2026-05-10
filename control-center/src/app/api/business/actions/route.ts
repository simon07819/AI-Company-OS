import { NextResponse } from "next/server";
import { getRecommendedActions } from "@/lib/businessOps";

export const dynamic = "force-dynamic";

export async function GET() {
  const actions = getRecommendedActions();
  return NextResponse.json({ ok: true, actions });
}
