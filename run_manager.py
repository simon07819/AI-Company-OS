import argparse
import json
import os
import subprocess
import sys
from datetime import datetime

from task_queue import (
    DEFAULT_PROJECT,
    list_task_files,
    load_task_file,
    write_task_file,
)


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


def main_exists(repo_path):
    result = run_cmd(["git", "show-ref", "--verify", "refs/heads/main"], repo_path)
    return result.returncode == 0


def ensure_main_ready(repo_path):
    if not main_exists(repo_path):
        print("ready: false")
        print("reason: local main branch does not exist")
        return False

    checkout = checkout_main(repo_path)
    if checkout.returncode != 0:
        print("ready: false")
        print("reason: could not checkout main")
        if checkout.stderr.strip():
            print(checkout.stderr.strip())
        return False

    fetch = run_cmd(["git", "fetch", "origin", "main"], repo_path)
    if fetch.returncode != 0:
        print("ready: false")
        print("reason: could not fetch origin/main")
        if fetch.stderr.strip():
            print(fetch.stderr.strip())
        return False

    pull = run_cmd(["git", "pull", "--ff-only", "origin", "main"], repo_path)
    if pull.returncode != 0:
        print("ready: false")
        print("reason: could not fast-forward main from origin/main")
        if pull.stderr.strip():
            print(pull.stderr.strip())
        return False

    return True


def queued_tasks(project_path):
    tasks = []
    for task_file in list_task_files(project_path):
        task = load_task_file_or_report(task_file)
        if task is None:
            continue
        if task.get("status") == "queued":
            tasks.append((task_file, task))
    return sorted(tasks, key=lambda item: task_sort_key(item[1]))


def utc_now():
    return datetime.utcnow().isoformat()


def short_error(message):
    line = (message or "").strip().splitlines()
    return (line[0] if line else "worker failed")[:500]


def short_json_error(error):
    return f"{error.msg} at line {error.lineno} column {error.colno}"


def load_task_file_or_report(task_file):
    try:
        return load_task_file(task_file)
    except json.JSONDecodeError as error:
        print(f"invalid task json: {task_file} {short_json_error(error)}")
        return None


def mark_task_locked(task_file, worker):
    task = load_task_file(task_file)
    task["status"] = "locked"
    task["locked_by"] = worker
    task["locked_at"] = utc_now()
    write_task_file(task_file, task)
    return task


def mark_task_completed(task_file, pr_url=None):
    task = load_task_file(task_file)
    task["status"] = "completed_real"
    task["completed_at"] = utc_now()
    if pr_url:
        task["pr_url"] = pr_url
    task.pop("error", None)
    write_task_file(task_file, task)
    return task


def mark_task_failed(task_file, error):
    task = load_task_file(task_file)
    task["status"] = "failed"
    task["failed_at"] = utc_now()
    task["error"] = short_error(error)
    write_task_file(task_file, task)
    return task


def task_pr_url(output):
    for line in output.splitlines():
        if line.startswith("Draft PR created:"):
            return line.removeprefix("Draft PR created:").strip()
    return None


def unique_items(items):
    seen = set()
    unique = []
    for item in items:
        if item and item not in seen:
            seen.add(item)
            unique.append(item)
    return unique


def check_rollup_ok(status_check_rollup):
    if not status_check_rollup:
        return True, "no status checks"

    checks = status_check_rollup
    if isinstance(status_check_rollup, dict):
        checks = status_check_rollup.get("nodes") or status_check_rollup.get("contexts") or []

    failing = []
    pending = []
    for check in checks:
        name = check.get("name") or check.get("context") or check.get("workflowName") or "status check"
        conclusion = (check.get("conclusion") or "").upper()
        status = (check.get("status") or check.get("state") or "").upper()

        if conclusion in {"SUCCESS", "NEUTRAL", "SKIPPED"}:
            continue
        if status in {"SUCCESS"}:
            continue
        if conclusion in {"FAILURE", "TIMED_OUT", "CANCELLED", "ACTION_REQUIRED", "STARTUP_FAILURE", "STALE"}:
            failing.append(name)
            continue
        if status in {"FAILURE", "ERROR"}:
            failing.append(name)
            continue
        pending.append(name)

    if failing:
        return False, f"failing checks: {', '.join(failing)}"
    if pending:
        return False, f"pending checks: {', '.join(pending)}"
    return True, "status checks passed"


def pr_ready_to_merge(repo_path, pr_url):
    result = run_cmd([
        "gh",
        "pr",
        "view",
        pr_url,
        "--json",
        "url,number,title,state,isDraft,mergeable,mergeStateStatus,statusCheckRollup",
    ], repo_path)
    if result.returncode != 0:
        return False, f"gh pr view failed: {short_error(result.stderr)}"

    try:
        pr = json.loads(result.stdout)
    except json.JSONDecodeError as exc:
        return False, f"could not parse gh pr view output: {exc}"

    if pr.get("state") != "OPEN":
        return False, f"PR is not open: {pr.get('state')}"

    mergeable = (pr.get("mergeable") or "").upper()
    merge_state = (pr.get("mergeStateStatus") or "").upper()
    if mergeable == "CONFLICTING" or merge_state == "DIRTY":
        return False, "PR has merge conflicts"

    checks_ok, checks_reason = check_rollup_ok(pr.get("statusCheckRollup"))
    if not checks_ok:
        return False, checks_reason

    return True, checks_reason


def auto_merge_prs(repo_path, pr_urls):
    pr_urls = unique_items(pr_urls)
    if not pr_urls:
        print("auto-merge: no PRs created in this run")
        return True

    print("auto-merge:")
    ok = True
    for pr_url in pr_urls:
        ready, reason = pr_ready_to_merge(repo_path, pr_url)
        if not ready:
            print(f"{pr_url} failed: {reason}")
            ok = False
            continue

        ready_result = run_cmd(["gh", "pr", "ready", pr_url], repo_path)
        if ready_result.returncode != 0:
            print(f"{pr_url} failed: gh pr ready failed: {short_error(ready_result.stderr)}")
            ok = False
            continue

        merge_result = run_cmd(["gh", "pr", "merge", pr_url, "--squash", "--auto"], repo_path)
        if merge_result.returncode != 0:
            print(f"{pr_url} failed: gh pr merge failed: {short_error(merge_result.stderr)}")
            ok = False
            continue

        print(f"{pr_url} queued for squash auto-merge ({reason})")

    return ok


def task_sort_key(task):
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


def worker_branch(index):
    return f"worktree/worker-{index}"


def checkout_worker_branch(repo_path, index):
    return run_cmd(["git", "checkout", worker_branch(index)], repo_path)


def ensure_worker_branch(repo_path, index):
    branch = worker_branch(index)
    exists = run_cmd(["git", "show-ref", "--verify", f"refs/heads/{branch}"], repo_path)
    if exists.returncode == 0:
        return True
    else:
        result = run_cmd(["git", "branch", branch, "main"], repo_path)

    if result.returncode != 0:
        print("ready: false")
        print(f"reason: failed to prepare {branch}")
        if result.stderr.strip():
            print(result.stderr.strip())
        return False
    return True


def ensure_worker_worktree(repo_path, index, entries):
    path = worker_path(repo_path, index)
    relative_path = worker_relative_path(index)
    branch = worker_branch(index)

    if not ensure_worker_branch(repo_path, index):
        return False

    if os.path.exists(path):
        if path not in entries:
            print(f"ready: false")
            print(f"reason: {relative_path} exists but is not a git worktree")
            return False
        checkout = checkout_worker_branch(path, index)
        if checkout.returncode != 0:
            print("ready: false")
            print(f"reason: failed to checkout {branch} in {relative_path}")
            if checkout.stderr.strip():
                print(checkout.stderr.strip())
            return False
        return True

    os.makedirs(os.path.dirname(path), exist_ok=True)
    result = run_cmd(
        ["git", "worktree", "add", "--force", relative_path, branch],
        repo_path,
    )
    if result.returncode != 0:
        print("ready: false")
        print(f"reason: failed to create {relative_path}")
        if result.stderr.strip():
            print(result.stderr.strip())
        return False
    return True


def run_worker_once(repo_path, worker_repo_path, index, task_id):
    return subprocess.run(
        worker_command(repo_path, worker_repo_path, index, task_id),
        cwd=repo_path,
        check=False,
        capture_output=True,
        text=True,
    )


def start_worker_once(repo_path, worker_repo_path, index, task_id):
    return subprocess.Popen(
        worker_command(repo_path, worker_repo_path, index, task_id),
        cwd=repo_path,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )


def worker_command(repo_path, worker_repo_path, index, task_id):
    project_path = os.path.join(worker_repo_path, "projects", "Tonymage")
    return [
        sys.executable,
        os.path.join(repo_path, "run_worker.py"),
        "--once",
        "--task-id",
        str(task_id),
        "--repo-path",
        worker_repo_path,
        "--project-path",
        project_path,
        "--base-branch",
        worker_branch(index),
    ]


def prepare_worker(repo_path, entries, index, assigned):
    worker = f"worker-{index}"
    worktree = worker_path(repo_path, index)
    label = f"task {assigned.get('id')} | {assigned.get('title')}" if assigned else "idle"
    print(f"{worker} -> {label}")

    if not assigned:
        return None
    if not ensure_worker_worktree(repo_path, index, entries):
        return None
    if not git_clean(worktree):
        print(f"{worker} skipped: worktree is not clean")
        return None

    checkout = checkout_worker_branch(worktree, index)
    if checkout.returncode != 0:
        print(f"{worker} skipped: could not checkout {worker_branch(index)}")
        if checkout.stderr.strip():
            print(checkout.stderr.strip())
        return None

    return worktree


def execute_workers(repo_path, project_path, workers, parallel=False):
    tasks = queued_tasks(project_path)
    entries = worktree_entries(repo_path)

    if parallel:
        return execute_workers_parallel(repo_path, tasks, entries, workers)

    pr_urls = []
    for index in range(1, workers + 1):
        worker = f"worker-{index}"
        assigned_pair = tasks[index - 1] if index - 1 < len(tasks) else None
        assigned = assigned_pair[1] if assigned_pair else None
        worktree = prepare_worker(repo_path, entries, index, assigned)
        if not worktree:
            continue

        task_file = assigned_pair[0]
        mark_task_locked(task_file, worker)
        result = run_worker_once(repo_path, worktree, index, assigned.get("id"))
        if result.stdout.strip():
            print(result.stdout.strip())
        if result.stderr.strip():
            print(result.stderr.strip())
        if result.returncode != 0:
            print(f"{worker} failed with exit code {result.returncode}")
            mark_task_failed(task_file, result.stderr.strip() or f"{worker} exited with {result.returncode}")
        else:
            pr_url = task_pr_url(result.stdout)
            if pr_url:
                pr_urls.append(pr_url)
            mark_task_completed(task_file, pr_url)
        if git_clean(worktree):
            checkout_worker_branch(worktree, index)

    return 0, pr_urls


def execute_workers_parallel(repo_path, tasks, entries, workers):
    processes = []
    summary = {}
    pr_urls = []

    for index in range(1, workers + 1):
        worker = f"worker-{index}"
        assigned_pair = tasks[index - 1] if index - 1 < len(tasks) else None
        assigned = assigned_pair[1] if assigned_pair else None
        worktree = prepare_worker(repo_path, entries, index, assigned)
        if not worktree:
            summary[worker] = False
            continue

        task_file = assigned_pair[0]
        mark_task_locked(task_file, worker)
        process = start_worker_once(repo_path, worktree, index, assigned.get("id"))
        processes.append((worker, worktree, index, task_file, process))

    for worker, worktree, index, task_file, process in processes:
        stdout, stderr = process.communicate()
        if stdout.strip():
            print(stdout.strip())
        if stderr.strip():
            print(stderr.strip())
        summary[worker] = process.returncode == 0
        if process.returncode != 0:
            print(f"{worker} failed with exit code {process.returncode}")
            mark_task_failed(task_file, stderr.strip() or f"{worker} exited with {process.returncode}")
        else:
            pr_url = task_pr_url(stdout)
            if pr_url:
                pr_urls.append(pr_url)
            mark_task_completed(task_file, pr_url)
        if git_clean(worktree):
            checkout_worker_branch(worktree, index)

    print("summary:")
    for index in range(1, workers + 1):
        worker = f"worker-{index}"
        status = "success" if summary.get(worker) else "fail"
        print(f"{worker} {status}")

    return 0, pr_urls


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
    parser.add_argument("--parallel", action="store_true")
    parser.add_argument("--auto-merge", action="store_true")
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

    if not ensure_main_ready(repo_path):
        return 1

    if args.execute:
        print("AI Company OS run manager execution")
        print(f"repo path: {repo_path}")
        print(f"workers planned: {args.workers}")
        exit_code, pr_urls = execute_workers(repo_path, project_path, args.workers, args.parallel)
        if exit_code != 0:
            return exit_code
        if args.auto_merge and not auto_merge_prs(repo_path, pr_urls):
            return 1
        return 0

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
