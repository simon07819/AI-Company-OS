import { NextRequest, NextResponse } from "next/server";
import { sendMessage } from "@/lib/ceoCommand";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const text = body?.text;
    if (!text || typeof text !== "string") {
      return NextResponse.json({ ok: false, message: "Missing text" }, { status: 400 });
    }
    const response = sendMessage(text);
    return NextResponse.json({ ok: true, response });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
