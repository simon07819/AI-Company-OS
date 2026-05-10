import { NextResponse } from "next/server";
import { getBusinessPipeline } from "@/lib/businessOps";

export const dynamic = "force-dynamic";

export async function GET() {
  const pipeline = getBusinessPipeline();
  return NextResponse.json({ ok: true, pipeline });
}
