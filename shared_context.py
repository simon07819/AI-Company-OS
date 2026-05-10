"""Build a shared context dict passed to every agent."""

import os
from typing import Optional


def build_context(repo_path: str, task: dict, project_path: Optional[str] = None) -> dict:
    """Assemble context from local project files.

    Args:
        repo_path:    absolute path to the git repository root
        task:         task dict (id, title, description, status, …)
        project_path: absolute path to the project directory (optional)

    Returns:
        {
            "project_name":  str,
            "task":          dict,
            "roadmap":       str | None,
            "validation_report": str | None,
            "app_dir":       str | None,
            "has_saas_app":  bool,
            "repo_path":     str,
            "project_path":  str | None,
        }
    """
    project_name = ""
    roadmap = None
    validation_report = None
    app_dir = None
    has_saas_app = False

    if project_path and os.path.isdir(project_path):
        project_name = os.path.basename(project_path)

        roadmap = _read_file(os.path.join(project_path, "docs", "roadmap.md"))
        validation_report = _read_file(os.path.join(project_path, "validation_report.md"))

        candidate_app = os.path.join(project_path, "app")
        if os.path.isdir(candidate_app) and os.path.isfile(os.path.join(candidate_app, "package.json")):
            app_dir = candidate_app
            has_saas_app = True

    return {
        "project_name":      project_name,
        "task":              task,
        "roadmap":           roadmap,
        "validation_report": validation_report,
        "app_dir":           app_dir,
        "has_saas_app":      has_saas_app,
        "repo_path":         repo_path,
        "project_path":      project_path,
    }


def _read_file(path: str) -> Optional[str]:
    try:
        with open(path, "r", encoding="utf-8") as f:
            return f.read()
    except OSError:
        return None
