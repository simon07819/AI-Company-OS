import { NextResponse } from "next/server";
import { getSettings } from "@/lib/settingsStore";

export const dynamic = "force-dynamic";

export async function GET() {
  const settings = getSettings();
  const keyPresent = !!(process.env.NVIDIA_API_KEY && process.env.NVIDIA_API_KEY.length >= 8);
  return NextResponse.json({
    ok: true,
    mode: keyPresent ? "nvidia" : settings.runtimeMode,
    nvidiaKeyPresent: keyPresent,
    nvidiaOnline: keyPresent,
  });
}
