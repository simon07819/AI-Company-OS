import { NextRequest, NextResponse } from "next/server";
import { readWorkspaceFile } from "@/lib/workspaceStore";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;
  const filePath = req.nextUrl.searchParams.get("path");

  if (!filePath) {
    return NextResponse.json(
      { ok: false, message: "Query parameter 'path' is required." },
      { status: 400 }
    );
  }

  // Prevent path traversal
  if (filePath.includes("..") || filePath.startsWith("/")) {
    return NextResponse.json(
      { ok: false, message: "Invalid path." },
      { status: 400 }
    );
  }

  const content = readWorkspaceFile(sessionId, filePath);
  if (content === null) {
    return NextResponse.json(
      { ok: false, message: "File not found." },
      { status: 404 }
    );
  }

  return NextResponse.json({
    ok: true,
    path: filePath,
    content,
  });
}
