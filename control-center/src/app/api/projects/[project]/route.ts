import { NextResponse } from "next/server";
import { getProject } from "@/lib/projects";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ project: string }> }
) {
  const { project: projectName } = await params;
  const project = getProject(projectName);
  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(project);
}
