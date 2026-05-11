import { NextRequest, NextResponse } from "next/server";
import {
  getLatestDiscussion,
  getDiscussions,
  updateDiscussionStatus,
  type DiscussionStatus,
} from "@/lib/executiveDiscussion";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const discussion = getLatestDiscussion();
    return NextResponse.json({ ok: true, discussion });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { discussionId, action } = body as { discussionId: string; action: string };

    if (!discussionId || !action) {
      return NextResponse.json({ ok: false, message: "Missing discussionId or action" }, { status: 400 });
    }

    const statusMap: Record<string, DiscussionStatus> = {
      approve:          "approved",
      reject:           "rejected",
      request_revision: "revision_requested",
      pause:            "deliberating",
      escalate:         "consulting",
    };

    const newStatus = statusMap[action];
    if (!newStatus) {
      return NextResponse.json({ ok: false, message: `Unknown action: ${action}` }, { status: 400 });
    }

    const result = updateDiscussionStatus(discussionId, newStatus);
    return NextResponse.json({ ok: result.ok });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
