import { NextResponse } from "next/server";
import { PROJECT_CONFIG } from "../../../lib/project-config";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    project: PROJECT_CONFIG.slug,
    timestamp: new Date().toISOString(),
  });
}
