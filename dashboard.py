import os, json
from flask import Flask, render_template_string

BASE = os.path.expanduser("~/AI-Company")
PROJECT = os.path.join(BASE, "projects", "Tonymage")

app = Flask(__name__)

HTML = """
<!doctype html>
<html>
<head>
  <title>AI Company OS</title>
  <style>
    body { font-family: Arial; background:#0f172a; color:white; padding:30px; }
    .card { background:#1e293b; padding:20px; border-radius:16px; margin-bottom:20px; }
    .ok { color:#22c55e; }
    .warn { color:#facc15; }
    table { width:100%; border-collapse:collapse; }
    td, th { padding:10px; border-bottom:1px solid #334155; }
  </style>
</head>
<body>
  <h1>AI Company OS</h1>

  <div class="card">
    <h2>Projet: {{ project.name }}</h2>
    <p>Status: <span class="ok">{{ project.status }}</span></p>
    <p>Mode: <span class="warn">{{ project.mode }}</span></p>
    <p>Budget: ${{ project.budget.spent_usd }} / ${{ project.budget.max_usd }}</p>
  </div>

  <div class="card">
    <h2>Tâches</h2>
    <table>
      <tr>
        <th>ID</th>
        <th>Titre</th>
        <th>Agent</th>
        <th>Status</th>
      </tr>
      {% for task in tasks %}
      <tr>
        <td>{{ task.id }}</td>
        <td>{{ task.title }}</td>
        <td>{{ task.department }}</td>
        <td>{{ task.status }}</td>
      </tr>
      {% endfor %}
    </table>
  </div>

  <div class="card">
    <h2>Logs récents</h2>
    {% for log in logs %}
      <p>{{ log }}</p>
    {% endfor %}
  </div>
</body>
</html>
"""

def load_json(path, fallback):
    if not os.path.exists(path):
        return fallback
    with open(path) as f:
        return json.load(f)

@app.route("/")
def home():
    project = load_json(os.path.join(PROJECT, "project.json"), {})

    tasks = []
    tasks_dir = os.path.join(PROJECT, "tasks")
    if os.path.exists(tasks_dir):
        for file in sorted(os.listdir(tasks_dir)):
            if file.endswith(".json"):
                tasks.append(load_json(os.path.join(tasks_dir, file), {}))

    logs = []
    logs_path = os.path.join(PROJECT, "logs", "events.jsonl")
    if os.path.exists(logs_path):
        with open(logs_path) as f:
            logs = f.readlines()[-20:]

    return render_template_string(HTML, project=project, tasks=tasks, logs=logs)

if __name__ == "__main__":
    app.run(debug=True, port=5050)
