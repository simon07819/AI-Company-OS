"use client";

import { useEffect, useRef } from "react";

export interface BackendLogEntry {
  timestamp: string;
  project?: string;
  task_id?: number | string;
  task_title?: string;
  agent?: string;
  status?: string;
  message?: string;
  event?: string;
}

export function useLogStream(
  onEntry: (entry: BackendLogEntry) => void,
  enabled = true
) {
  // Stable ref so the effect doesn't re-run when the callback changes
  const onEntryRef = useRef(onEntry);
  onEntryRef.current = onEntry;

  useEffect(() => {
    if (!enabled) return;

    let es: EventSource | null = null;

    function connect() {
      es = new EventSource("/api/logs/stream");

      es.onmessage = (event) => {
        try {
          const entry = JSON.parse(event.data as string) as BackendLogEntry;
          onEntryRef.current(entry);
        } catch {
          // ignore parse errors
        }
      };

      es.onerror = () => {
        // EventSource auto-reconnects after an error; no manual retry needed
      };
    }

    connect();

    return () => {
      if (es) {
        es.close();
        es = null;
      }
    };
  }, [enabled]);
}
