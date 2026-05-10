"""Agent activity logger — writes and reads logs/agent_activity.jsonl."""

import json
import os
from datetime import datetime
from typing import List, Optional

DEFAULT_LOG_DIR = os.path.join(os.path.expanduser("~/AI-Company"), "logs")


def _log_path(repo_path: Optional[str] = None) -> str:
    base = repo_path if repo_path else DEFAULT_LOG_DIR.rsplit("/logs", 1)[0]
    return os.path.join(base, "logs", "agent_activity.jsonl")


def log_agent_activity(
    project: str,
    task_id,
    task_title: str,
    agent: str,
    status: str,
    message: str,
    repo_path: Optional[str] = None,
) -> None:
    """Append one activity entry to the JSONL log. Never raises."""
    try:
        path = _log_path(repo_path)
        os.makedirs(os.path.dirname(path), exist_ok=True)
        entry = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "project": project or "",
            "task_id": task_id,
            "task_title": task_title or "",
            "agent": agent or "unknown",
            "status": status or "unknown",
            "message": (message or "")[:500],
        }
        with open(path, "a", encoding="utf-8") as f:
            f.write(json.dumps(entry) + "\n")
    except Exception:
        pass


def get_recent_agent_activity(n: int = 50, repo_path: Optional[str] = None) -> List[dict]:
    """Return the last n activity entries, most recent first. Never raises."""
    try:
        path = _log_path(repo_path)
        if not os.path.isfile(path):
            return []
        with open(path, "r", encoding="utf-8") as f:
            lines = [l.strip() for l in f if l.strip()]
        entries = []
        for line in lines:
            try:
                entries.append(json.loads(line))
            except json.JSONDecodeError:
                pass
        return list(reversed(entries[-n:]))
    except Exception:
        return []
