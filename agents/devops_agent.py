"""DevOps agent — generates CI/CD configs, Dockerfiles, and deployment scripts."""

from .base_agent import BaseAgent


class DevopsAgent(BaseAgent):
    name = "devops_agent"

    def run(self, task: dict, context: dict) -> dict:
        title = self.title(task)
        description = self.description(task)
        lowered = f"{title} {description}".lower()
        project = context.get("project_name", "project")

        files = {}

        if "github" in lowered or "workflow" in lowered or "ci" in lowered or "action" in lowered:
            path = ".github/workflows/ci.yml"
            files[path] = self._github_ci(project)
            print(f"  [{self.name}] generating {path}")

        if "docker" in lowered or "container" in lowered or "image" in lowered:
            files["Dockerfile"] = self._dockerfile(project)
            files[".dockerignore"] = self._dockerignore()
            print(f"  [{self.name}] generating Dockerfile")

        if "deploy" in lowered or "vercel" in lowered or "production" in lowered:
            files["vercel.json"] = self._vercel_config()
            print(f"  [{self.name}] generating vercel.json")

        if not files:
            path = ".github/workflows/ci.yml"
            files[path] = self._github_ci(project)
            print(f"  [{self.name}] defaulting to {path}")

        return self._result(files, notes=f"DevOps config for: {title}")

    # ------------------------------------------------------------------

    def _github_ci(self, project: str) -> str:
        return (
            f"name: CI — {project}\n\n"
            "on:\n"
            "  push:\n"
            "    branches: [main]\n"
            "  pull_request:\n"
            "    branches: [main]\n\n"
            "jobs:\n"
            "  build:\n"
            "    runs-on: ubuntu-latest\n"
            "    steps:\n"
            "      - uses: actions/checkout@v4\n\n"
            "      - name: Set up Node\n"
            "        uses: actions/setup-node@v4\n"
            "        with:\n"
            "          node-version: '20'\n"
            "          cache: 'npm'\n\n"
            "      - name: Install dependencies\n"
            "        run: npm ci\n\n"
            "      - name: Lint\n"
            "        run: npm run lint\n\n"
            "      - name: Build\n"
            "        run: npm run build\n"
        )

    def _dockerfile(self, project: str) -> str:
        return (
            "FROM node:20-alpine AS base\n\n"
            "FROM base AS deps\n"
            "WORKDIR /app\n"
            "COPY package*.json ./\n"
            "RUN npm ci\n\n"
            "FROM base AS builder\n"
            "WORKDIR /app\n"
            "COPY --from=deps /app/node_modules ./node_modules\n"
            "COPY . .\n"
            "RUN npm run build\n\n"
            "FROM base AS runner\n"
            "WORKDIR /app\n"
            "ENV NODE_ENV production\n"
            "COPY --from=builder /app/.next/standalone ./\n"
            "COPY --from=builder /app/.next/static ./.next/static\n"
            "EXPOSE 3000\n"
            'CMD ["node", "server.js"]\n'
        )

    def _dockerignore(self) -> str:
        return (
            "node_modules\n"
            ".next\n"
            ".env\n"
            ".env.local\n"
            "*.md\n"
        )

    def _vercel_config(self) -> str:
        return (
            '{\n'
            '  "framework": "nextjs",\n'
            '  "buildCommand": "npm run build",\n'
            '  "devCommand": "npm run dev",\n'
            '  "installCommand": "npm install"\n'
            '}\n'
        )
