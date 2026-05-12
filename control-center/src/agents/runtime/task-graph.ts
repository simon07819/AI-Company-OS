import type { MissionPlan, TaskGraph } from "./types";

export function buildTaskGraph(plan: MissionPlan): TaskGraph {
  return {
    nodes: plan.tasks,
    edges: plan.tasks.flatMap((task) => task.dependsOn.map((from) => ({ from, to: task.id }))),
  };
}

export function sortTasksForExecution(graph: TaskGraph) {
  const done = new Set<string>();
  const pending = [...graph.nodes];
  const sorted = [];
  while (pending.length) {
    const index = pending.findIndex((task) => task.dependsOn.every((dep) => done.has(dep)));
    if (index < 0) throw new Error("Task graph has unresolved dependencies.");
    const [task] = pending.splice(index, 1);
    sorted.push(task);
    done.add(task.id);
  }
  return sorted;
}
