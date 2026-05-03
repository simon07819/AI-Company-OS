import os
import json
from datetime import datetime
from brain import generate_specs, generate_architecture, generate_tasks

BASE = os.path.expanduser("~/AI-Company")
PROJECT_NAME = "Tonymage"
PROJECT = os.path.join(BASE, "projects", PROJECT_NAME)

IDEA = "Créer une plateforme IA multi-agents pour gérer des projets logiciels automatiquement du début à la fin."

def log(event, data=None):
    path = os.path.join(PROJECT, "logs", "events.jsonl")
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "a") as f:
        f.write(json.dumps({
            "time": datetime.utcnow().isoformat(),
            "event": event,
            "data": data or {}
        }) + "\n")

def write(path, content):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w") as f:
        f.write(content)

def main():
    print("🧠 Génération du cahier des charges...")
    specs = generate_specs(PROJECT_NAME, IDEA)
    write(os.path.join(PROJECT, "docs", "specs_ai.md"), specs)
    log("ai_specs_generated", {"file": "docs/specs_ai.md"})

    print("🏗️ Génération architecture...")
    architecture = generate_architecture(PROJECT_NAME, specs)
    write(os.path.join(PROJECT, "docs", "architecture_ai.md"), architecture)
    log("ai_architecture_generated", {"file": "docs/architecture_ai.md"})

    print("📋 Génération tâches...")
    tasks_raw = generate_tasks(PROJECT_NAME, specs, architecture)
    write(os.path.join(PROJECT, "docs", "tasks_raw_ai.json"), tasks_raw)

    try:
        tasks = json.loads(tasks_raw)
    except Exception:
        print("❌ L’IA n’a pas retourné du JSON parfait.")
        print("Regarde: ~/AI-Company/projects/Tonymage/docs/tasks_raw_ai.json")
        return

    tasks_dir = os.path.join(PROJECT, "tasks")
    os.makedirs(tasks_dir, exist_ok=True)

    for i, task in enumerate(tasks, start=1):
        task_id = task.get("id") or f"AI-TASK-{i:03d}"
        task["id"] = task_id
        task["status"] = "queued"
        task["mode"] = "DRY_RUN"

        with open(os.path.join(tasks_dir, f"{task_id}.json"), "w") as f:
            json.dump(task, f, indent=2)

        log("ai_task_created", task)

    print(f"✅ Brain connecté. {len(tasks)} tâches IA créées.")
    print("📄 Specs: projects/Tonymage/docs/specs_ai.md")
    print("🏗️ Architecture: projects/Tonymage/docs/architecture_ai.md")
    print("📋 Tâches: projects/Tonymage/tasks/")

if __name__ == "__main__":
    main()
