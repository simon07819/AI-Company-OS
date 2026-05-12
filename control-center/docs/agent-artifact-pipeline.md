# Agent Artifact Pipeline

AI Company OS sépare le livrable visible du procédé interne.

- `visibleOutput` contient seulement le livrable principal rendu dans le chat CEO: SVG logo ou preview web.
- `hiddenDetails` contient les artifacts, quality checks, trace runtime, agents, skills et tools. Ces données restent derrière `Voir détails`.
- Chaque mission crée ses artifacts avec `missionId` et `turnId`; un artifact primaire ne peut pas être recyclé entre deux types de livrables incompatibles.

## Flux

1. Le runtime crée un `WorkOrder`.
2. Le workflow logo ou website produit un visuel.
3. Le builder d’artifact transforme ce visuel en `MissionArtifact`.
4. L’artifact reçoit un fingerprint SHA-256.
5. Les quality gates valident l’existence, l’isolation et le non-recyclage.
6. Le chat affiche uniquement le contenu de l’artifact primaire.

## Sécurité

- Pas d’accès `.env` ou `.env.local`.
- Pas de secrets dans les artifacts.
- SVG/HTML sanitizés: scripts, handlers inline et `foreignObject` bloqués.
- Les paths sont normalisés sous `generated-products/_mission-artifacts/...`.
- Les artifacts `details_only` et `internal_only` ne sont jamais rendus dans le chat simple.

## Ajouter un artifact

1. Ajouter le type dans `src/agents/artifacts/types.ts`.
2. Créer un builder dédié.
3. Stocker via `createMissionArtifactStore`.
4. Ajouter une quality gate.
5. Rendre uniquement le livrable primaire dans `visibleOutput`.
