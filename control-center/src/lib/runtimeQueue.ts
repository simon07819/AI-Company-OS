import { loadRuntimeState, saveRuntimeState } from "./runtimePersist";
import { emitEvent } from "./runtimeEvents";

export interface QueuedTask {
  sessionId: string;
  taskId: string;
  agentId: string;
  phase: string;
  priority: number;
  dependencies: string[];
  retryCount: number;
  enqueuedAt: string;
}

export interface QueueStats {
  total: number;
  runnable: number;
  blocked: number;
  byAgent: Record<string, number>;
}

let queue: QueuedTask[] = [];

// Initialize from persisted state
(function initQueue() {
  const saved = loadRuntimeState();
  queue = (saved.queue as unknown as QueuedTask[]) ?? [];
})();

function sortQueue(): void {
  queue.sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority;
    return new Date(a.enqueuedAt).getTime() - new Date(b.enqueuedAt).getTime();
  });
}

function persist(): void {
  saveRuntimeState({ queue: queue as unknown as Record<string, unknown>[] });
}

export function enqueueTask(
  task: Omit<QueuedTask, "enqueuedAt" | "retryCount"> & { retryCount?: number }
): void {
  const exists = queue.some(
    (q) => q.sessionId === task.sessionId && q.taskId === task.taskId
  );
  if (exists) return;
  queue.push({
    ...task,
    retryCount: task.retryCount ?? 0,
    enqueuedAt: new Date().toISOString(),
  });
  sortQueue();
  persist();
  emitEvent("queue.updated", { action: "enqueued", taskId: task.taskId, total: queue.length }, { agentId: task.agentId, sessionId: task.sessionId, taskId: task.taskId });
}

export function dequeueNextRunnable(
  completedTaskIds: Set<string>,
  activeAgents: Set<string>,
  maxConcurrency: number
): QueuedTask | null {
  if (activeAgents.size >= maxConcurrency) return null;

  for (let i = 0; i < queue.length; i++) {
    const item = queue[i];
    if (activeAgents.has(item.agentId)) continue;
    const depsOk = item.dependencies.every((dep) => completedTaskIds.has(dep));
    if (!depsOk) continue;
    queue.splice(i, 1);
    persist();
    emitEvent("queue.updated", { action: "dequeued", taskId: item.taskId, total: queue.length }, { agentId: item.agentId, sessionId: item.sessionId, taskId: item.taskId });
    return item;
  }
  return null;
}

export function listQueue(): QueuedTask[] {
  return [...queue];
}

export function clearSessionTasks(sessionId: string): void {
  const before = queue.length;
  queue = queue.filter((q) => q.sessionId !== sessionId);
  if (queue.length !== before) {
    persist();
    emitEvent("queue.updated", { action: "session_cleared", sessionId, removed: before - queue.length, total: queue.length });
  }
}

export function getQueueStats(completedTaskIds: Set<string>): QueueStats {
  const byAgent: Record<string, number> = {};
  let runnable = 0;
  let blocked = 0;

  for (const item of queue) {
    byAgent[item.agentId] = (byAgent[item.agentId] ?? 0) + 1;
    const depsOk = item.dependencies.every((dep) => completedTaskIds.has(dep));
    if (depsOk) runnable++;
    else blocked++;
  }

  return { total: queue.length, runnable, blocked, byAgent };
}

export function clearQueue(): void {
  queue = [];
  persist();
  emitEvent("queue.updated", { action: "cleared", total: 0 });
}
