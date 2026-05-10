export type RuntimeEventType =
  | "agent.status_changed"
  | "task.started"
  | "task.completed"
  | "task.failed"
  | "task.blocked"
  | "dependency.resolved"
  | "queue.updated"
  | "runtime.reset"
  | "loop_executed"
  | "loop.activated"
  | "loop.paused"
  | "loop.resumed";

export interface RuntimeEvent {
  id: string;
  type: RuntimeEventType;
  timestamp: string;
  agentId?: string;
  sessionId?: string;
  taskId?: string;
  payload: Record<string, unknown>;
}

const MAX_EVENTS = 200;
const eventLog: RuntimeEvent[] = [];
const subscribers = new Set<(event: RuntimeEvent) => void>();

function makeEventId(): string {
  return `evt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`;
}

export function emitEvent(
  type: RuntimeEventType,
  payload: Record<string, unknown> = {},
  meta: { agentId?: string; sessionId?: string; taskId?: string } = {}
): RuntimeEvent {
  const event: RuntimeEvent = {
    id: makeEventId(),
    type,
    timestamp: new Date().toISOString(),
    ...meta,
    payload,
  };

  eventLog.push(event);
  if (eventLog.length > MAX_EVENTS) eventLog.shift();

  subscribers.forEach((sub) => {
    try {
      sub(event);
    } catch {
      // subscriber errors are non-fatal
    }
  });

  return event;
}

export function getRecentEvents(n = 50): RuntimeEvent[] {
  return eventLog.slice(-n);
}

export function subscribeEvents(
  callback: (event: RuntimeEvent) => void
): () => void {
  subscribers.add(callback);
  return () => {
    subscribers.delete(callback);
  };
}

export function getSubscriberCount(): number {
  return subscribers.size;
}

export function clearEvents(): void {
  eventLog.length = 0;
}
