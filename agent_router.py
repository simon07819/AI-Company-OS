"""Agent router — maps a task to the most appropriate specialized agent.

Routing priority (first match wins):
  frontend_agent  — UI pages, components, layout
  backend_agent   — API routes, lib utilities, database
  devops_agent    — CI/CD, Docker, deployment
  qa_agent        — testing, specs, coverage
  product_agent   — roadmap, PRDs, feature specs
  architect_agent — system design, infrastructure, API contracts
  backend_agent   — fallback (always handles unknowns safely)
"""

from agents.architect_agent import ArchitectAgent
from agents.backend_agent import BackendAgent
from agents.devops_agent import DevopsAgent
from agents.frontend_agent import FrontendAgent
from agents.product_agent import ProductAgent
from agents.qa_agent import QAAgent

# (agent_class, [keywords_that_trigger_it])
# Order matters — first match wins.
_ROUTING_TABLE = [
    (FrontendAgent, [
        "landing page", "landing", "home page", "hero",
        "dashboard page", "pricing page", "members page", "classes page",
        "settings page", "onboarding page", "admin page", "profile page",
        "login page", "signup page", "component", "layout", "navbar",
        "ui ", "user interface", "front-end", "frontend",
    ]),
    (QAAgent, [
        "e2e", "end-to-end", "unit test", "playwright", "vitest", "jest",
        "test suite", "write test", "add test", "testing strategy",
        "quality assurance", "qa ", "coverage",
    ]),
    (DevopsAgent, [
        "deploy", "deployment", "ci/cd", "ci ", "pipeline",
        "github action", "github workflow", "docker", "container",
        "kubernetes", "k8s", "nginx", "vercel", "production",
    ]),
    (ProductAgent, [
        "roadmap", "prd", "product requirement", "feature spec",
        "user story", "acceptance criteria",
    ]),
    (ArchitectAgent, [
        "architecture", "architect", "system design", "api design",
        "api contract", "api spec", "integration design",
    ]),
    (BackendAgent, [
        "api route", "api endpoint", "billing", "payment", "subscription",
        "authentication", "auth route", "webhook", "database schema",
        "prisma", "schema", "model", "repository", "service layer",
        "backend", "back-end", "server", "endpoint", "test",
        "validation", "infrastructure",
    ]),
]

_FALLBACK = BackendAgent


def select_agent(task: dict, context: dict):
    """Return the best-fit agent instance for this task.

    Falls back to BackendAgent if no keyword matches.
    """
    text = " ".join([
        (task.get("title") or ""),
        (task.get("description") or ""),
    ]).lower()

    for agent_cls, keywords in _ROUTING_TABLE:
        for kw in keywords:
            if kw in text:
                return agent_cls()

    return _FALLBACK()


def describe_routing(task: dict, context: dict) -> str:
    """Return a one-line description of which agent would be selected."""
    agent = select_agent(task, context)
    return f"task='{task.get('title', '')}' → {agent.name}"
