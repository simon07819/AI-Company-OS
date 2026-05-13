# CEO Agent Evals

Les evals protègent les comportements produit critiques du CEO et des agents.

Elles exécutent le pipeline réel (`runAgentMission`) et vérifient le résultat final, pas seulement du texte intermédiaire.

## Ce qui est protégé

- `logo EKIDA` ne doit jamais retourner `Brand system`, `Marque à nommer` ou une lettre générique.
- `logo EKIDA sur fond noir` doit respecter le fond noir et rester lié à EKIDA/EK/E.
- PROSHOTS doit être extrait comme marque, avec un signal photo/sport.
- Une demande de page web avec un logo doit retourner une preview web, pas recycler le logo seul.
- Le chat simple ne doit pas exposer score, quality report, artifacts, JSON, README, workspace, process, runtime, toolTrace ou checkpoints.
- Les détails restent disponibles seulement côté détails/dev.

## Ajouter un cas

Ajouter un `EvalCase` dans `src/agents/evals/golden-cases/*`.

Chaque cas définit:

- le prompt
- les tours précédents si nécessaire
- le type de livrable attendu
- les agents/skills/tools attendus
- les textes requis/interdits
- les règles anti-recyclage

## Exécution

Les evals sont inclus dans `npm test`.

Commande ciblée:

```bash
npm run test:evals
```

Les failures listent le cas et les assertions produit qui ne passent pas.
