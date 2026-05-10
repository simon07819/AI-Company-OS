#!/usr/bin/env python3
"""
AI Agency OS — demo script
Prints an overview of the system state: projects, agents, recent activity, and usage examples.
"""

import json
import os
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).parent.resolve()
PROJECTS_DIR = REPO_ROOT / "projects"
LOGS_DIR = REPO_ROOT / "logs"


def header(text):
    width = 60
    print()
    print("=" * width)
    print(f"  {text}")
    print("=" * width)


def section(text):
    print()
    print(f"  {text}")
    print("  " + "-" * (len(text)))


def load_project_meta(project_dir):
    meta_path = project_dir / "project.json"
    if not meta_path.exists():
        return {}
    try:
        with open(meta_path) as f:
            return json.load(f)
    except Exception:
        return {}


def count_tasks_by_status(project_dir):
    tasks_dir = project_dir / "tasks"
    counts = {}
    if not tasks_dir.exists():
        return counts
    for fp in tasks_dir.glob("*.json"):
        try:
            with open(fp) as f:
                task = json.load(f)
            status = task.get("status", "unknown")
            counts[status] = counts.get(status, 0) + 1
        except Exception:
            pass
    return counts


def load_recent_activity(n=10):
    log_path = LOGS_DIR / "agent_activity.jsonl"
    if not log_path.exists():
        return []
    try:
        lines = log_path.read_text().strip().split("\n")
        entries = []
        for line in lines:
            if line.strip():
                try:
                    entries.append(json.loads(line))
                except Exception:
                    pass
        return list(reversed(entries))[:n]
    except Exception:
        return []


def main():
    print()
    print("╔══════════════════════════════════════════════════════════╗")
    print("║          AI AGENCY OPERATING SYSTEM — DEMO              ║")
    print("╚══════════════════════════════════════════════════════════╝")

    # ── Control Center ────────────────────────────────────────────
    header("Control Center (Next.js UI)")
    print()
    print("  Start the web dashboard:")
    print("    cd control-center && npm run dev")
    print()
    print("  Then open:  http://localhost:3000")
    print()
    print("  Pages:")
    print("    /           — Factory dashboard (stats, agents, activity)")
    print("    /projects   — All projects list")
    print("    /agents     — Agent registry (6 specialized agents)")
    print("    /agents/activity — Live agent activity feed (5s polling)")
    print("    /actions    — Run factory scripts from the browser")
    print("    /logs       — Full log viewer")

    # ── Projects ──────────────────────────────────────────────────
    header("Projects")

    project_dirs = sorted(
        [d for d in PROJECTS_DIR.iterdir() if d.is_dir()],
        key=lambda d: d.name,
    ) if PROJECTS_DIR.exists() else []

    if not project_dirs:
        print("  No projects found. Create one:")
        print("    python3 create_product.py --project MyApp --idea 'SaaS for X'")
    else:
        for project_dir in project_dirs:
            meta = load_project_meta(project_dir)
            task_counts = count_tasks_by_status(project_dir)
            total = sum(task_counts.values())
            done = task_counts.get("completed_real", 0) + task_counts.get("completed", 0)
            failed = task_counts.get("failed", 0)
            status = meta.get("status", "unknown")
            priority = meta.get("project_priority", "")

            print()
            print(f"  [{project_dir.name}]")
            print(f"    Status:   {status}" + (f"  ({priority} priority)" if priority else ""))
            print(f"    Tasks:    {total} total  /  {done} done  /  {failed} failed")

            has_app = (project_dir / "app" / "package.json").exists()
            if has_app:
                print(f"    App:      cd projects/{project_dir.name}/app && npm run dev")

    # ── Agents ────────────────────────────────────────────────────
    header("Specialized Agents")
    print()
    agents = [
        ("frontend_agent",  "#3b82f6", "UI, pages, Tailwind, React components"),
        ("backend_agent",   "#22c55e", "API routes, Prisma, auth, billing"),
        ("qa_agent",        "#ef4444", "E2E tests, unit tests, Playwright"),
        ("devops_agent",    "#6c63ff", "CI/CD, Docker, GitHub Actions"),
        ("architect_agent", "#f59e0b", "System design, ADRs, tech decisions"),
        ("product_agent",   "#a78bfa", "PRD, roadmap, product strategy"),
    ]
    for name, _, role in agents:
        print(f"  {name:<22} {role}")

    # ── Recent Activity ────────────────────────────────────────────
    header("Recent Agent Activity")
    activity = load_recent_activity(10)
    if not activity:
        print()
        print("  No activity yet. Run a factory cycle to generate logs:")
        print("    python3 factory_cycle.py --project <ProjectName>")
    else:
        print()
        for entry in activity:
            ts = entry.get("timestamp", "")[:19].replace("T", " ")
            agent = entry.get("agent", "?")
            status = entry.get("status", "?")
            title = entry.get("task_title", "")
            print(f"  {ts}  [{agent}]  {status}  —  {title}")

    # ── Commands ──────────────────────────────────────────────────
    header("Common Commands")
    print()
    print("  Create a new product:")
    print("    python3 create_product.py --project MyApp --idea 'SaaS for X'")
    print()
    print("  Run one factory cycle (pick & execute next task):")
    print("    python3 factory_cycle.py --project MyApp")
    print()
    print("  Run full autonomous build:")
    print("    python3 auto_build.py --project MyApp")
    print()
    print("  Add Stripe billing stubs:")
    print("    python3 init_monetization.py --project MyApp")
    print()
    print("  Change project status:")
    print("    python3 set_project_status.py --project MyApp --status paused")
    print()
    print("  View agent activity log:")
    print("    tail -f logs/agent_activity.jsonl | python3 -m json.tool")
    print()


if __name__ == "__main__":
    main()
