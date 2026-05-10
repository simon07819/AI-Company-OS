import argparse
import os
import subprocess
import sys

from task_queue import DEFAULT_PROJECT, list_task_files, load_task_file


def run_cmd(command, repo_path):
    return subprocess.run(command, cwd=repo_path, check=False, capture_output=True, text=True)


def current_branch(repo_path):
    result = run_cmd(["git", "branch", "--show-current"], repo_path)
    return result.stdout.strip() if result.returncode == 0 else "unknown"


def git_clean(repo_path):
    result = run_cmd(["git", "status", "--porcelain"], repo_path)
    return result.returncode == 0 and result.stdout.strip() == ""


def checkout_main(repo_path):
    return run_cmd(["git", "checkout", "--ignore-other-worktrees", "main"], repo_path)


def queued_tasks(project_path):
    tasks = []
    for task_file in sorted(list_task_files(project_path), key=task_sort_key):
        task = load_task_file(task_file)
        if task.get("status") == "queued":
            tasks.append((task_file, task))
    return tasks


def task_sort_key(task_file):
    task = load_task_file(task_file)
    task_id = task.get("id")
    if isinstance(task_id, int):
        return (0, task_id)
    if isinstance(task_id, str) and task_id.isdigit():
        return (0, int(task_id))
    return (1, str(task_id))


def worktree_entries(repo_path):
    result = run_cmd(["git", "worktree", "list", "--porcelain"], repo_path)
    if result.returncode != 0:
        return {}

    entries = {}
    current = None
    for line in result.stdout.splitlines():
        if line.startswith("worktree "):
            current = line.removeprefix("worktree ")
            entries[current] = {}
        elif current and " " in line:
            key, value = line.split(" ", 1)
            entries[current][key] = value
    return entries


def worker_path(repo_path, index):
    return os.path.join(repo_path, ".worktrees", f"worker-{index}")


def worker_relative_path(index):
    return os.path.join(".worktrees", f"worker-{index}")


def ensure_worker_worktree(repo_path, index, entries):
    path = worker_path(repo_path, index)
    relative_path = worker_relative_path(index)

    if os.path.exists(path):
        if path not in entries:
            print(f"ready: false")
            print(f"reason: {relative_path} exists but is not a git worktree")
            return False
        return True

    os.makedirs(os.path.dirname(path), exist_ok=True)
    result = run_cmd(
        ["git", "worktree", "add", "--force", relative_path, "main"],
        repo_path,
    )
    if result.returncode != 0:
        print("ready: false")
        print(f"reason: failed to create {relative_path}")
        if result.stderr.strip():
            print(result.stderr.strip())
        return False
    return True


def run_worker_once(repo_path, worker_repo_path, task_id):
    project_path = os.path.join(worker_repo_path, "projects", "Tonymage")
    return subprocess.run(
        [
            sys.executable,
            os.path.join(repo_path, "run_worker.py"),
            "--once",
            "--task-id",
            str(task_id),
            "--repo-path",
            worker_repo_path,
            "--project-path",
            project_path,
        ],
        cwd=repo_path,
        check=False,
        capture_output=True,
        text=True,
    )


def execute_workers(repo_path, project_path, workers):
    tasks = queued_tasks(project_path)
    entries = worktree_entries(repo_path)

    for index in range(1, workers + 1):
        worker = f"worker-{index}"
        worktree = worker_path(repo_path, index)
        assigned = tasks[index - 1][1] if index - 1 < len(tasks) else None
        label = f"task {assigned.get('id')} | {assigned.get('title')}" if assigned else "idle"
        print(f"{worker} -> {label}")

        if not assigned:
            continue
        if not ensure_worker_worktree(repo_path, index, entries):
            continue
        if not git_clean(worktree):
            print(f"{worker} skipped: worktree is not clean")
            continue

        checkout = checkout_main(worktree)
        if checkout.returncode != 0:
            print(f"{worker} skipped: could not checkout main")
            if checkout.stderr.strip():
                print(checkout.stderr.strip())
            continue

        result = run_worker_once(repo_path, worktree, assigned.get("id"))
        if result.stdout.strip():
            print(result.stdout.strip())
        if result.stderr.strip():
            print(result.stderr.strip())
        if result.returncode != 0:
            print(f"{worker} failed with exit code {result.returncode}")
        if git_clean(worktree):
            checkout_main(worktree)

    return 0


def clean_worktrees(repo_path):
    root = os.path.join(repo_path, ".worktrees")
    entries = worktree_entries(repo_path)

    for path in sorted(entries):
        if path.startswith(root + os.sep):
            relative_path = os.path.relpath(path, repo_path)
            result = run_cmd(["git", "worktree", "remove", "--force", relative_path], repo_path)
            if result.returncode != 0:
                print(f"failed to remove {relative_path}")
                if result.stderr.strip():
                    print(result.stderr.strip())
                return False

    result = run_cmd(["git", "worktree", "prune"], repo_path)
    if result.returncode != 0:
        print("failed to prune worktrees")
        if result.stderr.strip():
            print(result.stderr.strip())
        return False

    os.makedirs(root, exist_ok=True)
    return True


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--workers", type=int, default=1)
    parser.add_argument("--clean-worktrees", action="store_true")
    parser.add_argument("--execute", action="store_true")
    parser.add_argument("--project-path", default=DEFAULT_PROJECT)
    parser.add_argument("--repo-path", default=os.getcwd())
    args = parser.parse_args()

    if args.workers < 1:
        print("--workers must be >= 1")
        return 2

    repo_path = os.path.abspath(os.path.expanduser(args.repo_path))

    if args.clean_worktrees:
        print("AI Company OS run manager worktree cleanup")
        print(f"repo path: {repo_path}")
        return 0 if clean_worktrees(repo_path) else 1

    project_path = os.path.abspath(os.path.expanduser(args.project_path))

    if args.execute:
        print("AI Company OS run manager execution")
        print(f"repo path: {repo_path}")
        print(f"workers planned: {args.workers}")
        return execute_workers(repo_path, project_path, args.workers)

    branch = current_branch(repo_path)
    clean = git_clean(repo_path)

    print("AI Company OS run manager simulation")
    print(f"repo path: {repo_path}")
    print(f"current branch: {branch}")
    print(f"git clean: {str(clean).lower()}")
    print(f"workers planned: {args.workers}")

    entries = worktree_entries(repo_path)
    for index in range(1, args.workers + 1):
        if not ensure_worker_worktree(repo_path, index, entries):
            return 1
        print(f"worker-{index} path: {worker_path(repo_path, index)}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
