# Prompt de reprise — session suivante

> À copier-coller tel quel dans une nouvelle session Claude Code ouverte sur
> `/home/aurel/projects/portfolio`. Mettre à jour la section « État » à chaque fin de phase.

---

```text
Tu reprends le développement de mon portfolio de développeur Full-Stack.
Répertoire de travail : /home/aurel/projects/portfolio

## Avant toute chose

Lis, dans cet ordre, et ne me demande pas de te les résumer :

1. docs/roadmap.md            ← source de vérité des tâches et des statuts, commence par « Jalons »
2. docs/vision.md             ← vision, contraintes, risques, hypothèses
3. docs/architecture.md       ← architecture, Docker, déploiement VPS
4. docs/adr/README.md         ← index des décisions + journal des révisions
5. docs/testing-strategy.md   ← ce qui est testé, comment, seuils de couverture
6. docs/performance-budget.md ← budgets chiffrés
7. docs/phase-0-questions.md  ← ce qui est tranché et ce qui reste ouvert

La Phase 0 (discovery et cadrage) est TERMINÉE et validée. Ne la refais pas, ne la rediscute pas.

## État

Phase 0 : DONE. Phase 1 (fondation technique) : à ouvrir, aucune tâche démarrée.
Aucun code n'existe encore : le dépôt ne contient que docs/.

## Décisions déjà prises — ne pas les rejouer

ADR-0001  Markdown/MDX = source de vérité unique, Content Layer pur TS validé par Zod
ADR-0002  Le routeur Next.js est la source de vérité de la navigation ; la scène suit l'URL
ADR-0003  Three.js = enrichissement progressif, 4 paliers de capacité
ADR-0004  Contenu des écrans = DOM superposé, instance unique déplacée par portail React
ADR-0005  i18n sans bibliothèque, dictionnaires TS, contenu localisé par fichier
ADR-0006  CV : Server Action + Mailjet (API Send v3.1 via fetch natif, ZÉRO dépendance)
ADR-0007  Environnement de développement 100 % dockerisé
ADR-0008  Auto-hébergement VPS, image Docker derrière Caddy en pile « edge » autonome

Si une de ces décisions doit changer : signale-le, explique pourquoi, identifie les conséquences,
mets l'ADR à jour et ajoute une ligne au journal des révisions. Jamais de changement silencieux.

## Règles de travail non négociables

- Ordre d'arbitrage en cas de conflit :
  accessibilité > indexabilité > performance du contenu > richesse de la scène 3D
- Node.js N'EST PAS installé sur l'hôte, et c'est voulu (ADR-0007). Tout passe par Docker.
  Toute commande que tu proposes doit être exécutable en conteneur (`make ...`).
- Une tâche n'est DONE que si : implémentation finie, code typé, tests pertinents ajoutés et
  verts, lint vert, zéro erreur TypeScript, doc à jour, critères d'acceptation satisfaits,
  aucune dette introduite silencieusement.
- Petits incréments : une tâche → implémentation → test → validation. Jamais dix fonctionnalités
  avant de lancer les tests.
- Ne jamais supprimer ni affaiblir un test pour verdir la suite sans justification fonctionnelle.
- Les identifiants de tâches (P1-01…) sont stables et ne sont JAMAIS réutilisés. Une tâche
  abandonnée est marquée DROPPED avec sa cause.
- Aucune dépendance structurante sans justifier : problème / pourquoi adaptée / alternatives /
  pourquoi préférée. Écris-le dans un ADR si la décision est structurante.
- Mets à jour docs/roadmap.md (statuts) au fil de l'eau, pas à la fin.
- Documentation et échanges en français ; identifiants, code et noms de fichiers en anglais.

## Ta mission cette session

Ouvre la PHASE 1 — Fondation technique (tâches P1-01 à P1-17, détaillées dans roadmap.md).

Commence par :
- P1-17 (nom de domaine et zone DNS) — prérequis transverse, à engager en premier, mais c'est
  une action de ma part : liste-moi précisément ce que je dois faire et vérifier.
- P1-01, puis P1-02 (Docker), P1-03 (Next.js dans le conteneur), et la suite dans l'ordre des
  dépendances.

Avant de coder, applique la méthode de phase : objectif, décisions à prendre, tâches, tests
correspondants, critères de sortie. Puis implémente par incréments.

Ne démarre PAS la Phase 2 tant que les critères de sortie de la Phase 1 ne sont pas tous
satisfaits, notamment : `make ci` vert depuis un clone neuf, hot reload fonctionnel, aucun
fichier root dans le dépôt, CI verte avec gates non contournables, image de production
construite et démarrant, aucune dépendance Three.js dans le projet.

À la fin de la phase, produis un bilan : fait / dérives / reporté.

## Contexte de planning

Objectif : portfolio documentaire EN LIGNE début septembre 2026 (tranche T1 = Phases 1 à 4 +
P4-13 à P4-16). La 3D vient après, par incréments, sur le site déjà en ligne.
Le chemin critique n'est pas technique : c'est la rédaction du contenu (P2-11), à ma charge.

## Points encore ouverts

- Disponibilité effective du VPS (bloque uniquement P1-15 ; si indisponible, marque P1-15
  BLOCKED et continue — c'est prévu dans roadmap.md).
- Questions Q3 à Q6 et Q8 à Q19 de docs/phase-0-questions.md : applique la recommandation par
  défaut et signale-le, ne me bloque pas dessus.

Si quelque chose est ambigu : propose une solution argumentée et marque explicitement
l'hypothèse. Ne construis jamais une architecture cachée.
```

---

## Entretien de ce fichier

À la fin de chaque phase, mettre à jour dans le bloc ci-dessus :

- la section **État** (phase terminée, phase suivante, tâches en cours) ;
- la liste des **ADR** si de nouveaux ont été créés ;
- la section **Ta mission cette session** ;
- les **points encore ouverts**.

Le reste est stable et n'a pas vocation à changer.
</content>
