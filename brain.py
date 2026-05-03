import os
import requests
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv("NVIDIA_API_KEY")
MODEL = os.getenv("NVIDIA_MODEL", "meta/llama-3.1-8b-instruct")
URL = "https://integrate.api.nvidia.com/v1/chat/completions"

def ask_ai(prompt, role="You are a senior software company AI agent."):
    if not API_KEY:
        raise RuntimeError("NVIDIA_API_KEY manquant dans .env")

    payload = {
        "model": MODEL,
        "messages": [
            {"role": "system", "content": role},
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.25,
        "max_tokens": 2500
    }

    print(f"🔵 NVIDIA: {MODEL}")
    res = requests.post(
        URL,
        headers={
            "Authorization": f"Bearer {API_KEY}",
            "Content-Type": "application/json"
        },
        json=payload,
        timeout=60
    )

    if res.status_code != 200:
        raise RuntimeError(f"NVIDIA error {res.status_code}: {res.text}")

    return res.json()["choices"][0]["message"]["content"]

def generate_specs(project_name, idea):
    return ask_ai(f"""
Project name: {project_name}

Client mandate:
{idea}

Generate a complete software project brief in Markdown with:
1. Discovery
2. Problem
3. Target users
4. Core features
5. MVP scope
6. Out of scope
7. Technical requirements
8. Risks
9. Success criteria
""", "You are a senior Product Manager Agent.")

def generate_architecture(project_name, specs):
    return ask_ai(f"""
Project name: {project_name}

Specs:
{specs}

Generate a technical architecture in Markdown with:
1. Recommended stack
2. App structure
3. Database model
4. API design
5. Auth/security
6. Deployment plan
7. Testing strategy
8. Risks and tradeoffs
""", "You are a senior CTO and Software Architect Agent.")

def generate_tasks(project_name, specs, architecture):
    return ask_ai(f"""
Project name: {project_name}

Specs:
{specs}

Architecture:
{architecture}

Create a JSON array of 12 to 20 small development tasks.
Each task must have:
- id
- title
- department
- description
- acceptance_criteria
- estimated_cost_usd
- branch_name

Return ONLY valid JSON. No markdown.
""", "You are a technical project manager who creates small GitHub-ready tasks.")