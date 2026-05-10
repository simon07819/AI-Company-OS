#!/usr/bin/env python3
"""Generate a local self-improvement report for AI Company OS."""

from __future__ import annotations

import argparse
import json
import subprocess
from collections import Counter, defaultdict
from datetime import datetime
from pathlib import Path
from typing import Any


PROJECT_NAME = "Tonymage"


def load_json_file(path: Path) -> dict[str, Any] | None:
    try:
        with path.open("r", encoding="utf-8") as handle:
            data = json.load(handle)
    except (OSError, json.JSONDecodeError):
        return None
    return data if isinstance(data, dict) else None


def load_completed_tasks(tasks_dir: Path) -> list[dict[str, Any]]:
    tasks: list[dict[str, Any]] = []
    if not tasks_dir.exists():
        return tasks

    for path in sorted(tasks_dir.glob("*.json")):
        task = load_json_file(path)
        if not task or task.get("status") != "completed_real":
            continue
        task["_source_file"] = path.name
        tasks.append(task)

    return sorted(tasks, key=lambda item: str(item.get("completed_at") or item.get("id") or ""))


def load_events(events_path: Path) -> tuple[list[dict[str, Any]], int]:
    events: list[dict[str, Any]] = []
    invalid_lines = 0
    if not events_path.exists():
        return events, invalid_lines

    with events_path.open("r", encoding="utf-8") as handle:
        for line in handle:
            line = line.strip()
            if not line:
                continue
            try:
                event = json.loads(line)
            except json.JSONDecodeError:
                invalid_lines += 1
                continue
            if isinstance(event, dict):
                events.append(event)

    return events, invalid_lines


def run_git_log(repo_path: Path) -> list[str]:
    try:
        result = subprocess.run(
            ["git", "log", "--oneline", "-n", "20"],
            cwd=repo_path,
            check=False,
            capture_output=True,
            text=True,
        )
    except OSError as exc:
        return [f"git log unavailable: {exc}"]

    if result.returncode != 0:
        message = result.stderr.strip() or "git log failed"
        return [f"git log unavailable: {message}"]

    return [line.strip() for line in result.stdout.splitlines() if line.strip()]


def event_time(event: dict[str, Any]) -> str:
    return str(event.get("timestamp") or event.get("time") or "")


def event_data(event: dict[str, Any]) -> dict[str, Any]:
    data = event.get("data")
    return data if isinstance(data, dict) else {}


def collect_detected_refs(
    completed_tasks: list[dict[str, Any]], events: list[dict[str, Any]]
) -> list[dict[str, str]]:
    detected: dict[tuple[str, str], dict[str, str]] = {}

    def add(source: str, task_id: Any, title: Any, branch: Any, pr_url: Any) -> None:
        if not branch and not pr_url:
            return
        key = (str(task_id or title or "unknown"), str(branch or pr_url))
        detected[key] = {
            "source": source,
            "task_id": str(task_id or "-"),
            "title": str(title or "-"),
            "branch": str(branch or "-"),
            "pr_url": str(pr_url or "-"),
        }

    for task in completed_tasks:
        add(
            "task",
            task.get("id"),
            task.get("title"),
            task.get("branch") or task.get("branch_name"),
            task.get("pr_url") or task.get("pull_request_url"),
        )

    for event in events:
        data = event_data(event)
        add(
            str(event.get("event") or "event"),
            data.get("id") or data.get("task_id"),
            data.get("title"),
            data.get("branch") or data.get("branch_name") or data.get("head_ref"),
            data.get("pr_url") or data.get("pull_request_url") or data.get("url"),
        )

    return sorted(detected.values(), key=lambda item: (item["task_id"], item["branch"], item["pr_url"]))


def repeated_values(events: list[dict[str, Any]], field: str) -> list[tuple[str, int]]:
    counter: Counter[str] = Counter()
    for event in events:
        data = event_data(event)
        value = data.get(field)
        if value:
            counter[str(value)] += 1
    return [(value, count) for value, count in counter.most_common() if count > 1]


def analyze_recurring_problems(
    completed_tasks: list[dict[str, Any]], events: list[dict[str, Any]], invalid_event_lines: int, git_log: list[str]
) -> list[str]:
    problems: list[str] = []

    if invalid_event_lines:
        problems.append(f"{invalid_event_lines} ligne(s) JSONL invalide(s) dans les logs.")

    event_counts = Counter(str(event.get("event") or "unknown") for event in events)
    generated_specs = event_counts.get("ai_specs_generated", 0)
    generated_architecture = event_counts.get("ai_architecture_generated", 0)
    generated_tasks = event_counts.get("ai_task_created", 0)
    if generated_specs > 1 or generated_architecture > 1:
        problems.append(
            f"Generation repetee des specs/architecture ({generated_specs} specs, {generated_architecture} architectures)."
        )
    if generated_tasks > 20:
        problems.append(f"Volume eleve de tasks generees ({generated_tasks}), signe possible de regeneration non controlee.")

    duplicate_titles = repeated_values(events, "title")[:5]
    if duplicate_titles:
        sample = ", ".join(f"{title} x{count}" for title, count in duplicate_titles)
        problems.append(f"Titres de tasks recurrents detectes: {sample}.")

    duplicate_branches = repeated_values(events, "branch_name")[:5]
    if duplicate_branches:
        sample = ", ".join(f"{branch} x{count}" for branch, count in duplicate_branches)
        problems.append(f"Noms de branches recurrents detectes: {sample}.")

    completed_without_pr = [
        task
        for task in completed_tasks
        if not (task.get("pr_url") or task.get("pull_request_url"))
    ]
    if completed_without_pr:
        ids = ", ".join(str(task.get("id") or task.get("_source_file")) for task in completed_without_pr[:8])
        problems.append(f"Tasks completed_real sans URL de PR detectee: {ids}.")

    relevant_commits = [
        line for line in git_log if any(token in line.lower() for token in ("fix", "conflict", "rebase", "invalid", "robust"))
    ]
    if relevant_commits:
        problems.append("Historique git recent signale des corrections autour de robustesse/rebase/conflits.")

    return problems or ["Aucun probleme recurrent net detecte avec les donnees locales disponibles."]


def recommendations(problems: list[str], completed_tasks: list[dict[str, Any]]) -> list[str]:
    result = [
        "Conserver une etape reset/sync origin/main avant chaque run reel.",
        "Persister systematiquement branch, PR URL, statut final et raison d'echec dans events.jsonl.",
        "Garder cette boucle en lecture seule jusqu'a stabilisation du rapport sur plusieurs runs.",
    ]

    if any("Generation repetee" in problem or "Volume eleve" in problem for problem in problems):
        result.append("Ajouter un garde-fou de generation pour eviter de regenerer specs/tasks sans confirmation explicite.")
    if any("branches recurrent" in problem for problem in problems):
        result.append("Normaliser les noms de branches avec un prefixe task id unique.")
    if any("sans URL de PR" in problem for problem in problems):
        result.append("Faire remonter la PR URL depuis run_manager vers la task au moment du merge ou de la creation draft.")
    if completed_tasks:
        result.append("Calculer un score simple par run: tasks completees, PR mergees, echecs, conflits resolus.")

    return result


def task_ideas(problems: list[str]) -> list[str]:
    ideas = [
        "TASK-IDEA: Ajouter un ledger local des runs avec start/end/status et resume par worker.",
        "TASK-IDEA: Ajouter un validateur read-only des tasks avant execution.",
        "TASK-IDEA: Ajouter un rapport de readiness avant run reel (git clean, origin/main sync, worktrees OK).",
    ]

    if any("Generation repetee" in problem or "Volume eleve" in problem for problem in problems):
        ideas.append("TASK-IDEA: Ajouter un mode dedupe pour specs/tasks generees avant ecriture.")
    if any("sans URL de PR" in problem for problem in problems):
        ideas.append("TASK-IDEA: Standardiser les champs PR/branch dans tasks et logs.")
    if any("robustesse/rebase/conflits" in problem for problem in problems):
        ideas.append("TASK-IDEA: Ajouter un diagnostic post-merge qui classe conflits, auto-resolutions et commits produits.")

    return ideas


def markdown_list(items: list[str]) -> list[str]:
    return [f"- {item}" for item in items] if items else ["- Aucun."]


def render_report(
    repo_path: Path,
    completed_tasks: list[dict[str, Any]],
    events: list[dict[str, Any]],
    invalid_event_lines: int,
    git_log: list[str],
) -> str:
    detected_refs = collect_detected_refs(completed_tasks, events)
    problems = analyze_recurring_problems(completed_tasks, events, invalid_event_lines, git_log)
    recs = recommendations(problems, completed_tasks)
    ideas = task_ideas(problems)

    event_counts = Counter(str(event.get("event") or "unknown") for event in events)
    latest_event = max((event_time(event) for event in events if event_time(event)), default="-")

    lines: list[str] = [
        "# Improvement Report",
        "",
        f"- Project: {PROJECT_NAME}",
        f"- Repo: `{repo_path}`",
        f"- Generated at: {datetime.now().isoformat(timespec='seconds')}",
        f"- Events read: {len(events)}",
        f"- Latest event: {latest_event}",
        "",
        "## Taches completees",
    ]

    if completed_tasks:
        for task in completed_tasks:
            task_id = task.get("id") or task.get("_source_file") or "-"
            title = task.get("title") or "-"
            branch = task.get("branch") or task.get("branch_name") or "-"
            pr_url = task.get("pr_url") or task.get("pull_request_url") or "-"
            completed_at = task.get("completed_at") or "-"
            lines.append(f"- {task_id}: {title} | branch: `{branch}` | PR: {pr_url} | completed_at: {completed_at}")
    else:
        lines.append("- Aucune task avec status `completed_real` trouvee.")

    lines.extend(["", "## PR et branches detectees"])
    if detected_refs:
        for ref in detected_refs:
            lines.append(
                f"- {ref['task_id']}: {ref['title']} | branch: `{ref['branch']}` | PR: {ref['pr_url']} | source: {ref['source']}"
            )
    else:
        lines.append("- Aucune PR ou branche detectee dans les tasks/logs.")

    lines.extend(["", "## Problemes recurrents"])
    lines.extend(markdown_list(problems))

    lines.extend(["", "## Recommandations"])
    lines.extend(markdown_list(recs))

    lines.extend(["", "## Nouvelles idees de tasks"])
    lines.append("_Idees seulement: aucune task n'a ete creee automatiquement._")
    lines.extend(markdown_list(ideas))

    lines.extend(["", "## Derniers commits git"])
    lines.extend(markdown_list([f"`{line}`" for line in git_log]))

    lines.extend(["", "## Resume logs"])
    if event_counts:
        for name, count in event_counts.most_common():
            lines.append(f"- {name}: {count}")
    else:
        lines.append("- Aucun log events.jsonl lu.")

    return "\n".join(lines) + "\n"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate a local AI Company OS improvement report.")
    parser.add_argument(
        "--repo-path",
        default=".",
        help="Path to the AI-Company repository. Example: ~/AI-Company",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    repo_path = Path(args.repo_path).expanduser().resolve()
    project_path = repo_path / "projects" / PROJECT_NAME
    tasks_dir = project_path / "tasks"
    events_path = project_path / "logs" / "events.jsonl"
    report_path = project_path / "docs" / "improvement_report.md"

    completed_tasks = load_completed_tasks(tasks_dir)
    events, invalid_event_lines = load_events(events_path)
    git_log = run_git_log(repo_path)

    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(
        render_report(repo_path, completed_tasks, events, invalid_event_lines, git_log),
        encoding="utf-8",
    )

    print(f"Wrote {report_path}")
    print(f"Completed real tasks: {len(completed_tasks)}")
    print(f"Events read: {len(events)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
