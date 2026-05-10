"use client";

import { useEffect, useRef, useState } from "react";
import type { RuntimeEvent } from "@/lib/runtimeEvents";

export { type RuntimeEvent };

export function useRuntimeEvents(enabled = true) {
  const [events, setEvents] = useState<RuntimeEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const [lastActivity, setLastActivity] = useState<string | null>(null);

  const callbackRef = useRef<(e: RuntimeEvent) => void>(() => undefined);
  callbackRef.current = (event) => {
    setEvents((prev) => [event, ...prev].slice(0, 100));
    setLastActivity(event.timestamp);
  };

  useEffect(() => {
    if (!enabled) return;

    let es: EventSource | null = null;

    function connect() {
      es = new EventSource("/api/runtime/events");

      es.onopen = () => setConnected(true);

      es.onmessage = (e) => {
        try {
          const event = JSON.parse(e.data as string) as RuntimeEvent;
          callbackRef.current(event);
        } catch {
          // ignore parse errors
        }
      };

      es.onerror = () => setConnected(false);
    }

    connect();

    return () => {
      es?.close();
      es = null;
    };
  }, [enabled]);

  return { events, connected, lastActivity };
}
