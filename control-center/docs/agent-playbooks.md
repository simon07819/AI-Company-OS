# Agent Playbooks

Agent Playbooks are executable expert guides for AI Company OS agents. They are TypeScript modules, not decorative markdown.

## What A Playbook Contains

Each playbook defines:

- mission
- operating principles
- task method steps
- decision rules
- quality standards
- failure modes
- required outputs
- forbidden outputs
- examples
- skill and tool bindings

The registry lives in `src/agents/playbooks/registry.ts`.

## Knowledge Packs

Knowledge packs live in `src/agents/playbooks/knowledge`.

They encode domain standards for:

- logo design
- brand strategy
- UX design
- website design
- frontend preview production
- SVG production
- quality review
- artifact production

## Runtime Use

Before each runtime task:

1. `selectPlaybookForTask` selects the agent playbook and relevant knowledge packs.
2. `compilePlaybookIntoAgentMethod` converts the playbook into an AgentMethod.
3. AgentBrain uses the compiled method.

After each task:

1. Critique uses selected failure modes.
2. Refinement strategy uses correction strategies from the playbook.
3. Hidden details receive `playbookTrace` and `selectedKnowledge`.

## Simple Mode

Simple chat never shows playbooks, selected knowledge, quality standards, traces, scores, artifacts, files, JSON, README, workspace, runtime, toolTrace, checkpoints or process.

Those details are available only in `Voir details`.

## Adding A Playbook

1. Add a playbook file in `src/agents/playbooks`.
2. Register it in `registry.ts`.
3. Bind only existing skills and tools.
4. Add failure modes with clear detection hints and correction strategies.
5. Add tests proving runtime selection and hidden-only visibility.
