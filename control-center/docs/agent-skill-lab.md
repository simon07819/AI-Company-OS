# Agent Skill Lab

Le Skill Lab est la zone dev qui permet de proposer, tester et promouvoir de nouvelles skills d’agents sans les activer directement en production.

## Flux

1. Une faiblesse vient d’une eval, d’une quality review, d’une lesson, d’un rejet de candidat ou d’un gap de playbook.
2. `discoverSkillCandidates` propose une `SkillCandidate` interne.
3. `reviewSkillCandidateRisk` et `reviewSkillCandidateLicense` bloquent les accès dangereux, secrets, dépendances lourdes non justifiées et code externe copié.
4. `runSkillBenchmarks` compare baseline vs candidate expérimentale.
5. `decideSkillPromotion` promeut seulement si la candidate améliore au moins un benchmark sans régression critique.
6. Le runtime charge uniquement les candidates promues; les candidates expérimentales restent réservées aux benchmarks.

## Candidates initiales

- `improved_brand_name_extraction`
- `strict_visual_deliverable_router`
- `multi_concept_logo_generation`
- `svg_logo_quality_renderer`
- `website_preview_structure_builder`
- `simple_mode_visibility_guard`
- `previous_deliverable_reuse_guard`

## Sécurité

Le Skill Lab ne clone pas GitHub, n’installe pas de framework, ne donne pas d’accès libre au shell, au filesystem ou au réseau. Les patterns externes restent des idées d’architecture, pas du code copié.

Les candidates sont rejetées si elles demandent `.env`, `.env.local`, secrets, `NVIDIA_API_KEY`, shell libre, filesystem hors garde-fous, déploiement ou dépendance lourde non justifiée.

## Chat Simple

Les rapports Skill Lab, benchmarks, décisions de promotion et traces restent dans les détails/dev. Le `visibleOutput` ne doit jamais contenir `skillLab`, benchmarks, score, process, artifacts, toolTrace, checkpoints ou logs.

## Ajouter une candidate

1. Ajouter la candidate dans `src/agents/skill-lab/candidates/`.
2. Décrire plan d’implémentation, tests, critères de promotion et rollback.
3. Ajouter ou relier des benchmarks dans `src/agents/skill-lab/benchmarks/`.
4. Vérifier risque/licence.
5. Exécuter les tests et benchmarks.
6. Promouvoir seulement via la politique de promotion.

