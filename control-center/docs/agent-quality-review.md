# Agent Quality Review

Chaque mission passe par une review avant affichage dans le chat CEO.

## Statuts

- `approved`: le livrable peut être affiché.
- `needs_refinement`: le livrable est récupérable; les agents doivent corriger.
- `rejected`: le livrable est hors sujet, recyclé, générique ou dangereux.

## Boucle de refinement

1. `evaluateDeliverable` applique la rubric du type demandé.
2. Si la review échoue, `runRefinementLoop` reconstruit un artifact primaire.
3. Logo: correction par Creative Director / Logo Designer / SVG Illustrator.
4. Website: correction par UX / Web Designer / Frontend Builder.
5. Le livrable final passe par `approveFinalDeliverable`.
6. Si aucun artifact n’est approuvé, la mission ne doit pas être présentée comme terminée.

## Quality gates

Logo:
- nom de marque correct
- pas de `Brand system`
- pas de `Marque à nommer`
- pas de logo text-only
- pas d’initiale générique sans rapport
- fond noir respecté si demandé
- SVG avec `viewBox`

Website:
- preview web, pas logo seul
- pas de recyclage du visuel précédent
- header/nav, hero, CTA et sections
- marque et secteur reflétés
- contenu temporaire si demandé

## Chat Simple

Le chat simple affiche seulement le livrable validé.
Scores, reviews, attempts, artifacts, runtime, toolTrace et fichiers restent dans `hiddenDetails`, accessibles uniquement via `Voir détails`.
