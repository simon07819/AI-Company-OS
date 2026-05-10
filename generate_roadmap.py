import argparse
import json
import os
from datetime import date


COMPLETED_STATUSES = {"completed", "completed_real", "completed_dry_run"}

GENERIC_TASKS = [
    "Define product requirements",
    "Validate target customer",
    "Design system architecture",
    "Set up dev environment and CI/CD",
    "Implement authentication",
    "Build core domain model",
    "Scaffold basic UI",
    "Write integration tests",
    "Integrate billing",
    "Deploy to staging",
]

AGENT_TECH_MILESTONES = {
    "Architect Agent": "Architecture design approved",
    "Frontend Developer Agent": "Frontend MVP (UI/UX)",
    "Backend Developer Agent": "Backend API and data layer",
    "DevOps Agent": "CI/CD pipeline and deployment",
    "QA/Test Agent": "Test coverage and QA baseline",
    "Security Reviewer Agent": "Security audit passed",
}


def read_text(path):
    try:
        with open(path, "r", encoding="utf-8") as f:
            return f.read().strip()
    except OSError:
        return None


def read_json(path):
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except (json.JSONDecodeError, OSError):
        return None


def first_content_line(text):
    for line in (text or "").splitlines():
        s = line.strip()
        if s and not s.startswith("#"):
            return s
    return None


def extract_section(report_text, heading):
    lines, inside = [], False
    for line in (report_text or "").splitlines():
        if line.startswith(f"## {heading}"):
            inside = True
            continue
        if inside:
            if line.startswith("## "):
                break
            stripped = line.strip()
            if stripped:
                lines.append(stripped)
    return lines


def extract_recommendation(report_text):
    for line in (report_text or "").splitlines():
        if line.startswith("## Recommendation:"):
            return line.split(":", 1)[1].strip().lower()
    return None


def load_tasks(project_path):
    tasks_dir = os.path.join(project_path, "tasks")
    if not os.path.isdir(tasks_dir):
        return []
    tasks = []
    for fname in sorted(os.listdir(tasks_dir)):
        if not fname.endswith(".json"):
            continue
        task = read_json(os.path.join(tasks_dir, fname))
        if isinstance(task, dict) and "title" in task:
            tasks.append(task)
    return tasks


def pricing_lines(pricing):
    if not pricing:
        return ["- No pricing plans defined."]
    currency = pricing.get("currency", "USD")
    result = []
    for plan in pricing.get("plans") or []:
        name = plan.get("name", "Plan")
        price = plan.get("monthly_price", "?")
        discount = plan.get("annual_discount_percent", 0)
        result.append(f"- **{name}**: {currency} {price}/month (annual -{discount}%)")
    return result or ["- No pricing plans defined."]


def tech_milestone_lines(agents):
    seen = []
    for agent in (agents or []):
        if agent in AGENT_TECH_MILESTONES:
            seen.append(f"- [ ] {AGENT_TECH_MILESTONES[agent]}")
    return seen or [
        "- [ ] Architecture design",
        "- [ ] Backend core",
        "- [ ] Frontend MVP",
        "- [ ] CI/CD setup",
    ]


def priority_lines(recommendation):
    if recommendation == "pause":
        return [
            "1. Define and document product vision",
            "2. Identify and validate target customer segment",
            "3. Map the core problem with specificity",
            "4. Run at least 3 customer discovery interviews",
        ]
    if recommendation == "revise":
        return [
            "1. Complete missing documentation",
            "2. Define monetization strategy",
            "3. Validate willingness to pay",
            "4. Reassess MVP scope",
        ]
    return [
        "1. Build MVP feature set",
        "2. Set up CI/CD and deploy to staging",
        "3. Activate billing",
        "4. Acquire first 10 users",
    ]


def suggested_task_lines(tasks):
    pending = [t for t in tasks if t.get("status") not in COMPLETED_STATUSES]
    source = pending[:10] if pending else tasks[:10]
    if not source:
        return [f"{i}. {t}" for i, t in enumerate(GENERIC_TASKS, 1)]
    lines = []
    for i, t in enumerate(source[:10], 1):
        title = t.get("title", "Untitled")
        dept = t.get("department", "")
        suffix = f" _{dept}_" if dept else ""
        lines.append(f"{i}. {title}{suffix}")
    return lines


def build_report(project_name, project, vision, report, pricing, tasks, missing):
    today = date.today().isoformat()
    rec = extract_recommendation(report)
    status = (project or {}).get("status", "unknown")
    agents = (project or {}).get("agents", [])
    vision_line = first_content_line(vision) or "Product vision not yet defined."
    risks = extract_section(report, "Risk Checklist")

    sections = []

    # Header
    sections.append(
        f"# Roadmap: {project_name}\n"
        f"\n"
        f"_Generated: {today} | Status: {status} | Recommendation: {rec or 'n/a'}_\n"
    )

    if missing:
        notes = " | ".join(f"`{m}` missing" for m in missing)
        sections.append(f"> Fallback mode — {notes}\n")

    # Vision
    sections.append(f"## Vision\n\n{vision_line}\n")

    # MVP Milestones
    sections.append(
        "## MVP Milestones\n\n"
        "- [ ] Product vision defined and validated\n"
        "- [ ] Core feature set scoped\n"
        "- [ ] Technical architecture approved\n"
        "- [ ] MVP built and internally tested\n"
        "- [ ] First user feedback collected\n"
    )

    # Phase 1
    sections.append(
        "## Phase 1 — Foundation\n\n"
        "- [ ] Project initialized and structured\n"
        "- [ ] Auth and user management\n"
        "- [ ] Core domain model implemented\n"
        "- [ ] Basic UI scaffolded\n"
        "- [ ] CI/CD pipeline live\n"
    )

    # Phase 2
    sections.append(
        "## Phase 2 — Growth\n\n"
        "- [ ] Billing and subscription flow\n"
        "- [ ] Analytics and usage tracking\n"
        "- [ ] Performance optimization\n"
        "- [ ] User onboarding flow\n"
        "- [ ] Public launch\n"
    )

    # Monetization milestones
    plines = pricing_lines(pricing)
    mon = "\n".join(plines) + "\n- [ ] Billing system integrated\n- [ ] First paid customer\n- [ ] MRR > 0"
    sections.append(f"## Monetization Milestones\n\n{mon}\n")

    # Technical milestones
    tlines = "\n".join(tech_milestone_lines(agents))
    sections.append(f"## Technical Milestones\n\n{tlines}\n")

    # Recommended priorities
    prio = "\n".join(priority_lines(rec))
    sections.append(f"## Recommended Priorities\n\n{prio}\n")

    # Risks
    if risks:
        risk_text = "\n".join(f"- {r.lstrip('- ')}" for r in risks)
    else:
        risk_text = (
            "- Market fit not validated\n"
            "- Acquisition channel unclear\n"
            "- Technical complexity underestimated"
        )
    sections.append(f"## Risks\n\n{risk_text}\n")

    # Suggested first 10 tasks
    task_lines = "\n".join(suggested_task_lines(tasks))
    sections.append(f"## Suggested First 10 Tasks\n\n{task_lines}\n")

    return "\n".join(sections)


def generate_roadmap(repo_path, project_name):
    project_path = os.path.join(repo_path, "projects", project_name)

    project = read_json(os.path.join(project_path, "project.json"))
    vision = read_text(os.path.join(project_path, "docs", "product_vision.md"))
    report = read_text(os.path.join(project_path, "validation_report.md"))
    pricing = read_json(os.path.join(project_path, "monetization", "pricing.json"))
    tasks = load_tasks(project_path)

    missing = []
    if project is None:
        missing.append("project.json")
    if vision is None:
        missing.append("docs/product_vision.md")
    if report is None:
        missing.append("validation_report.md")

    content = build_report(
        project_name, project, vision, report, pricing, tasks, missing
    )

    docs_path = os.path.join(project_path, "docs")
    os.makedirs(docs_path, exist_ok=True)
    roadmap_path = os.path.join(docs_path, "roadmap.md")
    with open(roadmap_path, "w", encoding="utf-8") as f:
        f.write(content)

    if missing:
        print(f"Roadmap generated with fallbacks for: {', '.join(missing)}")
    else:
        print("Roadmap generated.")
    print(roadmap_path)
    return 0


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--project", required=True)
    parser.add_argument("--repo-path", default=os.getcwd())
    args = parser.parse_args()
    repo_path = os.path.abspath(os.path.expanduser(args.repo_path))
    return generate_roadmap(repo_path, args.project)


if __name__ == "__main__":
    raise SystemExit(main())
