#!/usr/bin/env python3
import argparse
import os
import shutil
import sys


PLACEHOLDERS = {
    "PROJECT_NAME": None,
    "PROJECT_SLUG": None,
}


def replace_in_file(path: str, name: str, slug: str) -> None:
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()
    content = content.replace("PROJECT_NAME", name).replace("PROJECT_SLUG", slug)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)


def main() -> None:
    parser = argparse.ArgumentParser(description="Initialize a project app from a template.")
    parser.add_argument("--project", required=True, help="Project name (e.g. GymFlow)")
    parser.add_argument("--template", required=True, help="Template name (e.g. saas-nextjs)")
    parser.add_argument("--repo-path", required=True, help="Path to the AI-Company repo root")
    args = parser.parse_args()

    repo_path = os.path.expanduser(args.repo_path)
    template_dir = os.path.join(repo_path, "templates", args.template)
    dest_dir = os.path.join(repo_path, "projects", args.project, "app")

    if not os.path.isdir(template_dir):
        print(f"Template not found: {template_dir}", file=sys.stderr)
        sys.exit(1)

    if os.path.exists(dest_dir):
        print(f"App already exists for project: {args.project}")
        sys.exit(0)

    shutil.copytree(template_dir, dest_dir)

    slug = args.project.lower()
    for root, _, files in os.walk(dest_dir):
        for filename in files:
            filepath = os.path.join(root, filename)
            try:
                replace_in_file(filepath, args.project, slug)
            except UnicodeDecodeError:
                pass  # skip binary files

    print(f"App initialized for project '{args.project}' at {dest_dir}")


if __name__ == "__main__":
    main()
