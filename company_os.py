import os
import json
from datetime import datetime

BASE = os.path.expanduser("~/AI-Company")
PROJECTS = os.path.join(BASE, "projects")

AGENTS = [
    "CEO Agent",
    "CTO Agent",
    "Product Manager Agent",
    "Architect Agent",
    "UX/UI Designer Agent",
    "Frontend Developer Agent",
    "Backend Developer Agent",
    "QA/Test Agent",
    "DevOps Agent",
    "Security Reviewer Agent",
    "Cost Controller Agent"
]

TASKS = [
    {"title": "Discovery du projet", "department": "CEO Agent"},
    {"title": "Cahier des charges", "department": "Product Manager Agent"},
    {"title": "Architecture technique", "department": "Architect Agent"},
    {"title": "Design UX/UI", "department": "UX/UI Designer Agent"},
    {"title": "Setup frontend", "department": "Frontend Developer Agent"},
    {"title": "Setup backend", "department": "Backend Developer Agent"},
    {"title": "Tests initiaux", "department": "QA/Test Agent"},
    {"title": "Review sécurité", "department": "Security Reviewer Agent"},
    {"title": "Préparation déploiement", "department": "DevOps Agent"},
    {"title": "Validation budget", "department": "Cost Controller Agent"}
]

def log(project_path, event, data=None):
    logs_path = os.path.join(project_path, "logs", "events.jsonl")
    os.makedirs(os.path.dirname(logs_path), exist_ok=True)
    payload = {
        "timestamp": datetime.utcnow().isoformat(),
        "event": event,
        "data": data or {}
    }
    with open(logs_path, "a") as f:
        f.write(json.dumps(payload) + "\n")

def create_project(name):
    project_path = os.path.join(PROJECTS, name)

    folders = [
        "docs",
        "src",
        "tasks",
        "logs",
        "memory",
        "agents",
        "tests",
        "infra",
        "prs",
        "branches"
    ]

    for folder in folders:
        os.makedirs(os.path.join(project_path, folder), exist_ok=True)

    project_json = {
        "name": name,
        "status": "initialized",
        "mode": "DRY_RUN",
        "budget": {
            "max_usd": 50,
            "spent_usd": 0
        },
        "created_at": datetime.utcnow().isoformat(),
        "agents": AGENTS,
        "tasks_count": len(TASKS)
    }

    with open(os.path.join(project_path, "project.json"), "w") as f:
        json.dump(project_json, f, indent=2)

    with open(os.path.join(project_path, "README.md"), "w") as f:
        f.write(f"# {name}\n\nProjet géré par AI Company OS.\n\nMode: DRY_RUN\n")

    log(project_path, "project_created", {"project": name})
    print(f"✅ Projet {name} créé/complété")

def generate_specs(name, idea):
    project_path = os.path.join(PROJECTS, name)
    specs = f"""# Cahier des charges — {name}

## Mandat client
{idea}

## Objectif
Créer un logiciel complet à partir d’un mandat client, avec analyse, architecture, design, développement, tests, review, déploiement et maintenance.

## Contraintes AI Company OS
- Toujours DRY_RUN au début
- Jamais de merge automatique
- Toujours petites PR
- Toujours tests
- Toujours logs JSONL
- Toujours budget par projet
- Chaque agent a un rôle clair
- Les tâches sont assignées par département

## Pipeline
1. Discovery
2. Requirements
3. Architecture
4. Design
5. Task breakdown
6. Development
7. Tests
8. Code review
9. Deployment
10. Maintenance

## Livrables attendus
- Specs
- Architecture
- Design notes
- Tasks
- Branch plan
- Draft PR plan
- Tests plan
- Security review
- Deployment plan
"""

    with open(os.path.join(project_path, "docs", "specs.md"), "w") as f:
        f.write(specs)

    log(project_path, "specs_generated", {"file": "docs/specs.md"})
    print("✅ Cahier des charges généré")

def generate_tasks(name):
    project_path = os.path.join(PROJECTS, name)

    for i, task in enumerate(TASKS, start=1):
        task_id = f"TASK-{i:03d}"
        task_data = {
            "id": task_id,
            "title": task["title"],
            "department": task["department"],
            "status": "queued",
            "mode": "DRY_RUN",
            "branch": f"dry-run/{task_id.lower()}",
            "estimated_cost_usd": 1.50
        }

        with open(os.path.join(project_path, "tasks", f"{task_id}.json"), "w") as f:
            json.dump(task_data, f, indent=2)

        log(project_path, "task_created", task_data)

    print(f"✅ {len(TASKS)} tâches créées")

def run_workers(name):
    project_path = os.path.join(PROJECTS, name)
    tasks_path = os.path.join(project_path, "tasks")

    for filename in sorted(os.listdir(tasks_path)):
        if not filename.endswith(".json"):
            continue

        path = os.path.join(tasks_path, filename)

        with open(path, "r") as f:
            task = json.load(f)

        task["status"] = "completed_dry_run"
        task["completed_at"] = datetime.utcnow().isoformat()

        with open(path, "w") as f:
            json.dump(task, f, indent=2)

        branch_file = os.path.join(project_path, "branches", f"{task['id']}.txt")
        with open(branch_file, "w") as f:
            f.write(f"DRY_RUN branch planned: {task['branch']}\n")

        pr_file = os.path.join(project_path, "prs", f"{task['id']}.md")
        with open(pr_file, "w") as f:
            f.write(f"""# Draft PR — {task['id']}

## Title
{task['title']}

## Assigned to
{task['department']}

## Mode
DRY_RUN

## Notes
Aucune branche Git réelle créée.
Aucune PR GitHub réelle créée.
""")

        log(project_path, "task_completed_dry_run", task)
        print(f"✅ {task['id']} terminé par {task['department']}")

def show_status(name):
    project_path = os.path.join(PROJECTS, name)
    tasks_path = os.path.join(project_path, "tasks")

    print(f"\n📌 Status du projet: {name}\n")

    for filename in sorted(os.listdir(tasks_path)):
        if filename.endswith(".json"):
            with open(os.path.join(tasks_path, filename), "r") as f:
                task = json.load(f)
            print(f"{task['id']} | {task['status']} | {task['department']} | {task['title']}")

if __name__ == "__main__":
    project_name = "Tonymage"
    idea = "Créer le premier projet client géré par AI Company OS."

    create_project(project_name)
    generate_specs(project_name, idea)
    generate_tasks(project_name)
    run_workers(project_name)
    show_status(project_name)
