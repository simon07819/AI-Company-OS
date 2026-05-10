import os
import json
import re
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

def normalize_title(title):
    return "".join(str(title).lower().split())

def titles_are_similar(left, right):
    normalized_left = normalize_title(left)
    normalized_right = normalize_title(right)
    if not normalized_left or not normalized_right:
        return False

    return (
        normalized_left == normalized_right
        or normalized_left.startswith(normalized_right)
        or normalized_right.startswith(normalized_left)
    )

def load_memory():
    path = os.path.join(PROJECT, "memory.json")
    default_memory = {
        "created_task_titles": [],
        "last_run_timestamp": "",
        "runs_count": 0,
    }

    if not os.path.exists(path):
        return default_memory

    try:
        with open(path) as f:
            loaded = json.load(f)
    except (json.JSONDecodeError, OSError):
        return default_memory

    memory = default_memory.copy()
    if isinstance(loaded, dict):
        if isinstance(loaded.get("created_task_titles"), list):
            memory["created_task_titles"] = loaded["created_task_titles"]
        if isinstance(loaded.get("last_run_timestamp"), str):
            memory["last_run_timestamp"] = loaded["last_run_timestamp"]
        if isinstance(loaded.get("runs_count"), int):
            memory["runs_count"] = loaded["runs_count"]

    return memory

def save_memory(memory):
    path = os.path.join(PROJECT, "memory.json")
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w") as f:
        json.dump(memory, f, indent=2)
        f.write("\n")

def read_existing_tasks(tasks_dir):
    task_files = []
    titles = []
    ids = set()

    if not os.path.isdir(tasks_dir):
        return task_files, titles, ids

    for name in os.listdir(tasks_dir):
        if not name.endswith(".json"):
            continue

        task_files.append(name)
        ids.add(os.path.splitext(name)[0])
        path = os.path.join(tasks_dir, name)

        try:
            with open(path) as f:
                task = json.load(f)
        except (json.JSONDecodeError, OSError):
            continue

        title = task.get("title") if isinstance(task, dict) else None
        if isinstance(title, str) and title.strip():
            titles.append(title)

    return task_files, titles, ids

def clean_trailing_commas(text):
    cleaned = []
    in_string = False
    escaped = False
    i = 0

    while i < len(text):
        char = text[i]

        if in_string:
            cleaned.append(char)
            if escaped:
                escaped = False
            elif char == "\\":
                escaped = True
            elif char == '"':
                in_string = False
            i += 1
            continue

        if char == '"':
            in_string = True
            cleaned.append(char)
            i += 1
            continue

        if char == ",":
            j = i + 1
            while j < len(text) and text[j].isspace():
                j += 1
            if j < len(text) and text[j] in "]}":
                i += 1
                continue

        cleaned.append(char)
        i += 1

    return "".join(cleaned)

def extract_balanced_json(text, start):
    opener = text[start]
    closer = "}" if opener == "{" else "]"
    depth = 0
    in_string = False
    escaped = False

    for i in range(start, len(text)):
        char = text[i]

        if in_string:
            if escaped:
                escaped = False
            elif char == "\\":
                escaped = True
            elif char == '"':
                in_string = False
            continue

        if char == '"':
            in_string = True
        elif char == opener:
            depth += 1
        elif char == closer:
            depth -= 1
            if depth == 0:
                return text[start:i + 1]

    return text[start:]

def parse_tasks_json(tasks_raw):
    decoder = json.JSONDecoder()
    fenced_blocks = re.findall(r"```json\s*(.*?)\s*```", tasks_raw, re.DOTALL | re.IGNORECASE)

    for block in fenced_blocks:
        try:
            return json.loads(clean_trailing_commas(block))
        except json.JSONDecodeError:
            pass

    for i, char in enumerate(tasks_raw):
        if char not in "[{":
            continue
        candidate = clean_trailing_commas(extract_balanced_json(tasks_raw, i))
        try:
            parsed, _ = decoder.raw_decode(candidate)
            return parsed
        except json.JSONDecodeError:
            continue

    raise ValueError("No valid JSON object or array found")

def normalize_tasks(tasks):
    if isinstance(tasks, dict) and isinstance(tasks.get("tasks"), list):
        tasks = tasks["tasks"]
    elif isinstance(tasks, dict):
        tasks = [tasks]

    if not isinstance(tasks, list):
        raise ValueError("Tasks JSON must be an array or task object")

    valid_tasks = []
    for i, task in enumerate(tasks, start=1):
        if not isinstance(task, dict):
            print(f"⚠️ Tâche ignorée: entrée #{i} n’est pas un objet JSON.")
            continue

        raw_task_id = task.get("id") or f"AI-TASK-{i:03d}"
        task_id = str(raw_task_id)
        title = task.get("title")
        status = task.get("status") or "queued"

        if not isinstance(task_id, str) or not task_id.strip():
            print(f"⚠️ Tâche ignorée: entrée #{i} sans id valide.")
            continue
        if os.path.basename(task_id) != task_id:
            print(f"⚠️ Tâche ignorée: id invalide ({task_id}).")
            continue
        if not isinstance(title, str) or not title.strip():
            print(f"⚠️ Tâche ignorée: {task_id} sans title valide.")
            continue
        if not isinstance(status, str) or not status.strip():
            print(f"⚠️ Tâche ignorée: {task_id} sans status valide.")
            continue

        task["id"] = task_id
        task["status"] = status
        task["mode"] = "DRY_RUN"
        valid_tasks.append(task)

    return valid_tasks

def main():
    memory = load_memory()
    memory["runs_count"] += 1
    memory["last_run_timestamp"] = datetime.utcnow().isoformat()
    save_memory(memory)

    tasks_dir = os.path.join(PROJECT, "tasks")
    task_files, existing_titles, existing_ids = read_existing_tasks(tasks_dir)
    if len(task_files) > 50:
        save_memory(memory)
        print("too many tasks, aborting brain generation")
        return

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
        tasks = normalize_tasks(parse_tasks_json(tasks_raw))
    except Exception:
        save_memory(memory)
        print("❌ L’IA n’a pas retourné du JSON parfait.")
        print("Regarde: ~/AI-Company/projects/Tonymage/docs/tasks_raw_ai.json")
        return

    os.makedirs(tasks_dir, exist_ok=True)

    known_titles = existing_titles + [
        title for title in memory["created_task_titles"]
        if isinstance(title, str)
    ]
    created_titles = []

    for task in tasks:
        task_id = task["id"]
        title = task["title"]

        if any(titles_are_similar(title, existing_title) for existing_title in known_titles):
            print(f"⚠️ Tâche ignorée: titre similaire existant ({title}).")
            continue
        if task_id in existing_ids:
            print(f"⚠️ Tâche ignorée: id existant ({task_id}).")
            continue

        with open(os.path.join(tasks_dir, f"{task_id}.json"), "w") as f:
            json.dump(task, f, indent=2)

        existing_ids.add(task_id)
        known_titles.append(title)
        created_titles.append(title)
        log("ai_task_created", task)

    memory["created_task_titles"].extend(created_titles)
    save_memory(memory)

    print(f"✅ Brain connecté. {len(created_titles)} tâches IA créées.")
    print("📄 Specs: projects/Tonymage/docs/specs_ai.md")
    print("🏗️ Architecture: projects/Tonymage/docs/architecture_ai.md")
    print("📋 Tâches: projects/Tonymage/tasks/")

if __name__ == "__main__":
    main()
