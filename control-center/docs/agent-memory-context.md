# Agent Memory and Context

AI Company OS sépare clairement un tour de chat, une mission et un artifact.

- `ConversationTurn`: message utilisateur + résultat visible associé à ce tour.
- `MissionMemoryEntry`: mission approuvée, type de livrable, marque, artifact primaire et résumé.
- `ReusableAsset`: artifact utilisable plus tard comme contexte secondaire ou base de modification.
- `ContextSelection`: décision runtime qui autorise ou interdit la réutilisation d'anciens artifacts.

## Réutilisation

Un ancien livrable peut être utilisé comme base seulement si la demande est explicitement une modification compatible:

- `modifie ce logo`
- `mets le fond noir`
- `garde le même logo`
- `fais une variante`

Une nouvelle demande forte crée une nouvelle mission:

- `je veux une page web`
- `fais-moi un site`
- `crée une landing page`
- `logo PROSHOTS`

Si le type de livrable change, l'ancien artifact primaire est interdit comme réponse principale. Un logo peut être utilisé comme asset secondaire dans une page web, mais jamais comme preview complète du site.

## Contexte par agent

Chaque agent reçoit seulement le contexte utile:

- Product Owner: prompt actuel, contraintes, marque, assets pertinents.
- Logo Designer: brief logo et contraintes visuelles.
- UX Designer: brief site et logo existant comme asset secondaire.
- Quality Director: fingerprints interdits et règles anti-recyclage.
- CEO: livrable approuvé et détails fermés.

## Mode simple

La mémoire ne doit jamais exposer en chat simple:

- hidden details
- tool traces
- checkpoints
- quality reports
- fichiers, JSON, README
- secrets ou variables `.env`

Les détails restent accessibles seulement via `Voir détails`, attachés au bon message.
