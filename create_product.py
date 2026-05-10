import argparse
import json
import os
from datetime import datetime


INITIAL_TASKS = [
    ("Define product requirements", "high"),
    ("Build landing page", "high"),
    ("Implement authentication", "medium"),
    ("Implement billing", "medium"),
    ("Implement admin dashboard", "low"),
]


def utc_now():
    return datetime.utcnow().isoformat()


def write_text_if_missing(path, content):
    if os.path.exists(path):
        return
    with open(path, "w", encoding="utf-8") as file:
        file.write(content)


def write_json_if_missing(path, data):
    if os.path.exists(path):
        return
    with open(path, "w", encoding="utf-8") as file:
        json.dump(data, file, indent=2)
        file.write("\n")


def ensure_project(project_path, project_name):
    created = not os.path.exists(project_path)

    os.makedirs(os.path.join(project_path, "tasks"), exist_ok=True)
    os.makedirs(os.path.join(project_path, "docs"), exist_ok=True)
    os.makedirs(os.path.join(project_path, "logs"), exist_ok=True)

    write_json_if_missing(os.path.join(project_path, "memory.json"), {
        "completed_titles": [],
        "generated_titles": [],
    })
    write_json_if_missing(os.path.join(project_path, "project.json"), {
        "name": project_name,
        "project_priority": "medium",
        "status": "active",
    })

    if created:
        print(f"Project created: {project_name}")
    else:
        print(f"Project already exists: {project_name}")


def create_product(repo_path, project_name, idea):
    project_path = os.path.join(repo_path, "projects", project_name)
    ensure_project(project_path, project_name)

    docs_path = os.path.join(project_path, "docs")
    write_text_if_missing(
        os.path.join(docs_path, "product_vision.md"),
        f"# {project_name} Product Vision\n\nIdea: {idea}\n",
    )
    write_text_if_missing(
        os.path.join(docs_path, "mvp_scope.md"),
        "\n".join([
            f"# {project_name} MVP Scope",
            "",
            "- Define product requirements",
            "- Build landing page",
            "- Implement authentication",
            "- Implement billing",
            "- Implement admin dashboard",
            "",
        ]),
    )

    created_at = utc_now()
    tasks_path = os.path.join(project_path, "tasks")
    for task_id, (title, priority) in enumerate(INITIAL_TASKS, start=1):
        write_json_if_missing(os.path.join(tasks_path, f"{task_id}.json"), {
            "id": task_id,
            "title": title,
            "status": "queued",
            "priority": priority,
            "created_at": created_at,
        })

    print(f"Product bootstrapped: {project_name}")
    return 0


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--project", required=True)
    parser.add_argument("--idea", required=True)
    parser.add_argument("--repo-path", default=os.getcwd())
    args = parser.parse_args()

    repo_path = os.path.abspath(os.path.expanduser(args.repo_path))
    return create_product(repo_path, args.project, args.idea)


if __name__ == "__main__":
    raise SystemExit(main())
