# Agent Intelligence Layer

The intelligence layer gives each operational agent a repeatable work method before it runs skills or tools.

## Agent Brain

`runAgentBrain` receives the agent role, task, work order, available skills/tools and mode. It returns:

- the method to use
- the task plan
- required skill/tool calls
- expected output shape
- quality checklist

This is stored only in hidden details.

## Agent Methods

Methods live in `src/agents/intelligence/agent-methods.ts`.

Each method defines:

- purpose
- steps
- quality checklist
- common failure modes
- required outputs

Examples:

- Logo Designer must produce monogram, symbol and badge concepts.
- Frontend Builder must render header/nav, hero, CTA and sections.
- Quality Director must block placeholders, recycled outputs and simple-mode leaks.

## Planning Engine

`createMissionPlanWithIntelligence` wraps the runtime planner and adds intelligence gates:

- `critiqueAgentOutput`
- `createRefinementStrategy`

The runtime uses this planner before task execution.

## Critique Engine

`critiqueAgentOutput` checks each task output against the current work order and method failure modes.

It rejects:

- `Brand system`
- `unnamed brand placeholder`
- text-only logos
- unrelated initials for EKIDA
- website outputs without nav/hero/sections
- internal details in visible output

## Refinement Strategy

`createRefinementStrategy` turns a critique into targeted correction:

- logo visual issue: Logo Designer + SVG Illustrator
- brand issue: Product Owner + Logo Designer + SVG Illustrator
- website structure issue: UX Designer + Web Designer + Frontend Builder
- visibility issue: Quality Director / visible output builder

## Eval Learning

`learnFromEvalFailures` converts eval failures into internal lessons. Lessons are not applied as unsafe prompt rewrites; they feed planning/critique rules and regression tests.

## Simple Mode

Chat simple never shows brain output, critique, refinement, score, artifacts, runtime, toolTrace or checkpoints. These details are only available behind `Voir details`.
