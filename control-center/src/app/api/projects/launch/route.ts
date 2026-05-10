import { NextRequest, NextResponse } from "next/server";
import { runAction } from "@/lib/runner";
import { bridgeFromRun, sanitizeProjectName } from "@/lib/orchestrationBridge";

export const dynamic = "force-dynamic";

type LaunchBody = {
  name?: string;
  idea?: string;
  market?: string;
  template?: string | null;
  agents?: string[];
  stack?: string | null;
  autonomy?: string | null;
};

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({})) as LaunchBody;
  const project = sanitizeProjectName(body.name);
  const details = [
    body.idea,
    body.market ? `Market: ${body.market}` : "",
    body.template ? `Template: ${body.template}` : "",
    body.stack ? `Stack: ${body.stack}` : "",
    body.autonomy ? `Autonomy: ${body.autonomy}` : "",
    body.agents?.length ? `Agents: ${body.agents.join(", ")}` : "",
  ].filter(Boolean).join("\n");

  const result = await runAction("create-product", {
    project,
    idea: details || "New AI Company OS product launched from Control Center",
  });

  return NextResponse.json({
    ...bridgeFromRun("launch-project", project, result),
    data: { project, mode: result.ok ? "real" : "mock-fallback" },
  }, { status: result.ok ? 200 : 400 });
}
