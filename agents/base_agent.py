"""Base class shared by all specialized agents."""


class BaseAgent:
    name = "base_agent"

    def run(self, task: dict, context: dict) -> dict:
        """Execute the task and return generated artefacts.

        Args:
            task:    task dict (id, title, description, status, …)
            context: shared_context dict (project_name, app_dir, roadmap, …)

        Returns:
            {
                "agent": str,
                "files": {rel_path_from_app_dir: content_str, …},
                "notes": str,
            }
        """
        raise NotImplementedError(f"{self.name}.run() is not implemented")

    def _result(self, files: dict, notes: str = "") -> dict:
        return {"agent": self.name, "files": files, "notes": notes}

    # ------------------------------------------------------------------
    # Convenience helpers
    # ------------------------------------------------------------------

    @staticmethod
    def title(task: dict) -> str:
        return (task.get("title") or "").strip()

    @staticmethod
    def description(task: dict) -> str:
        return (task.get("description") or task.get("title") or "").strip()

    @staticmethod
    def slug(task: dict) -> str:
        import re
        raw = (task.get("title") or "task").lower()
        return re.sub(r"[^a-z0-9]+", "_", raw).strip("_")[:60]
