import { NextResponse } from "next/server";
import { localControl } from "@/lib/orchestrationBridge";

export const dynamic = "force-dynamic";

export async function POST() {
  return NextResponse.json(localControl("resume-factory"));
}
