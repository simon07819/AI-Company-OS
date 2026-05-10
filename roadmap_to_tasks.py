import argparse
import json
import os
import re
import sys
from datetime import datetime


def utc_now():
    return datetime.utcnow().isoformat()


def read_text(path):
    try:
        with open(path, "r", encoding="utf-8") as f:
            return f.read()
    except OSError:
        return None


def read_json(path):
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except (json.JSONDecodeError, OSError):
        return None


def write_json(path, data):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)
        f.write("\n")


def extract_suggested_tasks(roadmap_text):
    """Return list of task title strings from the Suggested First 10 Tasks section."""
    titles = []
    inside = False
    for line in roadmap_text.splitlines():
        if re.match(r"^## Suggested First 10 Tasks", line):
            inside = True
            continue
        if inside:
            if line.startswith("## "):
                break
            # Match numbered list entries: "1. Title _Dept_" or "1. Title"
            m = re.match(r"^\d+\.\s+(.+)", line.strip())
            if m:
                raw = m.group(1).strip()
                # Strip trailing department tag: _Dept_
                title = re.sub(r"\s+_[^_]+_\s*$", "", raw).strip()
                if title:
                    titles.append(title)
    return titles


def existing_titles(tasks_dir):
    """Return set of lowercased titles from all existing task files."""
    titles = set()
    if not os.path.isdir(tasks_dir):
        return titles
    for fname in os.listdir(tasks_dir):
        if not fname.endswith(".json"):
            continue
        task = read_json(os.path.join(tasks_dir, fname))
        if isinstance(task, dict) and "title" in task:
            titles.add(task["title"].strip().lower())
    return titles


def next_numeric_id(tasks_dir):
    """Return the next available integer task id."""
    max_id = 0
    if not os.path.isdir(tasks_dir):
        return 1
    for fname in os.listdir(tasks_dir):
        if not fname.endswith(".json"):
            continue
        stem = fname[:-5]
        if stem.isdigit():
            max_id = max(max_id, int(stem))
    return max_id + 1


def roadmap_to_tasks(repo_path, project_name):
    project_path = os.path.join(repo_path, "projects", project_name)
    roadmap_path = os.path.join(project_path, "docs", "roadmap.md")

    roadmap_text = read_text(roadmap_path)
    if roadmap_text is None:
        print(f"Error: roadmap.md not found at {roadmap_path}", file=sys.stderr)
        return 1

    titles = extract_suggested_tasks(roadmap_text)
    if not titles:
        print("No tasks found in 'Suggested First 10 Tasks' section.")
        return 0

    tasks_dir = os.path.join(project_path, "tasks")
    os.makedirs(tasks_dir, exist_ok=True)

    known = existing_titles(tasks_dir)
    next_id = next_numeric_id(tasks_dir)
    created = 0

    for title in titles:
        if title.lower() in known:
            print(f"skipping duplicate roadmap task: {title}")
            continue

        task = {
            "id": next_id,
            "title": title,
            "status": "queued",
            "priority": "medium",
            "source": "roadmap",
            "created_at": utc_now(),
        }
        task_path = os.path.join(tasks_dir, f"{next_id}.json")
        write_json(task_path, task)
        print(f"created task {next_id}: {title}")
        known.add(title.lower())
        next_id += 1
        created += 1

    print(f"Done. {created} task(s) created, {len(titles) - created} duplicate(s) skipped.")
    return 0


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--project", required=True)
    parser.add_argument("--repo-path", default=os.getcwd())
    args = parser.parse_args()
    repo_path = os.path.abspath(os.path.expanduser(args.repo_path))
    return roadmap_to_tasks(repo_path, args.project)


if __name__ == "__main__":
    raise SystemExit(main())
