import os, json, queue, threading, time
from datetime import datetime

BASE = os.path.expanduser("~/AI-Company")
PROJECT = os.path.join(BASE, "projects", "Tonymage")
TASKS_DIR = os.path.join(PROJECT, "tasks")
LOGS = os.path.join(PROJECT, "logs", "events.jsonl")
PRS_DIR = os.path.join(PROJECT, "prs")
BRANCHES_DIR = os.path.join(PROJECT, "branches")

DRY_RUN = True
MAX_BUDGET = 50
COST_PER_TASK = 1.5
WORKERS = 6

os.makedirs(TASKS_DIR, exist_ok=True)
os.makedirs(PRS_DIR, exist_ok=True)
os.makedirs(BRANCHES_DIR, exist_ok=True)
os.makedirs(os.path.dirname(LOGS), exist_ok=True)

def log(event, data=None):
    with open(LOGS, "a") as f:
        f.write(json.dumps({
            "time": datetime.utcnow().isoformat(),
            "event": event,
            "data": data or {}
        }) + "\n")

def load_tasks():
    tasks = []
    for file in sorted(os.listdir(TASKS_DIR)):
        if file.endswith(".json"):
            path = os.path.join(TASKS_DIR, file)
            with open(path) as f:
                task = json.load(f)
            task["_path"] = path
            tasks.append(task)
    return tasks

def save_task(task):
    path = task.pop("_path")
    with open(path, "w") as f:
        json.dump(task, f, indent=2)
    task["_path"] = path

def create_branch_and_pr(task):
    branch_name = f"dry-run/{task['id'].lower()}"

    with open(os.path.join(BRANCHES_DIR, f"{task['id']}.txt"), "w") as f:
        f.write(f"DRY_RUN branch planned: {branch_name}\n")

    with open(os.path.join(PRS_DIR, f"{task['id']}.md"), "w") as f:
        f.write(f"""# Draft PR — {task['id']}

## Titre
{task['title']}

## Département
{task['department']}

## Mode
DRY_RUN

## Tests
À exécuter avant vraie PR:
- lint
- tests unitaires
- build

## GitHub
Aucune vraie branche créée.
Aucune vraie PR créée.
""")

def worker(worker_id, q, budget):
    while True:
        try:
            task = q.get_nowait()
        except queue.Empty:
            return

        if budget["spent"] + COST_PER_TASK > MAX_BUDGET:
            task["status"] = "blocked_budget"
            save_task(task)
            log("task_blocked_budget", {"task": task["id"], "worker": worker_id})
            q.task_done()
            continue

        log("task_started", {"task": task["id"], "worker": worker_id})

        task["status"] = "in_progress"
        task["worker"] = worker_id
        save_task(task)

        time.sleep(1)

        budget["spent"] += COST_PER_TASK

        create_branch_and_pr(task)

        task["status"] = "completed_dry_run"
        task["cost_usd"] = COST_PER_TASK
        task["completed_at"] = datetime.utcnow().isoformat()
        save_task(task)

        log("task_completed", {
            "task": task["id"],
            "worker": worker_id,
            "cost_usd": COST_PER_TASK,
            "total_spent": budget["spent"]
        })

        q.task_done()

def run():
    tasks = load_tasks()
    q = queue.Queue()

    for task in tasks:
        if task.get("status") in ["queued", "completed_dry_run"]:
            q.put(task)

    budget = {"spent": 0}

    threads = []
    for i in range(WORKERS):
        t = threading.Thread(target=worker, args=(i + 1, q, budget))
        t.start()
        threads.append(t)

    for t in threads:
        t.join()

    log("run_finished", {
        "project": "Tonymage",
        "workers": WORKERS,
        "spent_usd": budget["spent"],
        "dry_run": DRY_RUN
    })

    print("✅ Niveau 2 terminé")
    print(f"Workers: {WORKERS}")
    print(f"Budget utilisé: ${budget['spent']}")
    print("Mode: DRY_RUN")

if __name__ == "__main__":
    run()
