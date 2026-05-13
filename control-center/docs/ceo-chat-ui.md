# CEO Chat UI

`/ceo` est une salle de chat sombre et minimaliste. La page affiche seulement:

- un header compact avec avatar et nom du CEO
- la timeline de messages
- le composer en bas
- le livrable principal dans la bulle CEO

## Simple Mode

Le chat simple ne rend jamais les détails internes: scores, artifacts, fichiers, JSON, README, workspace, traces runtime, toolTrace, checkpoints, candidates, playbooks ou process.

`visibleOutput` sert au rendu principal:

- `visual` / `logo` -> bulle média logo
- `website_preview` -> bulle preview web
- texte simple -> bulle texte

`hiddenDetails` reste fermé par défaut et s’ouvre seulement via `Voir détails`.

## Ajouter Un Type De Message

Créer un composant de bulle dédié, brancher le `visibleOutput.kind`, puis garder tout diagnostic dans `CEOResultDetails`.
