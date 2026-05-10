import fs from "fs";
import { LOG_PATH } from "@/lib/systemStatus";
import { getRecentActivity } from "@/lib/activity";

export const dynamic = "force-dynamic";

export async function GET() {
  const encoder = new TextEncoder();
  let closed = false;
  let pollTimer: ReturnType<typeof setInterval> | null = null;
  let lastSize = 0;

  const stream = new ReadableStream({
    start(controller) {
      // Seed with the most recent 30 entries (oldest-first so client appends)
      const initial = getRecentActivity(30).reverse();
      for (const entry of initial) {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(entry)}\n\n`));
        } catch {
          return;
        }
      }

      // Track current file size
      try {
        lastSize = fs.statSync(LOG_PATH).size;
      } catch {
        lastSize = 0;
      }

      // Poll every 2s for new content
      pollTimer = setInterval(() => {
        if (closed) {
          if (pollTimer) clearInterval(pollTimer);
          return;
        }
        try {
          const stat = fs.statSync(LOG_PATH);
          if (stat.size > lastSize) {
            const newBytes = stat.size - lastSize;
            const buf = Buffer.alloc(newBytes);
            const fd = fs.openSync(LOG_PATH, "r");
            fs.readSync(fd, buf, 0, newBytes, lastSize);
            fs.closeSync(fd);
            lastSize = stat.size;

            const lines = buf.toString("utf8").split("\n").filter(Boolean);
            for (const line of lines) {
              try {
                const entry = JSON.parse(line) as Record<string, unknown>;
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(entry)}\n\n`));
              } catch {
                // skip malformed lines
              }
            }
          } else {
            // Heartbeat comment keeps the connection alive through proxies
            controller.enqueue(encoder.encode(`: ping\n\n`));
          }
        } catch {
          // Log file may not exist yet
        }
      }, 2000);
    },
    cancel() {
      closed = true;
      if (pollTimer) clearInterval(pollTimer);
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
