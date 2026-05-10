import fs from "fs";
import path from "path";

const LOG_PATH = path.join(process.cwd(), "..", "logs", "agent_activity.jsonl");

export interface ActivityEntry {
  timestamp: string;
  project: string;
  task_id: number | string;
  task_title: string;
  agent: string;
  status: string;
  message: string;
}

export function getRecentActivity(limit = 50): ActivityEntry[] {
  if (!fs.existsSync(LOG_PATH)) return [];
  try {
    const raw = fs.readFileSync(LOG_PATH, "utf-8");
    const entries = raw
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        try {
          return JSON.parse(line) as ActivityEntry;
        } catch {
          return null;
        }
      })
      .filter(Boolean) as ActivityEntry[];
    return entries.slice(-limit).reverse();
  } catch {
    return [];
  }
}

export function formatTimestamp(ts: string): string {
  try {
    return new Date(ts).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return ts;
  }
}
