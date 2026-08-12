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
8. docs/phase-1-log.md        ← journal de la Phase 1 : mesures, dérives, dette tracée
9. deploy/README.md           ← exploitation réelle du serveur : déploiement, rollback, journaux

Les Phases 0 et 1 sont TERMINÉES et validées. Ne les refais pas, ne les rediscute pas.

## État

Phase 0 : DONE. **Phase 1 : DONE (2026-08-12)** — 17 tâches sur 17, douze critères de sortie
satisfaits, chacun vérifié par une exécution et non par une intention.
Phase 2 (Content layer) : à ouvrir, aucune tâche démarrée.

**Le site est EN LIGNE** sur https://aurelienfeignon.com. Ce n'est pas une maquette : chaque push
sur `main` reconstruit, teste, publie et déploie.

Ce qui existe et fonctionne, à ne pas redécouvrir :

- Squelette Next.js 16 / React 19, TypeScript strict, ESLint avec règles de cloisonnement,
  Vitest + Playwright, environnement 100 % dockerisé (`make`).
- CI GitHub Actions en cinq jobs : versions → gates → E2E contre l'image de production →
  publication GHCR taguée par SHA → déploiement SSH. `main` est protégée, gates non contournables,
  vérifié par un push direct refusé et une PR fautive vue échouer.
- VPS Hetzner CX23 (Debian 13, Nuremberg), durci : SSH par clé seule, `root` refusé, `ufw`,
  mises à jour automatiques, purge Docker hebdomadaire. La clé de déploiement de la CI est
  restreinte par `command=` et ne donne pas de shell.
- Rollback **exécuté pour de vrai** (9 s) ; `deploy.sh` revient seul au tag précédent si le
  conteneur ne devient pas sain.
- Domaine `aurelienfeignon.com` (Namecheap, expire le 2027-08-11), zone chez Cloudflare, proxy
  actif en *Full (strict)*, TLS Let's Encrypt automatique. SPF, DKIM, DMARC publiés ; domaine
  `Active` chez Mailjet. `make check-dns` vérifie tout cela sur deux résolveurs.
- L'origine n'accepte plus que les plages Cloudflare, filtrées dans `DOCKER-USER`.

⚠️ Deux pièges de cette infrastructure, déjà payés une fois — voir `deploy/README.md` §1.1 et §6.3 :
`ufw` ne gouverne PAS les ports publiés par un conteneur, et le port 22 ne peut pas être restreint
à une IP tant que le déploiement part des runners GitHub.

## Décisions déjà prises — ne pas les rejouer

ADR-0001  Markdown/MDX = source de vérité unique, Content Layer pur TS validé par Zod
ADR-0002  Le routeur Next.js est la source de vérité de la navigation ; la scène suit l'URL
ADR-0003  Three.js = enrichissement progressif, 4 paliers de capacité
ADR-0004  Contenu des écrans = DOM superposé, instance unique déplacée par portail React
ADR-0005  i18n sans bibliothèque, dictionnaires TS, contenu localisé par fichier
ADR-0006  CV : Server Action + Mailjet (API Send v3.1 via fetch natif, ZÉRO dépendance)
ADR-0007  Environnement de développement 100 % dockerisé
ADR-0008  Auto-hébergement VPS, image Docker derrière Caddy en pile « edge » autonome
ADR-0009  À CRÉER en P2-01 : choix de la bibliothèque MDX

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

Ouvre la PHASE 2 — Content layer (tâches P2-01 à P2-11, détaillées dans roadmap.md).

Objectif : transformer les fichiers Markdown/MDX en objets typés et validés. **Un contenu invalide
doit casser le build**, pas produire une page à moitié vide.

Commence par **P2-01 — ADR-0009, choix de la bibliothèque MDX**, et ne l'expédie pas : c'est la
seule décision structurante de la phase. Vérifie la compatibilité réelle avec Next 16 / React 19
avant de trancher, pas la version annoncée dans un README. L'ADR-0001 impose déjà que la couche
Content reste du TypeScript pur validé par Zod, sans dépendance à React — le choix MDX ne doit pas
faire entrer React dans cette couche.

Puis dans l'ordre des dépendances : P2-02 (schémas Zod) → P2-03 (lecture, frontmatter, cache) →
P2-04 (validation stricte) → P2-05 (repositories) → P2-06 (normalisations) → P2-07 (cohérence
référentielle) → P2-08 (compilation MDX en RSC) → P2-09 (fixtures valides ET invalides) →
P2-10 (contenu d'amorçage).

Deux points de méthode propres à cette phase :

- **P2-04 se prouve par un test qui échoue pour la bonne raison.** Un frontmatter invalide doit
  faire échouer `make build` avec un message nommant le fichier fautif. Écris d'abord la fixture
  invalide, vois-la casser le build, puis vérifie que le message est exploitable.
- **P2-09 : les fixtures de test sont indépendantes du contenu réel.** C'est un critère de sortie
  explicite. Si un test casse parce que j'ai réécrit un projet, la suite est mal construite.

P2-11 (rédaction du contenu réel, fr + en) est **à ma charge et hors code**. Ne l'attends pas, ne
la simule pas : P2-10 fournit le contenu d'amorçage qui suffit à tout développer.

Avant de coder, applique la méthode de phase : objectif, décisions à prendre, tâches, tests
correspondants, critères de sortie. Puis implémente par incréments.

Ne démarre PAS la Phase 3 tant que les critères de sortie de la Phase 2 ne sont pas tous
satisfaits : couverture ≥ 95 % sur `src/content/**`, un frontmatter invalide fait échouer
`make build` (prouvé par un test), aucun import React ou Three.js dans la couche (vérifié par le
lint), fixtures de test indépendantes du contenu réel.

À la fin de la phase, produis un bilan : fait / dérives / reporté.

## Contexte de planning

Objectif : portfolio documentaire EN LIGNE début septembre 2026 (tranche T1 = Phases 1 à 4 +
P4-13 à P4-16). La 3D vient après, par incréments, sur le site déjà en ligne.
Le chemin critique n'est pas technique : c'est la rédaction du contenu (P2-11), à ma charge.

## Points encore ouverts

Aucun ne bloque la Phase 2. Ils sont listés parce qu'ils se rappelleront au mauvais moment si
personne ne les écrit.

- **Le jeton GHCR expire.** Un PAT `read:packages` est posé sur le VPS pour tirer l'image, qui est
  dans un paquet privé. À son expiration, `docker compose pull` échouera et les déploiements
  s'arrêteront — sans rapport apparent avec le code. Rendre le paquet public supprimerait
  définitivement ce secret et son renouvellement ; le dépôt est déjà public, l'image ne contient
  rien de plus.
- **Mesure CPU en régime stable** (P11-08) : le seul relevé date d'une minute après démarrage du
  conteneur — 32 %, au-dessus du seuil d'alerte de 25 %. Ce n'est pas une mesure valide, et ce
  n'est pas non plus un problème constaté. Le RSS, lui, est net : 38 Mo pour un budget de 250.
- **Procédure de restauration du serveur** (risque R-23) : Hetzner restreint par intermittence la
  création et le redimensionnement d'instances. Toute procédure supposant « je recrée un serveur »
  peut échouer le jour où elle sert. À écrire sous cette contrainte en Phase 15.
- **Plages Cloudflare** : un timer hebdomadaire les rafraîchit sur le VPS. En cas de doute,
  `sudo /srv/edge/sync-cloudflare-origin-firewall.sh --check` sort en 1 s'il y a dérive.
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
