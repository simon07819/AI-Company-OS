"""QA agent — generates test files and validation scripts."""

from .base_agent import BaseAgent


class QAAgent(BaseAgent):
    name = "qa_agent"

    def run(self, task: dict, context: dict) -> dict:
        title = self.title(task)
        description = self.description(task)
        lowered = f"{title} {description}".lower()
        slug = self.slug(task)
        project = context.get("project_name", "project")
        has_saas = context.get("has_saas_app", False)

        files = {}

        if has_saas and ("e2e" in lowered or "end-to-end" in lowered or "playwright" in lowered):
            path = f"tests/e2e/{slug}.spec.ts"
            files[path] = self._e2e_test(title, description, project)
            print(f"  [{self.name}] generating {path}")

        elif has_saas and ("api" in lowered or "route" in lowered or "endpoint" in lowered):
            path = f"tests/api/{slug}.test.ts"
            files[path] = self._api_test(title, description)
            print(f"  [{self.name}] generating {path}")

        elif not has_saas:
            path = f"tests/test_{slug}.py"
            files[path] = self._python_test(title, description, slug)
            print(f"  [{self.name}] generating {path}")

        else:
            path = f"tests/unit/{slug}.test.ts"
            files[path] = self._unit_test(title, description)
            print(f"  [{self.name}] generating {path}")

        return self._result(files, notes=f"Test files for: {title}")

    # ------------------------------------------------------------------

    def _e2e_test(self, title: str, description: str, project: str) -> str:
        return (
            'import { test, expect } from "@playwright/test";\n\n'
            f'test.describe("{title}", () => {{\n'
            '  test("page loads successfully", async ({ page }) => {\n'
            '    await page.goto("/");\n'
            '    await expect(page).toHaveTitle(/GymFlow/);\n'
            "  });\n\n"
            '  test("navigation works", async ({ page }) => {\n'
            '    await page.goto("/");\n'
            '    await page.click("text=Dashboard");\n'
            '    await expect(page).toHaveURL(/dashboard/);\n'
            "  });\n"
            "});\n"
        )

    def _api_test(self, title: str, description: str) -> str:
        return (
            'import { describe, it, expect } from "vitest";\n\n'
            f'describe("{title}", () => {{\n'
            '  it("health endpoint returns ok", async () => {\n'
            '    const res = await fetch("http://localhost:3000/api/health");\n'
            "    const json = await res.json();\n"
            '    expect(res.status).toBe(200);\n'
            '    expect(json.status).toBe("ok");\n'
            "  });\n"
            "});\n"
        )

    def _unit_test(self, title: str, description: str) -> str:
        return (
            'import { describe, it, expect } from "vitest";\n\n'
            f'describe("{title}", () => {{\n'
            '  it("should work correctly", () => {\n'
            "    // TODO: implement test for: " + description + "\n"
            "    expect(true).toBe(true);\n"
            "  });\n"
            "});\n"
        )

    def _python_test(self, title: str, description: str, slug: str) -> str:
        fn_name = slug[:40]
        return (
            "import pytest\n\n\n"
            f'def test_{fn_name}_runs():\n'
            f'    """Test: {title}\n\n    {description}\n    """\n'
            "    # TODO: import and call the relevant module\n"
            "    assert True\n\n\n"
            f'def test_{fn_name}_returns_expected():\n'
            "    # Placeholder — replace with real assertions\n"
            "    result = {'status': 'stubbed'}\n"
            "    assert result.get('status') == 'stubbed'\n"
        )
