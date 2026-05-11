import { NextResponse } from "next/server";
import { getMessages } from "@/lib/ceoCommand";

export const dynamic = "force-dynamic";

export async function GET() {
  const messages = getMessages(100);
  return NextResponse.json({ ok: true, messages });
}
