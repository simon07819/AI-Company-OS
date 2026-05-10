import argparse
import json
import os


def load_json(path, default):
    try:
        with open(path, "r", encoding="utf-8") as file:
            return json.load(file)
    except (json.JSONDecodeError, OSError):
        return default


def task_metrics(project_path):
    metrics = {
        "total": 0,
        "queued": 0,
        "completed_real": 0,
        "failed": 0,
        "archived": 0,
        "retrying": 0,
    }
    tasks_path = os.path.join(project_path, "tasks")
    if not os.path.isdir(tasks_path):
        return metrics

    for filename in os.listdir(tasks_path):
        if not filename.endswith(".json"):
            continue
        task = load_json(os.path.join(tasks_path, filename), {})
        metrics["total"] += 1
        status = task.get("status")
        if status in {"queued", "completed_real", "failed", "archived"}:
            metrics[status] += 1
        if int(task.get("retry_count") or 0) > 0 and status == "queued":
            metrics["retrying"] += 1
    return metrics


def project_rows(repo_path):
    projects_path = os.path.join(repo_path, "projects")
    if not os.path.isdir(projects_path):
        return []

    rows = []
    for name in sorted(os.listdir(projects_path)):
        project_path = os.path.join(projects_path, name)
        if not os.path.isdir(project_path):
            continue

        project = load_json(os.path.join(project_path, "project.json"), {})
        metrics = task_metrics(project_path)
        rows.append({
            "project": project.get("name") or name,
            "status": project.get("status") or "unknown",
            "priority": project.get("project_priority") or "low",
            **metrics,
        })
    return rows


def print_dashboard(rows):
    print("AI Product Factory Dashboard")
    if not rows:
        print("No projects found.")
        return

    headers = [
        "project",
        "status",
        "priority",
        "total",
        "queued",
        "completed_real",
        "failed",
        "archived",
        "retrying",
    ]
    widths = {
        header: max(len(header), *(len(str(row[header])) for row in rows))
        for header in headers
    }

    print(" | ".join(header.ljust(widths[header]) for header in headers))
    print("-+-".join("-" * widths[header] for header in headers))
    for row in rows:
        print(" | ".join(str(row[header]).ljust(widths[header]) for header in headers))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--repo-path", default=os.getcwd())
    args = parser.parse_args()

    repo_path = os.path.abspath(os.path.expanduser(args.repo_path))
    print_dashboard(project_rows(repo_path))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
