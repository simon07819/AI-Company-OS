# Agent Coaching

La couche coaching transforme les échecs en règles runtime utilisées par les agents.

## AgentLesson

Une lesson décrit:

- la source: eval, quality review, rejet de candidat, refinement ou succès approuvé
- l’agent concerné
- le type de livrable
- le failure pattern
- la règle de correction
- les indices de détection
- la priorité

## Flow

1. Le runtime sélectionne le playbook et les knowledge packs.
2. `selectLessonsForTask` choisit les lessons pertinentes.
3. `applyLessonsToPlaybookRuntimeView` enrichit le playbook en mémoire seulement.
4. `coachAgentBeforeTask` ajoute checklist, failure modes et contraintes aux inputs.
5. `optimizeSkillBehavior` adapte les skills déterministes.
6. Les nouvelles reviews/rejets créent de nouvelles lessons pour les prochaines missions.

## Sécurité

Les lessons ne modifient jamais automatiquement les fichiers source des playbooks.
Les secrets et `.env` sont filtrés.
Le chat simple ne rend jamais coaching, lessons, traces, scores ou process.

## Détails

Les lessons appliquées, profils de coaching et optimisations de skills sont visibles seulement dans `Voir détails`.
