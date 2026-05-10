import { NextResponse } from "next/server";
import { listBackups } from "@/lib/systemHealth";

export const dynamic = "force-dynamic";

export async function GET() {
  const backups = listBackups();
  return NextResponse.json({ ok: true, backups });
}
