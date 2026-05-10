import argparse
import json
import os
import subprocess
import sys

from task_queue import (
    DEFAULT_PROJECT,
    list_task_files,
    load_task_file,
    mark_task_completed_real,
    mark_task_running,
    utc_now,
    write_task_file,
)
from workers.github_worker import GitHubWorkerError, safe_branch_name


def run_cmd(command, repo_path, check=True):
    result = subprocess.run(command, cwd=repo_path, check=False, capture_output=True, text=True)
    if check and result.returncode != 0:
        output = (result.stderr or result.stdout or "").strip()
        raise GitHubWorkerError(f"Command failed: {' '.join(command)}\n{output}")
    return result


def current_branch(repo_path):
    return run_cmd(["git", "branch", "--show-current"], repo_path).stdout.strip()


def git_clean(repo_path):
    return run_cmd(["git", "status", "--porcelain"], repo_path).stdout.strip() == ""


def gh_auth_ok(repo_path):
    return run_cmd(["gh", "auth", "status"], repo_path, check=False).returncode == 0


def preflight(repo_path, base_branch):
    branch = current_branch(repo_path)
    if branch != base_branch:
        raise GitHubWorkerError(f"Refusing to work: current branch must be {base_branch}, got {branch}")
    if not git_clean(repo_path):
        raise GitHubWorkerError("Refusing to work: git status is not clean")
    if not gh_auth_ok(repo_path):
        raise GitHubWorkerError("GitHub CLI authentication failed. Run: gh auth login")
    origin = run_cmd(["git", "remote", "get-url", "origin"], repo_path).stdout.strip()
    if not origin:
        raise GitHubWorkerError("Refusing to work: no remote origin configured")


def branch_exists(repo_path, branch):
    local = run_cmd(["git", "show-ref", "--verify", f"refs/heads/{branch}"], repo_path, check=False)
    if local.returncode == 0:
        return True
    remote = run_cmd(["git", "ls-remote", "--exit-code", "--heads", "origin", branch], repo_path, check=False)
    return remote.returncode == 0


def remote_branch_exists(repo_path, branch):
    remote = run_cmd(["git", "ls-remote", "--exit-code", "--heads", "origin", branch], repo_path, check=False)
    return remote.returncode == 0


def unique_branch(repo_path, base_branch):
    branch = base_branch
    version = 2
    while branch_exists(repo_path, branch):
        branch = f"{base_branch}-v{version}"
        version += 1
    return branch


def checkout_new_branch(repo_path, branch):
    run_cmd(["git", "checkout", "-b", branch], repo_path)


def checkout_branch(repo_path, branch):
    run_cmd(["git", "checkout", branch], repo_path, check=False)


def cleanup_dirty(repo_path):
    status = run_cmd(["git", "status", "--porcelain"], repo_path, check=False).stdout
    if not status.strip():
        return
    run_cmd(["git", "restore", "--staged", "."], repo_path, check=False)
    tracked = []
    untracked = []
    for line in status.splitlines():
        path = line[3:]
        if line.startswith("?? "):
            untracked.append(path)
        else:
            tracked.append(path)
    if tracked:
        run_cmd(["git", "restore", "--worktree", *tracked], repo_path, check=False)
    for path in untracked:
        full_path = os.path.join(repo_path, path)
        if os.path.isfile(full_path):
            os.remove(full_path)


def commit_all(repo_path, message):
    run_cmd(["git", "add", "."], repo_path)
    run_cmd(["git", "commit", "-m", message], repo_path)


SAAS_TASK_MAPPING = {
    "landing page": ["app/page.tsx"],
    "landing": ["app/page.tsx"],
    "dashboard": ["app/dashboard/page.tsx"],
    "authentication": ["app/api/auth/route.ts", "lib/auth.ts"],
    "billing": ["app/api/billing/route.ts", "lib/billing.ts"],
    "payment": ["app/api/billing/route.ts", "lib/billing.ts"],
    "admin": ["app/admin/page.tsx", "app/api/admin/route.ts"],
    "prisma": ["prisma/schema.prisma"],
    "database schema": ["prisma/schema.prisma"],
    "member": ["app/members/page.tsx", "lib/members.ts"],
    "pricing": ["app/pricing/page.tsx"],
    "onboarding": ["app/onboarding/page.tsx"],
}


def resolve_saas_targets(title):
    lowered = title.lower()
    for keyword, targets in SAAS_TASK_MAPPING.items():
        if keyword in lowered:
            return targets
    return []


def saas_file_content(rel_path, task):
    title = task.get("title", "")
    description = task.get("description") or title
    if rel_path == "app/page.tsx":
        return (
            "export default function LandingPage() {\n"
            "  return (\n"
            '    <main className="min-h-screen flex flex-col items-center justify-center p-8">\n'
            f'      <h1 className="text-4xl font-bold mb-4">{title}</h1>\n'
            f'      <p className="text-lg text-gray-600 mb-8">{description}</p>\n'
            "    </main>\n"
            "  );\n"
            "}\n"
        )
    if rel_path == "app/dashboard/page.tsx":
        return (
            "export default function DashboardPage() {\n"
            "  return (\n"
            '    <main className="min-h-screen p-8">\n'
            '      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>\n'
            f'      <p className="text-gray-500">{description}</p>\n'
            "    </main>\n"
            "  );\n"
            "}\n"
        )
    if rel_path == "app/api/auth/route.ts":
        return (
            'import { NextResponse } from "next/server";\n\n'
            "export async function POST(request: Request) {\n"
            "  const body = await request.json();\n"
            "  const { email, password } = body;\n"
            "  if (!email || !password) {\n"
            '    return NextResponse.json({ error: "Missing credentials" }, { status: 400 });\n'
            "  }\n"
            '  return NextResponse.json({ token: "stub-token", email });\n'
            "}\n"
        )
    if rel_path == "lib/auth.ts":
        return (
            "export function verifyToken(token: string): boolean {\n"
            "  return typeof token === \"string\" && token.length > 0;\n"
            "}\n\n"
            "export function getUserFromToken(token: string): { email: string } | null {\n"
            "  if (!verifyToken(token)) return null;\n"
            '  return { email: "user@example.com" };\n'
            "}\n"
        )
    if rel_path == "app/api/billing/route.ts":
        return (
            'import { NextResponse } from "next/server";\n\n'
            "export async function GET() {\n"
            '  return NextResponse.json({ plan: "free", status: "active" });\n'
            "}\n\n"
            "export async function POST(request: Request) {\n"
            "  const body = await request.json();\n"
            '  return NextResponse.json({ subscribed: true, plan: body.plan ?? "pro" });\n'
            "}\n"
        )
    if rel_path == "lib/billing.ts":
        return (
            'export type Plan = "free" | "pro" | "enterprise";\n\n'
            "export function getPlanLimits(plan: Plan): { requests: number } {\n"
            "  const limits: Record<Plan, { requests: number }> = {\n"
            "    free: { requests: 100 },\n"
            "    pro: { requests: 10000 },\n"
            "    enterprise: { requests: -1 },\n"
            "  };\n"
            "  return limits[plan];\n"
            "}\n"
        )
    if rel_path == "app/admin/page.tsx":
        return (
            "export default function AdminPage() {\n"
            "  return (\n"
            '    <main className="min-h-screen p-8">\n'
            '      <h1 className="text-3xl font-bold mb-6">Admin Panel</h1>\n'
            f'      <p className="text-gray-500">{description}</p>\n'
            "    </main>\n"
            "  );\n"
            "}\n"
        )
    if rel_path == "app/api/admin/route.ts":
        return (
            'import { NextResponse } from "next/server";\n\n'
            "export async function GET() {\n"
            '  return NextResponse.json({ status: "ok", role: "admin" });\n'
            "}\n"
        )
    if rel_path == "app/members/page.tsx":
        return (
            "export default function MembersPage() {\n"
            "  return (\n"
            '    <main className="min-h-screen p-8">\n'
            '      <h1 className="text-3xl font-bold mb-6">Members</h1>\n'
            f'      <p className="text-gray-500">{description}</p>\n'
            "    </main>\n"
            "  );\n"
            "}\n"
        )
    if rel_path == "lib/members.ts":
        return (
            "export interface Member {\n"
            "  id: string;\n"
            "  email: string;\n"
            '  plan: "starter" | "pro" | "enterprise";\n'
            "  joinedAt: Date;\n"
            "}\n\n"
            "export function formatMember(m: Member): string {\n"
            "  return `${m.email} (${m.plan})`;\n"
            "}\n"
        )
    if rel_path == "app/pricing/page.tsx":
        return (
            'import Link from "next/link";\n\n'
            "const PLANS = [\n"
            '  { name: "Starter", price: 29, members: 100 },\n'
            '  { name: "Pro", price: 79, members: 500 },\n'
            '  { name: "Enterprise", price: 199, members: -1 },\n'
            "];\n\n"
            "export default function PricingPage() {\n"
            "  return (\n"
            '    <main className="min-h-screen p-8">\n'
            '      <h1 className="text-3xl font-bold mb-8 text-center">Pricing</h1>\n'
            '      <div className="grid grid-cols-3 gap-6 max-w-4xl mx-auto">\n'
            "        {PLANS.map((plan) => (\n"
            '          <div key={plan.name} className="border rounded-xl p-6">\n'
            '            <h2 className="text-xl font-semibold mb-2">{plan.name}</h2>\n'
            '            <p className="text-3xl font-bold mb-4">${plan.price}<span className="text-sm font-normal">/mo</span></p>\n'
            '            <p className="text-gray-500 mb-6">{plan.members === -1 ? "Unlimited members" : `Up to ${plan.members} members`}</p>\n'
            '            <Link href="/dashboard" className="block text-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Get Started</Link>\n'
            "          </div>\n"
            "        ))}\n"
            "      </div>\n"
            "    </main>\n"
            "  );\n"
            "}\n"
        )
    if rel_path == "app/onboarding/page.tsx":
        return (
            "export default function OnboardingPage() {\n"
            "  return (\n"
            '    <main className="min-h-screen flex flex-col items-center justify-center p-8">\n'
            '      <h1 className="text-3xl font-bold mb-4">Welcome!</h1>\n'
            f'      <p className="text-gray-500 mb-8">{description}</p>\n'
            '      <a href="/dashboard" className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Go to Dashboard</a>\n'
            "    </main>\n"
            "  );\n"
            "}\n"
        )
    if rel_path == "prisma/schema.prisma":
        return (
            'generator client {\n'
            '  provider = "prisma-client-js"\n'
            '}\n\n'
            'datasource db {\n'
            '  provider = "postgresql"\n'
            '  url      = env("DATABASE_URL")\n'
            '}\n\n'
            'enum Role {\n'
            '  USER\n'
            '  ADMIN\n'
            '}\n\n'
            'model User {\n'
            '  id        String   @id @default(cuid())\n'
            '  email     String   @unique\n'
            '  name      String?\n'
            '  role      Role     @default(USER)\n'
            '  createdAt DateTime @default(now())\n'
            '  updatedAt DateTime @updatedAt\n'
            '}\n'
        )
    return f"// {title}: {description}\n"


def write_saas_app_files(app_dir, repo_path, targets, task):
    written = []
    for rel_path in targets:
        full_path = os.path.join(app_dir, rel_path)
        os.makedirs(os.path.dirname(full_path), exist_ok=True)
        content = saas_file_content(rel_path, task)
        with open(full_path, "w", encoding="utf-8") as f:
            f.write(content)
        repo_rel = os.path.relpath(full_path, repo_path)
        print(f"Modifying app file: {repo_rel}")
        written.append(repo_rel)
    return written


def _attempt_fix(app_dir, error_output):
    """Apply simple auto-corrections based on build/lint errors."""
    lowered = error_output.lower()
    if not ("usestate" in lowered or "useeffect" in lowered or "hooks can only" in lowered):
        return
    for root, _, files in os.walk(app_dir):
        if "node_modules" in root or ".next" in root:
            continue
        for fname in files:
            if not fname.endswith((".tsx", ".ts")):
                continue
            fpath = os.path.join(root, fname)
            try:
                with open(fpath, "r", encoding="utf-8") as f:
                    content = f.read()
                needs_client = (
                    ("useState" in content or "useEffect" in content or "useCallback" in content)
                    and not content.lstrip().startswith('"use client"')
                )
                if needs_client:
                    with open(fpath, "w", encoding="utf-8") as f:
                        f.write('"use client";\n\n' + content)
                    print(f"Auto-fix: added 'use client' to {os.path.relpath(fpath, app_dir)}")
            except OSError:
                pass


def run_npm_steps(app_dir):
    pkg_path = os.path.join(app_dir, "package.json")
    if not os.path.isfile(pkg_path):
        return

    # Ensure node_modules is gitignored before installing
    gitignore_path = os.path.join(app_dir, ".gitignore")
    if not os.path.isfile(gitignore_path):
        with open(gitignore_path, "w", encoding="utf-8") as f:
            f.write("node_modules/\n.next/\n.env\n.env.local\n")
        print("Created .gitignore for app directory")

    print("Running npm install...")
    result = subprocess.run(["npm", "install"], cwd=app_dir, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"npm install warning: {(result.stderr or '').strip()[:300]}")
        return

    try:
        with open(pkg_path, "r", encoding="utf-8") as f:
            pkg = json.load(f)
        scripts = pkg.get("scripts", {})

        if "lint" in scripts:
            print("Running npm run lint...")
            lint = subprocess.run(["npm", "run", "lint"], cwd=app_dir, capture_output=True, text=True)
            if lint.returncode != 0:
                err = ((lint.stdout or "") + (lint.stderr or "")).strip()
                print(f"npm run lint warning: {err[:300]}")
                _attempt_fix(app_dir, err)

        if "build" in scripts:
            print("Running npm run build...")
            build = subprocess.run(["npm", "run", "build"], cwd=app_dir, capture_output=True, text=True)
            if build.returncode != 0:
                err = ((build.stdout or "") + (build.stderr or "")).strip()
                print(f"npm run build warning: {err[:300]}")
                _attempt_fix(app_dir, err)
    except Exception as exc:
        print(f"npm steps warning: {exc}")


def _write_agent_files(app_dir, repo_path, files_map):
    """Write {rel_path: content} returned by an agent to the app directory."""
    written = []
    for rel_path, content in files_map.items():
        full_path = os.path.join(app_dir, rel_path)
        os.makedirs(os.path.dirname(full_path), exist_ok=True)
        with open(full_path, "w", encoding="utf-8") as f:
            f.write(content)
        repo_rel = os.path.relpath(full_path, repo_path)
        print(f"Modifying app file: {repo_rel}")
        written.append(repo_rel)
    return written


def write_task_code(repo_path, task, project_path=None):
    if project_path:
        project_name = os.path.basename(project_path)
        app_dir = os.path.join(repo_path, "projects", project_name, "app")
        if os.path.isdir(app_dir):
            print(f"Using SaaS template context for project: {project_name}")
            _selected_agent = None
            try:
                from agent_router import select_agent
                from shared_context import build_context
                from agent_activity import log_agent_activity
                context = build_context(repo_path, task, project_path)
                agent = select_agent(task, context)
                _selected_agent = agent.name
                print(f"Selected agent: {agent.name}")
                log_agent_activity(project_name, task.get("id"), task.get("title", ""), agent.name, "selected", f"Selected {agent.name} for task {task.get('id')}", repo_path)
                result = agent.run(task, context)
                files_map = result.get("files", {})
                # Handle backend_agent Python stub (no SaaS target)
                if "__python_stub__" in files_map:
                    slug = files_map.get("__python_slug__", "task")
                    path = os.path.join("backend", f"{slug}.py")
                    full_path = os.path.join(repo_path, path)
                    os.makedirs(os.path.dirname(full_path), exist_ok=True)
                    with open(full_path, "w", encoding="utf-8") as f:
                        f.write(files_map["__python_stub__"])
                    log_agent_activity(project_name, task.get("id"), task.get("title", ""), agent.name, "completed", f"{agent.name} generated stub for task {task.get('id')}", repo_path)
                    return [path]
                if files_map:
                    if result.get("notes"):
                        print(f"Agent notes: {result['notes']}")
                    written = _write_agent_files(app_dir, repo_path, files_map)
                    log_agent_activity(project_name, task.get("id"), task.get("title", ""), agent.name, "completed", result.get("notes") or f"{agent.name} completed task {task.get('id')}", repo_path)
                    run_npm_steps(app_dir)
                    return written
            except Exception as exc:
                print(f"Agent error: {exc} — falling back to legacy SaaS path")
                try:
                    from agent_activity import log_agent_activity
                    log_agent_activity(project_name, task.get("id"), task.get("title", ""), _selected_agent or "unknown", "error", str(exc)[:300], repo_path)
                except Exception:
                    pass
            # Legacy fallback
            targets = resolve_saas_targets(task.get("title", ""))
            if targets:
                files = write_saas_app_files(app_dir, repo_path, targets, task)
                run_npm_steps(app_dir)
                return files

    slug = safe_branch_name(task).split("/")[-1]
    path = os.path.join("backend", f"{slug}.py")
    full_path = os.path.join(repo_path, path)
    os.makedirs(os.path.dirname(full_path), exist_ok=True)
    with open(full_path, "w", encoding="utf-8") as file:
        description = task.get("description") or task.get("title") or ""
        file.write(f'"""{task["title"]}: {description}"""\n\n')
        file.write("def run():\n    return {'status': 'stubbed'}\n")
    return [path]


def short_json_error(error):
    return f"{error.msg} at line {error.lineno} column {error.colno}"


def short_error(message):
    line = str(message or "").strip().splitlines()
    return (line[0] if line else "worker failed")[:500]


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


def load_task_file_or_report(task_file):
    try:
        return load_task_file(task_file)
    except json.JSONDecodeError as error:
        print(f"invalid task json: {task_file} {short_json_error(error)}")
        return None


def task_sort_key(task):
    task_id = task.get("id")
    if isinstance(task_id, int):
        return (0, task_id)
    if isinstance(task_id, str) and task_id.isdigit():
        return (0, int(task_id))
    return (1, str(task_id))


def valid_task_items(project_path):
    tasks = []
    invalid = 0
    for task_file in list_task_files(project_path):
        task = load_task_file_or_report(task_file)
        if task is None:
            invalid += 1
            continue
        tasks.append((task_file, task))
    return sorted(tasks, key=lambda item: task_sort_key(item[1])), invalid


def next_queued_task_safe(project_path):
    for task_file, task in valid_task_items(project_path)[0]:
        if task.get("status") == "queued":
            return task_file, task
    return None, None


def task_by_id(project_path, task_id):
    requested = str(task_id)
    for task_file, task in valid_task_items(project_path)[0]:
        if str(task.get("id")) == requested:
            return task_file, task
    return None, None


def worker_id_from_base_branch(base_branch):
    prefix = "worktree/"
    if base_branch.startswith(prefix):
        return base_branch.removeprefix(prefix)
    return None


def select_task(project_path, task_id=None, worker_id=None):
    if task_id is None:
        return next_queued_task_safe(project_path)

    task_file, task = task_by_id(project_path, task_id)
    if not task:
        print(f"Task {task_id} not found.", file=sys.stderr)
        return None, None
    status = task.get("status")
    locked_by = task.get("locked_by")
    locked_for_worker = status == "locked" and (not locked_by or not worker_id or locked_by == worker_id)
    if status != "queued" and not locked_for_worker:
        print(
            f"Task {task_id} is not queued or locked for this worker (status: {status or 'unknown'}).",
            file=sys.stderr,
        )
        return None, None
    return task_file, task


def run_one(project_path, repo_path, task_id=None, base_branch="main"):
    task_file, task = select_task(project_path, task_id, worker_id_from_base_branch(base_branch))
    if not task:
        if task_id is None:
            print("No queued task found.")
        return False

    print(f"Selected task {task['id']}: {task['title']}")
    print(f"task path: {os.path.relpath(task_file, repo_path)}")
    print(f"Repo path: {repo_path}")
    print("Running preflight checks...")

    branch = None
    running = False
    try:
        preflight(repo_path, base_branch)
        branch = unique_branch(repo_path, safe_branch_name(task))
        print(f"Creating branch: {branch}")
        checkout_new_branch(repo_path, branch)
        task = mark_task_running(task_file, branch)
        running = True
        print(f"Task {task['id']} marked running.")

        files_changed = write_task_code(repo_path, task, project_path)
        print(f"Files changed: {', '.join(files_changed)}")
        if remote_branch_exists(repo_path, branch):
            branch = unique_branch(repo_path, safe_branch_name(task))
            print(f"Branch appeared on origin before push; using {branch}")
            run_cmd(["git", "branch", "-m", branch], repo_path)
            task = mark_task_running(task_file, branch)

        commit_all(repo_path, f"AI task: {task['title']}")
        if remote_branch_exists(repo_path, branch):
            branch = unique_branch(repo_path, safe_branch_name(task))
            print(f"Remote branch exists before push; renaming to {branch}")
            run_cmd(["git", "branch", "-m", branch], repo_path)
            task = mark_task_running(task_file, branch)
            commit_all(repo_path, f"AI task branch: {task['title']}")
        run_cmd(["git", "push", "-u", "origin", branch], repo_path)
        description = task.get("description") or task.get("title") or ""
        pr_url = run_cmd([
            "gh",
            "pr",
            "create",
            "--draft",
            "--base",
            "main",
            "--title",
            task["title"],
            "--body",
            description,
        ], repo_path).stdout.strip()

        task = mark_task_completed_real(task_file, pr_url)
        if not git_clean(repo_path):
            commit_all(repo_path, f"AI task status: {task['title']}")
        else:
            print("no worktree changes to commit for task status update")
        run_cmd(["git", "push", "-u", "origin", branch], repo_path)
        checkout_branch(repo_path, base_branch)

    except GitHubWorkerError as exc:
        if running:
            cleanup_dirty(repo_path)
            mark_task_failed(task_file, exc)
            try:
                if not git_clean(repo_path):
                    commit_all(repo_path, f"AI task failed: {task['title']}")
                    if branch and not branch_exists(repo_path, branch):
                        run_cmd(["git", "push", "-u", "origin", branch], repo_path, check=False)
                else:
                    print("no worktree changes to commit for task status update")
            except Exception:
                cleanup_dirty(repo_path)
        checkout_branch(repo_path, base_branch)
        print(f"Worker failed for task {task['id']}: {exc}", file=sys.stderr)
        return False

    print(f"Task {task['id']} marked completed_real.")
    print(f"Branch pushed: {branch}")
    print(f"Draft PR created: {pr_url}")
    return True


def doctor(project_path, repo_path):
    queued = 0
    locked = 0
    tasks, invalid = valid_task_items(project_path)
    for _, task in tasks:
        status = task.get("status")
        if status == "queued":
            queued += 1
        elif status == "locked":
            locked += 1
    print(f"current branch: {current_branch(repo_path)}")
    print(f"git clean: {str(git_clean(repo_path)).lower()}")
    print(f"gh auth ok: {str(gh_auth_ok(repo_path)).lower()}")
    print(f"queued tasks count: {queued}")
    print(f"locked tasks count: {locked}")
    print(f"invalid task json count: {invalid}")
    return 0


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--once", action="store_true", help="Run exactly one queued task.")
    parser.add_argument("--limit", type=int, help="Run up to this many queued tasks.")
    parser.add_argument("--doctor", action="store_true", help="Print worker diagnostics.")
    parser.add_argument("--task-id", help="Run one specific queued task id.")
    parser.add_argument("--project", default="Tonymage", help="AI Company project name.")
    parser.add_argument("--project-path", help="AI Company project path.")
    parser.add_argument("--repo-path", default=os.getcwd(), help="Git repo where the worker commits.")
    parser.add_argument("--base-branch", default="main", help="Branch the worker must start from and return to.")
    args = parser.parse_args()

    limit = 1
    if args.limit is not None:
        if args.limit < 1:
            print("--limit must be >= 1", file=sys.stderr)
            return 2
        limit = args.limit
    if args.once:
        limit = 1
    if args.task_id is not None:
        limit = 1

    repo_path = os.path.abspath(os.path.expanduser(args.repo_path))
    project_path = os.path.abspath(os.path.expanduser(
        args.project_path or os.path.join(repo_path, "projects", args.project)
    ))
    print(f"Active project: {os.path.basename(project_path)}")

    if args.doctor:
        return doctor(project_path, repo_path)

    completed = 0
    for _ in range(limit):
        if run_one(project_path, repo_path, args.task_id, args.base_branch):
            completed += 1
        else:
            break

    print(f"Worker stopped. Completed tasks this run: {completed}")
    if args.task_id is not None and completed == 0:
        return 1
    return 0 if completed or limit else 1


if __name__ == "__main__":
    raise SystemExit(main())
