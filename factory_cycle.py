import argparse
import os
import subprocess
import sys


STEPS = [
    ("validate_product", ["validate_product.py", "--project", "{project}", "--repo-path", "{repo_path}"]),
    ("generate_roadmap", ["generate_roadmap.py", "--project", "{project}", "--repo-path", "{repo_path}"]),
    ("roadmap_to_tasks", ["roadmap_to_tasks.py", "--project", "{project}", "--repo-path", "{repo_path}"]),
    ("factory_dashboard", ["factory_dashboard.py", "--repo-path", "{repo_path}"]),
]


def run_step(name, cmd_template, project, repo_path, script_dir):
    cmd = [
        token.replace("{project}", project).replace("{repo_path}", repo_path)
        for token in cmd_template
    ]
    script = os.path.join(script_dir, cmd[0])
    full_cmd = [sys.executable, script] + cmd[1:]

    print(f"Running step: {name}", flush=True)
    result = subprocess.run(full_cmd)
    if result.returncode != 0:
        print(f"Step failed: {name} (exit code {result.returncode})", file=sys.stderr, flush=True)
    return result.returncode


def factory_cycle(project, repo_path):
    script_dir = os.path.dirname(os.path.abspath(__file__))
    print(f"Factory cycle started: {project}", flush=True)

    for name, cmd_template in STEPS:
        code = run_step(name, cmd_template, project, repo_path, script_dir)
        if code != 0:
            sys.exit(code)

    print(f"Factory cycle completed: {project}", flush=True)
    return 0


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--project", required=True)
    parser.add_argument("--repo-path", default=os.getcwd())
    args = parser.parse_args()
    repo_path = os.path.abspath(os.path.expanduser(args.repo_path))
    return factory_cycle(args.project, repo_path)


if __name__ == "__main__":
    raise SystemExit(main())
