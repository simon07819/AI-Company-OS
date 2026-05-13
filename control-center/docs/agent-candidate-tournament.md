# Agent Candidate Tournament

AI Company OS ne retourne plus le premier livrable produit pour les demandes logo et website.

## Flow

1. Le runtime crée un `WorkOrder`.
2. `generateCandidatesForWorkOrder` produit plusieurs candidats internes.
3. `runJudgePanel` fait évaluer les candidats par les rôles métier pertinents.
4. `refineTopCandidates` améliore les meilleurs candidats non rejetés.
5. `selectFinalCandidate` choisit seulement un candidat approuvé avec artifact.
6. Le runtime matérialise l’artifact final et construit le `visibleOutput`.

## Règles

- Logo: au moins cinq candidats internes.
- Website: au moins trois candidats internes.
- Les candidats avec mauvais type, placeholder, mauvaise marque, output recyclé ou détails visibles sont rejetés.
- Les scores, reviews, candidats rejetés et learning notes restent dans `hiddenDetails`.
- Le chat simple affiche seulement le livrable final approuvé.

## Learning

`recordTournamentLessons` transforme les rejets en notes internes. Ces notes servent à documenter les patterns d’échec sans modifier automatiquement du code ni exposer le procédé dans le chat simple.
