# AI Company OS Agent Runtime

The agent runtime turns each CEO message into a mission.

## Flow

1. `createWorkOrderFromPrompt` creates a turn-scoped `WorkOrder`.
2. `createMissionPlan` assigns agents, skills, tools and quality gates.
3. `buildTaskGraph` orders tasks by dependencies.
4. `runMissionTask` verifies agent, skill and tool permissions before execution.
5. The specialized workflow produces the deliverable.
6. `runQualityGates` blocks placeholders, wrong brands, recycled outputs and simple-mode leaks.
7. `buildVisibleOutput` returns only the useful deliverable.
8. `buildHiddenDetails` stores trace, checkpoints and QA for “Voir détails”.

## WorkOrder

A `WorkOrder` contains the current prompt, request type, deliverable type, brand name, constraints, turn ID and mission ID. It also decides whether a previous deliverable may be reused. If the deliverable type changes, previous primary visuals are blocked as the main answer.

## MissionPlan

A `MissionPlan` lists the workflow, objective, assigned agents, tasks and quality gates. Logo missions use Product Owner, Brand Strategist, Logo Designer, Creative Director, SVG Illustrator, Quality Director and Artifact Manager. Website missions use Product Owner, UX Designer, Web Designer, Frontend Builder, Quality Director and Artifact Manager.

## Safety

- No free shell access.
- No free filesystem access.
- No `.env`, `.env.local`, secret or token reads.
- No deploy or push automation.
- No runtime trace, checkpoints, artifacts or quality reports in simple chat.

## Adding A Workflow

Add a planner branch, define tasks with allowed skills/tools, produce a typed visible output, run quality gates, and keep all process data in hidden details.
