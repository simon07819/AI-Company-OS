import { NextRequest, NextResponse } from "next/server";
import { addOutputRevision, archiveOutput, generateVisualPreviewForOutput, getOutputById, restoreOutput, softDeleteOutput, updateOutputMetadata } from "@/lib/visibleOutputs";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ outputId: string }> }) {
  const { outputId } = await params;
  const output = getOutputById(outputId);
  if (!output) return NextResponse.json({ ok: false, message: "Output not found" }, { status: 404 });
  return NextResponse.json({ ok: true, output });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ outputId: string }> }) {
  const { outputId } = await params;
  const body = await req.json().catch(() => ({}));
  const action = body.action as string | undefined;
  const output = action === "archive" ? archiveOutput(outputId)
    : action === "restore" ? restoreOutput(outputId)
      : action === "favorite" ? updateOutputMetadata(outputId, { favorite: !!body.favorite })
        : action === "generate_visual_preview" ? generateVisualPreviewForOutput(outputId)
        : action === "revision" ? addOutputRevision(outputId, body.note ?? "Revision requested")
          : updateOutputMetadata(outputId, body);
  if (!output) return NextResponse.json({ ok: false, message: "Output not found" }, { status: 404 });
  return NextResponse.json({ ok: true, output });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ outputId: string }> }) {
  const { outputId } = await params;
  const output = softDeleteOutput(outputId);
  if (!output) return NextResponse.json({ ok: false, message: "Output not found" }, { status: 404 });
  return NextResponse.json({ ok: true, output });
}
