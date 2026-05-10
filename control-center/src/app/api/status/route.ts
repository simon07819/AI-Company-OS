import { NextResponse } from "next/server";
import { getSystemStatus } from "@/lib/systemStatus";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const status = getSystemStatus();
    return NextResponse.json(status);
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: String(err) },
      { status: 500 }
    );
  }
}
