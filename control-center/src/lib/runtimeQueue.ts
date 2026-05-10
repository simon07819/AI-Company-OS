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

function sortQueue(): void {
  queue.sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority;
    return new Date(a.enqueuedAt).getTime() - new Date(b.enqueuedAt).getTime();
  });
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
    return item;
  }
  return null;
}

export function listQueue(): QueuedTask[] {
  return [...queue];
}

export function clearSessionTasks(sessionId: string): void {
  queue = queue.filter((q) => q.sessionId !== sessionId);
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
}
