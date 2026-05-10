# AI Agency Operating System

An autonomous multi-agent factory that plans, builds, and iterates on SaaS products — with a local web Control Center for monitoring and control.

---

## What's in the box

```
AI-Company/
├── control-center/       # Next.js 14 admin dashboard
│   └── src/
│       ├── app/          # Pages: /, /projects, /agents, /actions, /logs
│       ├── components/   # LiveActivityFeed, ActionsForms, ProjectActions
│       └── lib/          # projects.ts, agents.ts, activity.ts, runner.ts
│
├── agents/               # 6 specialized Claude-powered agents
│   ├── base_agent.py
│   ├── frontend_agent.py
│   ├── backend_agent.py
│   ├── qa_agent.py
│   ├── devops_agent.py
│   ├── architect_agent.py
│   └── product_agent.py
│
├── projects/             # One directory per product
│   └── <ProjectName>/
│       ├── project.json  # Status, priority, metadata
│       ├── tasks/        # task_1.json … task_N.json
│       ├── docs/         # roadmap.md
│       ├── logs/         # events.jsonl
│       └── app/          # Generated Next.js SaaS app (optional)
│
├── logs/
│   └── agent_activity.jsonl  # All agent actions (append-only)
│
├── agent_router.py       # Keyword-based agent selection
├── shared_context.py     # Context builder for agents
├── run_worker.py         # Task executor (calls agent_router)
├── factory_cycle.py      # Pick next queued task + run it
├── auto_build.py         # Full autonomous build pass
├── create_product.py     # Initialize a new project
├── init_monetization.py  # Add Stripe billing stubs
├── set_project_status.py # Change project status
└── demo_ai_agency.py     # System overview / quick start
```

---

## Quick start

```bash
# 1. Clone / navigate to repo
cd AI-Company

# 2. See system overview
python3 demo_ai_agency.py

# 3. Create a product
python3 create_product.py --project MyApp --idea "SaaS for gym management"

# 4. Run one factory cycle (picks + executes next task)
python3 factory_cycle.py --project MyApp

# 5. Open the Control Center
cd control-center
npm install
npm run dev
# → http://localhost:3000
```

---

## Control Center pages

| Path | Description |
|------|-------------|
| `/` | Dashboard — stats, agent table, live activity |
| `/projects` | All projects with status/priority/task counts |
| `/projects/[name]` | Project detail — tasks, meta, action buttons |
| `/agents` | Agent registry — roles, responsibilities, routing keywords |
| `/agents/activity` | Live activity feed (auto-refreshes every 5s) |
| `/actions` | Browser UI for running factory scripts |
| `/logs` | Full log viewer — agent activity + project events |

---

## Specialized agents

| Agent | Triggered by |
|-------|-------------|
| `frontend_agent` | landing page, dashboard page, UI, Tailwind, React |
| `backend_agent` | API route, billing, Prisma, authentication, schema |
| `qa_agent` | e2e, unit test, Playwright, Vitest, test coverage |
| `devops_agent` | deploy, CI/CD, Docker, GitHub Actions |
| `architect_agent` | architecture, system design, ADR |
| `product_agent` | roadmap, PRD, product requirements |

Routing is keyword-based (first match wins). See `agent_router.py` for the full table.

---

## CLI reference

```bash
# Create a product
python3 create_product.py --project <Name> --idea "<description>"

# Run factory cycle (one task at a time)
python3 factory_cycle.py --project <Name>

# Full autonomous build
python3 auto_build.py --project <Name>

# Add monetization stubs
python3 init_monetization.py --project <Name>

# Change project status
python3 set_project_status.py --project <Name> --status active|paused|archived

# Stream live logs
tail -f logs/agent_activity.jsonl | python3 -m json.tool
```

---

## Activity logging

Every agent action is appended to `logs/agent_activity.jsonl`:

```json
{"timestamp":"2026-05-10T05:33:42","project":"GymFlow","task_id":1,"task_title":"Build landing page","agent":"frontend_agent","status":"completed","message":"..."}
```

Status values: `selected` → `completed` or `error`.

The Control Center polls this file every 5 seconds on the `/agents/activity` page.

---

## Adding a new agent

1. Create `agents/my_agent.py` inheriting `BaseAgent`
2. Set `name = "my_agent"`
3. Implement `run(self, task, context) -> dict`
4. Add to `_ROUTING_TABLE` in `agent_router.py`
5. Add to `AGENTS` registry in `control-center/src/lib/agents.ts`
