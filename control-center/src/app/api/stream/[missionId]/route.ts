import { type NextRequest } from "next/server";
import { subscribePipeline } from "@/lib/pipeline/pipelineEventBus";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ missionId: string }> },
) {
  const { missionId } = await params;
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const enqueue = (text: string) => {
        try { controller.enqueue(encoder.encode(text)); } catch {}
      };

      // Immediate acknowledgement so the client knows the stream is live
      enqueue(`: connected\n\n`);

      const unsub = subscribePipeline(missionId, (event) => {
        enqueue(`data: ${JSON.stringify(event)}\n\n`);
        if (event.stage === "done") {
          try { controller.close(); } catch {}
          clearInterval(heartbeat);
          clearTimeout(maxLife);
          unsub();
        }
      });

      const heartbeat = setInterval(() => {
        enqueue(`: ping\n\n`);
      }, 15_000);

      // Safety close after 3 min regardless
      const maxLife = setTimeout(() => {
        clearInterval(heartbeat);
        unsub();
        try { controller.close(); } catch {}
      }, 180_000);

      req.signal.addEventListener("abort", () => {
        clearInterval(heartbeat);
        clearTimeout(maxLife);
        unsub();
        try { controller.close(); } catch {}
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
