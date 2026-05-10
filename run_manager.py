import argparse
import json
import os
from pathlib import PurePosixPath
import subprocess
import sys
import tempfile
from datetime import datetime

from task_queue import (
    DEFAULT_PROJECT,
    list_task_files,
    load_task_file,
    write_task_file,
)


PROJECT_PRIORITIES = {"high": 0, "medium": 1, "low": 2}


def run_cmd(command, repo_path, env=None):
    command_env = None
    if env:
        command_env = os.environ.copy()
        command_env.update(env)
    return subprocess.run(command, cwd=repo_path, check=False, capture_output=True, text=True, env=command_env)


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
    all_tasks = []
    for task_file in list_task_files(project_path):
        task = load_task_file_or_report(task_file)
        if task is None:
            continue
        all_tasks.append((task_file, task))

    tasks_by_id = {str(task.get("id")): task for _, task in all_tasks}

    for task_file, task in all_tasks:
        status = task.get("status")
        if status in {"completed_real", "archived", "failed"}:
            task_id = task.get("id") or os.path.basename(task_file)
            print(f"skipping task {task_id} (status: {status})")
            continue
        if status == "queued":
            waiting_for = waiting_dependencies(task, tasks_by_id)
            if waiting_for:
                task_id = task.get("id") or os.path.basename(task_file)
                print(f"skipping task {task_id} (waiting for dependencies: {waiting_for})")
                continue
            tasks.append((task_file, task))
    return sorted(tasks, key=lambda item: queued_task_sort_key(item[1]))


def parse_project_names(projects_arg, fallback_project):
    if not projects_arg:
        return [fallback_project]
    return [
        name.strip()
        for name in projects_arg.split(",")
        if name.strip()
    ]


def load_project_priority(project_path):
    path = os.path.join(project_path, "project.json")
    if not os.path.exists(path):
        return "low"
    try:
        with open(path, "r", encoding="utf-8") as file:
            data = json.load(file)
    except (json.JSONDecodeError, OSError):
        return "low"

    priority = str(data.get("project_priority", "low")).lower()
    return priority if priority in PROJECT_PRIORITIES else "low"


def project_configs(repo_path, project_names, project_path=None):
    if project_path:
        path = os.path.abspath(os.path.expanduser(project_path))
        return [{
            "name": os.path.basename(path),
            "path": path,
            "priority": load_project_priority(path),
        }]

    projects = []
    for name in project_names:
        path = os.path.abspath(os.path.join(repo_path, "projects", name))
        projects.append({
            "name": name,
            "path": path,
            "priority": load_project_priority(path),
        })
    return projects


def scheduled_tasks(projects):
    scheduled = []
    for project in sorted(projects, key=lambda item: PROJECT_PRIORITIES[item["priority"]]):
        print(f"Scheduling project: {project['name']} (priority: {project['priority']})")
        for task_file, task in queued_tasks(project["path"]):
            scheduled.append((project["name"], task_file, task))
    return scheduled


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


def waiting_dependencies(task, tasks_by_id):
    depends_on = task.get("depends_on") or []
    waiting_for = []
    for dependency_id in depends_on:
        dependency = tasks_by_id.get(str(dependency_id))
        if not dependency or dependency.get("status") != "completed_real":
            waiting_for.append(dependency_id)
    return waiting_for


def task_metrics(project_path):
    metrics = {
        "total_tasks": 0,
        "completed_real": 0,
        "failed": 0,
        "queued": 0,
        "archived": 0,
        "retrying": 0,
        "success_rate": 0,
    }
    for task_file in list_task_files(project_path):
        task = load_task_file_or_report(task_file)
        if task is None:
            continue
        metrics["total_tasks"] += 1
        status = task.get("status")
        if status in {"completed_real", "failed", "queued", "archived"}:
            metrics[status] += 1
        if int(task.get("retry_count") or 0) > 0 and status == "queued":
            metrics["retrying"] += 1

    finished = metrics["completed_real"] + metrics["failed"]
    if finished:
        metrics["success_rate"] = round((metrics["completed_real"] / finished) * 100)
    return metrics


def write_metrics(project_path, metrics):
    path = os.path.join(project_path, "metrics.json")
    with open(path, "w", encoding="utf-8") as file:
        json.dump(metrics, file, indent=2)
        file.write("\n")


def print_metrics(project_path):
    metrics = task_metrics(project_path)
    write_metrics(project_path, metrics)
    print("AI Company OS metrics")
    print(f"- total tasks: {metrics['total_tasks']}")
    print(f"- completed: {metrics['completed_real']}")
    print(f"- failed: {metrics['failed']}")
    print(f"- queued: {metrics['queued']}")
    print(f"- archived: {metrics['archived']}")
    print(f"- retrying: {metrics['retrying']}")
    print(f"- success rate: {metrics['success_rate']}%")


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
    retry_count = int(task.get("retry_count") or 0) + 1
    task["retry_count"] = retry_count
    task["last_error"] = short_error(error)
    if retry_count >= 3:
        task["status"] = "failed"
        task["failed_at"] = utc_now()
        print(f"task {task.get('id')} marked failed after max retries")
    else:
        task["status"] = "queued"
        print(f"retrying task {task.get('id')} (attempt {retry_count + 1}/3)")
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


def pr_merge_details(repo_path, pr_url):
    result = run_cmd([
        "gh",
        "pr",
        "view",
        pr_url,
        "--json",
        "url,number,state,headRefName,isDraft",
    ], repo_path)
    if result.returncode != 0:
        return None, f"gh pr view failed: {short_error(result.stderr)}"

    try:
        return json.loads(result.stdout), None
    except json.JSONDecodeError as exc:
        return None, f"could not parse gh pr view output: {exc}"


def mark_pr_ready_if_draft(repo_path, pr_url):
    pr, error = pr_merge_details(repo_path, pr_url)
    if error:
        return False, error
    if pr.get("state") != "OPEN":
        return True, f"PR is not open: {pr.get('state')}"
    if not pr.get("isDraft"):
        return True, "PR is already ready"

    result = run_cmd(["gh", "pr", "ready", pr_url], repo_path)
    if result.returncode != 0:
        return False, f"gh pr ready failed: {short_error(result.stderr)}"
    return True, "PR marked ready"


def conflict_resolution_for_path(path):
    posix_path = PurePosixPath(path)
    if posix_path.match("projects/*/tasks/*.json"):
        return "--ours"
    if posix_path.match("projects/*/logs/*.jsonl"):
        return "--ours"
    if posix_path.match("backend/task-*.py"):
        return "--theirs"
    return None


def rebase_conflicts(worktree_path):
    result = run_cmd(["git", "diff", "--name-only", "--diff-filter=U"], worktree_path)
    if result.returncode != 0:
        return None, f"git diff conflicts failed: {short_error(result.stderr)}"
    return [line.strip() for line in result.stdout.splitlines() if line.strip()], None


def rebase_continue_wants_skip(error):
    lowered = (error or "").lower()
    return "no changes" in lowered or "previous cherry-pick is now empty" in lowered


def auto_resolve_rebase_conflicts(worktree_path):
    resolved = []
    continue_error = None

    while True:
        conflicts, error = rebase_conflicts(worktree_path)
        if error:
            run_cmd(["git", "rebase", "--abort"], worktree_path)
            return False, error
        if not conflicts:
            if rebase_continue_wants_skip(continue_error):
                skipped = run_cmd(["git", "rebase", "--skip"], worktree_path, env={"GIT_EDITOR": "true"})
                if skipped.returncode == 0:
                    return True, f"auto-resolved rebase conflicts: {', '.join(unique_items(resolved))}"
                continue_error = short_error(skipped.stderr)
                continue

            run_cmd(["git", "rebase", "--abort"], worktree_path)
            if continue_error:
                return False, f"git rebase --continue failed: {continue_error}"
            return False, "git rebase origin/main failed with no conflict files"

        resolutions = [(path, conflict_resolution_for_path(path)) for path in conflicts]
        blocked = [path for path, resolution in resolutions if resolution is None]
        if blocked:
            run_cmd(["git", "rebase", "--abort"], worktree_path)
            return False, f"git rebase origin/main failed with unsupported conflicts: {', '.join(blocked)}"

        for path, resolution in resolutions:
            checkout = run_cmd(["git", "checkout", resolution, path], worktree_path)
            if checkout.returncode != 0:
                run_cmd(["git", "rebase", "--abort"], worktree_path)
                return False, f"git checkout {resolution} {path} failed: {short_error(checkout.stderr)}"

            add = run_cmd(["git", "add", path], worktree_path)
            if add.returncode != 0:
                run_cmd(["git", "rebase", "--abort"], worktree_path)
                return False, f"git add {path} failed: {short_error(add.stderr)}"

            resolved.append(path)

        continued = run_cmd(["git", "rebase", "--continue"], worktree_path, env={"GIT_EDITOR": "true"})
        if continued.returncode == 0:
            return True, f"auto-resolved rebase conflicts: {', '.join(unique_items(resolved))}"
        continue_error = short_error(continued.stderr)


def rebase_pr_before_merge(repo_path, pr_url, auto_resolve_conflicts=False):
    pr, error = pr_merge_details(repo_path, pr_url)
    if error:
        return False, error

    branch = pr.get("headRefName")
    if not branch:
        return False, "PR head branch is unknown"

    fetch_main = run_cmd(["git", "fetch", "origin", "main"], repo_path)
    if fetch_main.returncode != 0:
        return False, f"git fetch origin main failed: {short_error(fetch_main.stderr)}"

    fetch_branch = run_cmd([
        "git",
        "fetch",
        "origin",
        f"+refs/heads/{branch}:refs/remotes/origin/{branch}",
    ], repo_path)
    if fetch_branch.returncode != 0:
        return False, f"git fetch PR branch failed: {short_error(fetch_branch.stderr)}"

    worktree_root = os.path.join(repo_path, ".worktrees")
    os.makedirs(worktree_root, exist_ok=True)
    worktree_path = tempfile.mkdtemp(prefix="auto-merge-", dir=worktree_root)
    worktree_added = False

    try:
        add = run_cmd(["git", "worktree", "add", "--detach", worktree_path, f"origin/{branch}"], repo_path)
        if add.returncode != 0:
            return False, f"git worktree add failed: {short_error(add.stderr)}"
        worktree_added = True

        checkout = run_cmd(["git", "checkout", "--detach", f"origin/{branch}"], worktree_path)
        if checkout.returncode != 0:
            return False, f"git checkout PR branch failed: {short_error(checkout.stderr)}"

        rebase_reason = f"rebased {branch} onto origin/main"
        rebase = run_cmd(["git", "rebase", "origin/main"], worktree_path)
        if rebase.returncode != 0:
            if not auto_resolve_conflicts:
                run_cmd(["git", "rebase", "--abort"], worktree_path)
                return False, f"git rebase origin/main failed: {short_error(rebase.stderr)}"

            resolved, resolve_reason = auto_resolve_rebase_conflicts(worktree_path)
            if not resolved:
                return False, resolve_reason
            rebase_reason = resolve_reason

        push = run_cmd(["git", "push", "--force-with-lease", "origin", f"HEAD:refs/heads/{branch}"], worktree_path)
        if push.returncode != 0:
            return False, f"git push --force-with-lease failed: {short_error(push.stderr)}"

        return True, rebase_reason
    finally:
        if worktree_added:
            run_cmd(["git", "worktree", "remove", "--force", worktree_path], repo_path)
        try:
            os.rmdir(worktree_path)
        except OSError:
            pass
        checkout_main(repo_path)


def auto_merge_prs(repo_path, pr_urls, rebase_before_merge=False, auto_resolve_conflicts=False):
    pr_urls = unique_items(pr_urls)
    if not pr_urls:
        print("auto-merge: no PRs created in this run")
        return True

    print("auto-merge:")
    ok = True
    for pr_url in pr_urls:
        pr, error = pr_merge_details(repo_path, pr_url)
        if error:
            print(f"{pr_url} failed: {error}")
            ok = False
            continue
        if pr.get("state") != "OPEN":
            print(f"{pr_url} skipped: PR is already {pr.get('state')}")
            continue

        rebase_reason = None
        if rebase_before_merge:
            rebased, rebase_reason = rebase_pr_before_merge(repo_path, pr_url, auto_resolve_conflicts)
            if not rebased:
                print(f"{pr_url} failed: {rebase_reason}")
                ok = False
                continue

        ready_done, ready_reason = mark_pr_ready_if_draft(repo_path, pr_url)
        if not ready_done:
            print(f"{pr_url} failed: {ready_reason}")
            ok = False
            continue

        ready, reason = pr_ready_to_merge(repo_path, pr_url)
        if not ready:
            if "PR is not open:" in reason:
                print(f"{pr_url} skipped: {reason}")
            else:
                print(f"{pr_url} failed: {reason}")
                ok = False
            continue

        merge_result = run_cmd(["gh", "pr", "merge", pr_url, "--squash", "--delete-branch"], repo_path)
        if merge_result.returncode != 0:
            print(f"{pr_url} failed: gh pr merge failed: {short_error(merge_result.stderr)}")
            ok = False
            continue

        details = rebase_reason or reason
        print(f"{pr_url} squash-merged ({details}; {ready_reason})")

    return ok


def task_sort_key(task):
    task_id = task.get("id")
    if isinstance(task_id, int):
        return (0, task_id)
    if isinstance(task_id, str) and task_id.isdigit():
        return (0, int(task_id))
    return (1, str(task_id))


def task_priority_rank(task):
    priority = str(task.get("priority") or "low").lower()
    return {"high": 0, "medium": 1, "low": 2}.get(priority, 2)


def queued_task_sort_key(task):
    return (task_priority_rank(task), task_sort_key(task))


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


def run_worker_once(repo_path, worker_repo_path, index, task_id, project_name):
    return subprocess.run(
        worker_command(repo_path, worker_repo_path, index, task_id, project_name),
        cwd=repo_path,
        check=False,
        capture_output=True,
        text=True,
    )


def start_worker_once(repo_path, worker_repo_path, index, task_id, project_name):
    return subprocess.Popen(
        worker_command(repo_path, worker_repo_path, index, task_id, project_name),
        cwd=repo_path,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )


def worker_command(repo_path, worker_repo_path, index, task_id, project_name):
    project_path = os.path.join(worker_repo_path, "projects", project_name)
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
        "--project",
        project_name,
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


def execute_workers(repo_path, projects, workers, parallel=False):
    tasks = scheduled_tasks(projects)
    entries = worktree_entries(repo_path)

    if parallel:
        return execute_workers_parallel(repo_path, tasks, entries, workers)

    pr_urls = []
    for index in range(1, workers + 1):
        worker = f"worker-{index}"
        assigned_item = tasks[index - 1] if index - 1 < len(tasks) else None
        assigned = assigned_item[2] if assigned_item else None
        worktree = prepare_worker(repo_path, entries, index, assigned)
        if not worktree:
            continue

        project_name, task_file, _ = assigned_item
        print(f"selected task {assigned.get('id')} (priority: {assigned.get('priority') or 'low'})")
        mark_task_locked(task_file, worker)
        result = run_worker_once(repo_path, worktree, index, assigned.get("id"), project_name)
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
        assigned_item = tasks[index - 1] if index - 1 < len(tasks) else None
        assigned = assigned_item[2] if assigned_item else None
        worktree = prepare_worker(repo_path, entries, index, assigned)
        if not worktree:
            summary[worker] = False
            continue

        project_name, task_file, _ = assigned_item
        print(f"selected task {assigned.get('id')} (priority: {assigned.get('priority') or 'low'})")
        mark_task_locked(task_file, worker)
        process = start_worker_once(repo_path, worktree, index, assigned.get("id"), project_name)
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
    parser.add_argument("--rebase-before-merge", action="store_true")
    parser.add_argument("--auto-resolve-conflicts", action="store_true")
    parser.add_argument("--project", default="Tonymage")
    parser.add_argument("--projects")
    parser.add_argument("--project-path")
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

    project_names = parse_project_names(args.projects, args.project)
    projects = project_configs(repo_path, project_names, args.project_path if not args.projects else None)
    print(f"Active projects: {[project['name'] for project in projects]}")

    if not ensure_main_ready(repo_path):
        return 1

    if args.execute:
        print("AI Company OS run manager execution")
        print(f"repo path: {repo_path}")
        print(f"workers planned: {args.workers}")
        exit_code, pr_urls = execute_workers(repo_path, projects, args.workers, args.parallel)
        if exit_code != 0:
            return exit_code
        if args.auto_merge and not auto_merge_prs(
            repo_path,
            pr_urls,
            args.rebase_before_merge,
            args.auto_resolve_conflicts,
        ):
            return 1
        for project in projects:
            print(f"Metrics project: {project['name']}")
            print_metrics(project["path"])
        return 0

    branch = current_branch(repo_path)
    clean = git_clean(repo_path)

    print("AI Company OS run manager simulation")
    print(f"repo path: {repo_path}")
    print(f"current branch: {branch}")
    print(f"git clean: {str(clean).lower()}")
    print(f"workers planned: {args.workers}")
    scheduled_tasks(projects)

    entries = worktree_entries(repo_path)
    for index in range(1, args.workers + 1):
        if not ensure_worker_worktree(repo_path, index, entries):
            return 1
        print(f"worker-{index} path: {worker_path(repo_path, index)}")

    for project in projects:
        print(f"Metrics project: {project['name']}")
        print_metrics(project["path"])
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
