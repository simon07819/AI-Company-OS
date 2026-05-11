import { NextRequest, NextResponse } from "next/server";
import { listCeoProjects, createCeoProject, getCeoProject } from "@/lib/ceoProjectStore";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const projects = listCeoProjects({
    includeArchived: url.searchParams.get("includeArchived") === "true",
    includeDeleted: url.searchParams.get("includeDeleted") === "true",
  });
  return NextResponse.json({ ok: true, projects });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body?.name) {
      return NextResponse.json({ ok: false, message: "Missing name" }, { status: 400 });
    }
    const project = createCeoProject({
      name: body.name,
      missionType: body.missionType ?? "saas_project",
      sessionId: body.sessionId ?? null,
      workspaceId: body.workspaceId ?? null,
      conversationId: body.conversationId ?? null,
      uploadedFileIds: body.uploadedFileIds ?? [],
    });
    return NextResponse.json({ ok: true, project });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
