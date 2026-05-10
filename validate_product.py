import argparse
import json
import os


def read_text(path):
    try:
        with open(path, "r", encoding="utf-8") as file:
            return file.read().strip()
    except OSError:
        return None


def read_json(path):
    try:
        with open(path, "r", encoding="utf-8") as file:
            return json.load(file)
    except (json.JSONDecodeError, OSError):
        return None


def first_non_empty_line(text):
    for line in (text or "").splitlines():
        stripped = line.strip()
        if stripped and not stripped.startswith("#"):
            return stripped
    return "No product vision found."


def task_counts(project_path):
    tasks_path = os.path.join(project_path, "tasks")
    counts = {"total": 0, "queued": 0, "completed_real": 0}
    if not os.path.isdir(tasks_path):
        return counts

    for filename in os.listdir(tasks_path):
        if not filename.endswith(".json"):
            continue
        task = read_json(os.path.join(tasks_path, filename)) or {}
        counts["total"] += 1
        status = task.get("status")
        if status in counts:
            counts[status] += 1
    return counts


def recommendation(missing, has_pricing, tasks):
    if "project.json" in missing or "docs/product_vision.md" in missing:
        return "pause"
    if not has_pricing or tasks["total"] == 0:
        return "revise"
    return "build"


def validation_report(project_name, project, vision, pricing, tasks, missing):
    has_pricing = pricing is not None
    status = project.get("status", "unknown") if isinstance(project, dict) else "unknown"
    priority = project.get("project_priority", "low") if isinstance(project, dict) else "low"
    rec = recommendation(missing, has_pricing, tasks)

    missing_lines = "\n".join(f"- Missing: {item}" for item in missing) or "- None"
    pricing_status = "Pricing file present." if has_pricing else "Pricing file missing."
    if has_pricing:
        pricing_status += f" {len(pricing.get('plans') or [])} plan(s) configured."

    return "\n".join([
        f"# Validation Report: {project_name}",
        "",
        "## Product Summary",
        first_non_empty_line(vision),
        "",
        "## Target Customer",
        "Target customer is not explicitly validated yet.",
        "",
        "## Problem Clarity",
        "Clear enough to proceed." if vision else "Product vision is missing.",
        "",
        "## Monetization Readiness",
        pricing_status,
        "",
        "## MVP Readiness",
        f"Project status: {status}",
        f"Project priority: {priority}",
        f"Tasks total: {tasks['total']}",
        f"Tasks queued: {tasks['queued']}",
        f"Tasks completed_real: {tasks['completed_real']}",
        "",
        "## Risk Checklist",
        missing_lines,
        "- Validate customer segment",
        "- Validate willingness to pay",
        "- Validate acquisition channel",
        "",
        f"## Recommendation: {rec}",
        "",
    ])


def validate_product(repo_path, project_name):
    project_path = os.path.join(repo_path, "projects", project_name)
    project_file = os.path.join(project_path, "project.json")
    vision_file = os.path.join(project_path, "docs", "product_vision.md")
    pricing_file = os.path.join(project_path, "monetization", "pricing.json")

    project = read_json(project_file)
    vision = read_text(vision_file)
    pricing = read_json(pricing_file)

    missing = []
    if project is None:
        missing.append("project.json")
    if vision is None:
        missing.append("docs/product_vision.md")
    if pricing is None:
        missing.append("monetization/pricing.json")

    report = validation_report(
        project_name,
        project or {},
        vision,
        pricing,
        task_counts(project_path),
        missing,
    )
    report_path = os.path.join(project_path, "validation_report.md")
    os.makedirs(project_path, exist_ok=True)
    with open(report_path, "w", encoding="utf-8") as file:
        file.write(report)

    if missing:
        print(f"Validation report created with missing inputs: {', '.join(missing)}")
    else:
        print("Validation report created.")
    print(report_path)
    return 0


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--project", required=True)
    parser.add_argument("--repo-path", default=os.getcwd())
    args = parser.parse_args()

    repo_path = os.path.abspath(os.path.expanduser(args.repo_path))
    return validate_product(repo_path, args.project)


if __name__ == "__main__":
    raise SystemExit(main())
