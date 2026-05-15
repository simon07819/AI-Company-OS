export interface PipelineEvent {
  stage: string;
  status: "started" | "completed" | "failed";
  data?: Record<string, unknown>;
  ts: number;
}

type Listener = (event: PipelineEvent) => void;

const listeners = new Map<string, Set<Listener>>();

export function emitPipelineEvent(streamId: string, event: PipelineEvent) {
  const subs = listeners.get(streamId);
  if (!subs) return;
  for (const fn of Array.from(subs)) {
    try { fn(event); } catch {}
  }
}

export function subscribePipeline(streamId: string, fn: Listener): () => void {
  if (!listeners.has(streamId)) listeners.set(streamId, new Set());
  listeners.get(streamId)!.add(fn);
  return () => {
    const subs = listeners.get(streamId);
    if (!subs) return;
    subs.delete(fn);
    if (subs.size === 0) listeners.delete(streamId);
  };
}
