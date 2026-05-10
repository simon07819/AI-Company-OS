import argparse
import json
import os
import sys


ALLOWED_STATUSES = {"active", "paused", "archived"}


def set_project_status(repo_path, project_name, status):
    project_path = os.path.join(repo_path, "projects", project_name)
    project_file = os.path.join(project_path, "project.json")

    if not os.path.exists(project_file):
        print(f"Project not found: {project_name}", file=sys.stderr)
        return 1

    try:
        with open(project_file, "r", encoding="utf-8") as file:
            project = json.load(file)
    except (json.JSONDecodeError, OSError) as error:
        print(f"Could not read project.json for {project_name}: {error}", file=sys.stderr)
        return 1

    project["status"] = status
    with open(project_file, "w", encoding="utf-8") as file:
        json.dump(project, file, indent=2)
        file.write("\n")

    print(f"Project {project_name} status set to {status}")
    return 0


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--project", required=True)
    parser.add_argument("--status", required=True, choices=sorted(ALLOWED_STATUSES))
    parser.add_argument("--repo-path", default=os.getcwd())
    args = parser.parse_args()

    repo_path = os.path.abspath(os.path.expanduser(args.repo_path))
    return set_project_status(repo_path, args.project, args.status)


if __name__ == "__main__":
    raise SystemExit(main())
