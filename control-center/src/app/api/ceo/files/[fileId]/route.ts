import { NextRequest, NextResponse } from "next/server";
import { getFileById } from "@/lib/ceoUploads";
import { requireUser } from "@/lib/auth/serverAuth";
import fs from "fs";

export const dynamic = "force-dynamic";

function contentDispositionFileName(name: string) {
  return name.replace(/["\r\n\\]/g, "_");
}

export async function GET(
  req: NextRequest,
  { params }: { params: { fileId: string } },
) {
  const auth = requireUser(req);
  if (auth.response) return auth.response;

  const file = getFileById(params.fileId);
  if (!file) {
    return NextResponse.json({ ok: false, message: "File not found" }, { status: 404 });
  }
  if (!fs.existsSync(file.storagePath)) {
    return NextResponse.json({ ok: false, message: "File missing on disk" }, { status: 404 });
  }

  const buffer = fs.readFileSync(file.storagePath);
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": file.mimeType,
      "Content-Disposition": `inline; filename="${contentDispositionFileName(file.name)}"`,
      "Cache-Control": "private, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
