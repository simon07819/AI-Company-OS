import argparse
import os
import subprocess
import sys


def run_step(label, cmd, repo_path):
    print(label, flush=True)
    result = subprocess.run(cmd, cwd=repo_path)
    if result.returncode != 0:
        print(f"Step failed: {' '.join(cmd[1:])} (exit code {result.returncode})", file=sys.stderr, flush=True)
    return result.returncode


def read_recommendation(project_path):
    report_path = os.path.join(project_path, "validation_report.md")
    try:
        with open(report_path, "r", encoding="utf-8") as f:
            for line in f:
                if line.startswith("## Recommendation:"):
                    return line.split(":", 1)[1].strip().lower()
    except OSError:
        pass
    return None


def script(name):
    return os.path.join(os.path.dirname(os.path.abspath(__file__)), name)


def auto_build(project, repo_path):
    project_path = os.path.join(repo_path, "projects", project)
    py = sys.executable

    print(f"Auto build started: {project}", flush=True)

    code = run_step(
        "Running validation...",
        [py, script("validate_product.py"), "--project", project, "--repo-path", repo_path],
        repo_path,
    )
    if code != 0:
        sys.exit(code)

    rec = read_recommendation(project_path)
    if rec in ("pause", "revise"):
        print(f"Skipping workers: validation recommendation is '{rec}'", flush=True)
        print(f"Auto build completed: {project}", flush=True)
        return 0

    code = run_step(
        "Generating roadmap...",
        [py, script("generate_roadmap.py"), "--project", project, "--repo-path", repo_path],
        repo_path,
    )
    if code != 0:
        sys.exit(code)

    code = run_step(
        "Generating tasks...",
        [py, script("roadmap_to_tasks.py"), "--project", project, "--repo-path", repo_path],
        repo_path,
    )
    if code != 0:
        sys.exit(code)

    code = run_step(
        "Starting workers...",
        [
            py, script("run_manager.py"),
            "--project", project,
            "--repo-path", repo_path,
            "--workers", "1",
            "--execute",
        ],
        repo_path,
    )
    if code != 0:
        sys.exit(code)

    print(f"Auto build completed: {project}", flush=True)
    return 0


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--project", required=True)
    parser.add_argument("--repo-path", default=os.getcwd())
    args = parser.parse_args()
    repo_path = os.path.abspath(os.path.expanduser(args.repo_path))
    return auto_build(args.project, repo_path)


if __name__ == "__main__":
    raise SystemExit(main())
