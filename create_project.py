import argparse
import json
import os


def write_json(path, data):
    with open(path, "w", encoding="utf-8") as file:
        json.dump(data, file, indent=2)
        file.write("\n")


def create_project(repo_path, project_name):
    project_path = os.path.join(repo_path, "projects", project_name)
    if os.path.exists(project_path):
        print(f"Project already exists: {project_name}")
        return 0

    os.makedirs(os.path.join(project_path, "tasks"))
    os.makedirs(os.path.join(project_path, "docs"))
    os.makedirs(os.path.join(project_path, "logs"))

    write_json(os.path.join(project_path, "memory.json"), {
        "completed_titles": [],
        "generated_titles": [],
    })
    write_json(os.path.join(project_path, "project.json"), {
        "name": project_name,
        "project_priority": "medium",
        "status": "active",
    })

    print(f"Project created: {project_name}")
    return 0


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--project", required=True)
    parser.add_argument("--repo-path", default=os.getcwd())
    args = parser.parse_args()

    repo_path = os.path.abspath(os.path.expanduser(args.repo_path))
    return create_project(repo_path, args.project)


if __name__ == "__main__":
    raise SystemExit(main())
