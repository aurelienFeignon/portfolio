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
9. docs/phase-2-log.md        ← journal de la Phase 2 : ce que l'exécution a renversé, dette tracée
10. deploy/README.md          ← exploitation réelle du serveur : déploiement, rollback, journaux

Les Phases 0, 1 et 2 sont TERMINÉES et validées. Ne les refais pas, ne les rediscute pas.

## État

Phases 0 et 1 : DONE. **Phase 2 : DONE (2026-08-14)** — 10 tâches sur 10, quatre critères de sortie
satisfaits, chacun vérifié par une exécution. 228 tests, **100 % de couverture** sur `src/content/**`,
`src/ui/mdx/**` et `src/i18n/**`, 39 mutations appliquées au code de production et toutes tuées.
Phase 3 (Internationalisation) : à ouvrir, aucune tâche démarrée.

⚠️ **La PR #10 est ouverte, CI verte, et N'EST PAS FUSIONNÉE.** C'est le premier point à trancher :
la fusionner met le CV en ligne et redéploie le site. Vérifie son état avant toute chose
(`gh pr view 10`), et n'ouvre pas la Phase 3 sur une branche qui diverge d'elle.

**Le CV est dans le dépôt** : `public/resume/cv-fr.pdf` et `cv-en.pdf`, servis à URL stable avec
`X-Robots-Tag: noindex` posé par l'application et vérifié en E2E contre l'image de production.

**P2-11 — la rédaction du contenu réel — reste à ma charge et n'est PAS faite.** `content/` porte
aujourd'hui 18 fichiers d'amorçage qui le disent en toutes lettres. Ils suffisent à développer les
Phases 3 et 4 ; ils ne doivent pas être publiés. **Le CV extrait suffit à en rédiger l'essentiel**
dès que j'aurai tranché les questions du bloc « Décisions » ci-dessous.

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
- **Content Layer complet** (`src/content/`) : schémas Zod stricts, lecture du disque, validation,
  dépôt typé, tris et dérivations, cohérence référentielle. `make check-content` valide tout
  `content/` et **casse le build** ; il est déjà branché dans `pnpm build`, donc dans la CI.
- **Rendu MDX** (`src/ui/mdx/`) avec liste blanche de composants, qui refuse **avant** de rendre.
- Vocabulaire des locales dans `src/i18n/locales.ts` : `LOCALES`, `Locale`, `DEFAULT_LOCALE`,
  `isLocale`. P3-01 le **complète**, ne le recrée pas.

⚠️ Deux pièges de cette infrastructure, déjà payés une fois — voir `deploy/README.md` §1.1 et §6.3 :
`ufw` ne gouverne PAS les ports publiés par un conteneur, et le port 22 ne peut pas être restreint
à une IP tant que le déploiement part des runners GitHub.

⚠️ Trois contraintes héritées de la Phase 2, à ne pas défaire par mégarde :
`package.json` porte `"type": "module"` et les imports relatifs de `src/content/**` portent leur
extension `.ts` — c'est ce qui rend la couche exécutable par `node` seul, donc le gate de contenu
possible ; `content/` n'est PAS dans l'image de production, donc **aucune route ne doit pouvoir se
rendre à la demande** ; et la liste blanche MDX n'est **pas** une barrière de sécurité (MDX exécute
du JavaScript). Détail dans `docs/phase-2-log.md` §9.4, §10.3 et §6.1.

## Décisions déjà prises — ne pas les rejouer

ADR-0001  Markdown/MDX = source de vérité unique, Content Layer pur TS validé par Zod
ADR-0002  Le routeur Next.js est la source de vérité de la navigation ; la scène suit l'URL
ADR-0003  Three.js = enrichissement progressif, 4 paliers de capacité
ADR-0004  Contenu des écrans = DOM superposé, instance unique déplacée par portail React
ADR-0005  i18n sans bibliothèque, dictionnaires TS, contenu localisé par fichier
ADR-0006  CV : Server Action + Mailjet (API Send v3.1 via fetch natif, ZÉRO dépendance)
ADR-0007  Environnement de développement 100 % dockerisé
ADR-0008  Auto-hébergement VPS, image Docker derrière Caddy en pile « edge » autonome
ADR-0009  Compilation MDX par @mdx-js/mdx appelé directement (next-mdx-remote = repli désigné)
ADR-0010  À CRÉER en P4-01 : stratégie de style

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
- **Avant CHAQUE push : `/code-review` puis `/simplify`**, et traite les retours avant de pousser,
  pas après. C'est en plus de `make ci`, pas à la place : les gates prouvent que le code marche, la
  revue dit s'il est juste. Ce rituel a trouvé cinq défauts réels sur du code qui passait déjà
  222 tests et 100 % de couverture, dont trois pannes silencieuses.
- **Heures de publication** : je travaille pour mon employeur 9h-12h30 et 14h-17h30 (heure de Paris),
  et le dépôt est public. Dans ces créneaux, commite localement mais **demande avant de pousser**.
  En dehors, pousse et ouvre les PR sans demander. La **fusion**, elle, se demande toujours : elle
  déclenche un déploiement en production.
- Mets à jour docs/roadmap.md (statuts) au fil de l'eau, pas à la fin.
- Documentation et échanges en français ; identifiants, code et noms de fichiers en anglais.

## Ta mission cette session

**Commence par me faire trancher le bloc « Décisions » ci-dessous.** Pose-les-moi groupées, avec ta
recommandation, et n'attends pas mes réponses pour ce qui n'en dépend pas. Une fois D1 tranchée,
enchaîne dans cet ordre :

1. **D1 — fusionner la PR #10**, ou pas. Rien d'autre ne devrait avancer sur une branche qui diverge.
2. **P2-11 — la rédaction du contenu réel**, si D2 et D3 sont tranchées : tu as les deux versions du
   CV, tu peux en écrire l'essentiel toi-même. C'est le chemin critique de T1.

   Pour lire les PDF : l'hôte n'a pas `poppler-utils` et n'aura pas Node (ADR-0007). Passe par un
   conteneur jetable, comme tout le reste :

   ```bash
   docker run --rm -v "$PWD/public/resume:/cv:ro" -v "$PWD/.tmp:/out" debian:trixie-slim \
     sh -c 'apt-get -qq update && apt-get -qq install -y poppler-utils &&
            pdftotext -layout /cv/cv-fr.pdf /out/cv-fr.txt &&
            pdftotext -layout /cv/cv-en.pdf /out/cv-en.txt'
   ```

   Deux garde-fous : **mon téléphone et mon adresse e-mail n'entrent jamais dans `content/`** — ils
   relèvent de la page contact en Phase 10 —, et tu ne transposes que ce que le CV dit. Ce qu'il ne
   dit pas, tu me le demandes.
3. **PHASE 3 — Internationalisation** (P3-01 à P3-09), qui ne dépend d'aucune des deux.

Si je ne réponds pas, ouvre la Phase 3 et signale ce qui reste en attente. Ne simule jamais une
réponse à ma place.

---

## Décisions qui m'attendent

Format des réponses : « D1 oui, D2 …, défaut partout ailleurs » suffit.

**D1 🔴 — Fusionner la PR #10 ?**
Elle clôt la Phase 2. La fusionner **met le CV en ligne** (`/resume/cv-fr.pdf`, en `noindex`) et
redéploie le site. Le contenu d'amorçage, lui, n'apparaîtra nulle part : aucune page ne le consomme
encore. → *Recommandation : oui. La CI est verte, le rollback est prouvé, et laisser diverger une
branche de 12 commits coûte plus que de la fusionner.*

**D2 🔴 — `company` et `role` pour Augure et Askor ?**
Le CV les titre par leur **produit** (« AUGURE — PLATEFORME PRÉDICTIVE TEMPS RÉEL »), jamais par un
employeur ni un intitulé de poste. Le schéma exige les deux. Les deux sont par ailleurs donnés comme
en cours simultanément — c'est probablement juste, mais la page doit pouvoir l'expliquer.
→ *Sans réponse, je ne peux pas écrire les expériences : je refuse d'inventer un employeur.*

**D3 🔴 — Augure et Askor : expériences, projets, ou les deux ?**
S'ils sont les deux, la même information vit à deux endroits, ce que l'ADR-0001 interdit
explicitement. → *Recommandation : les deux en **expériences** ; les **projets** accueillent ce
portfolio et ce que je voudrai montrer pour lui-même.*

**D4 🟠 — Niveau (1 à 5) des ~40 technologies du CV ?**
→ *Recommandation : tu proposes un classement d'après la place qu'elles occupent dans mes
expériences, je corrige. C'est un jugement sur moi-même, il ne se délègue pas — mais il se corrige
vite, et il ne bloque pas.*

**D5 🟠 — Publier les chiffres du CV ?** (48 services, 151 modèles, 214 migrations, 27 outils)
Ils seront déjà dans le PDF public, mais une page HTML indexée n'a pas la même portée.
→ *Recommandation : oui — ce sont eux qui rendent une réalisation crédible.*

**D6 🟠 — Combien de compétences publier ?** Le CV en liste ~40 ; H-05 prévoyait 20 à 30.
→ *Recommandation : toutes celles du CV, `featured` sur une dizaine. La page les groupe par
catégorie, donc le volume ne nuit pas.*

**D7 🟢 — Rendre le paquet GHCR public ?**
Un PAT `read:packages` est posé sur le VPS pour tirer une image privée. À son expiration, les
déploiements s'arrêteront sans rapport apparent avec le code. → *Recommandation : oui, rendre le
paquet public supprime définitivement ce secret et son renouvellement ; le dépôt est déjà public et
l'image ne contient rien de plus.*

---

Puis : ouvre la PHASE 3 — Internationalisation (tâches P3-01 à P3-09, détaillées dans roadmap.md).

Objectif : `/fr/...` et `/en/...` résolus **indépendamment**, avec des métadonnées, un `hreflang` et
un sitemap qui ne mentent jamais sur ce qui existe réellement.

Trois points de méthode propres à cette phase :

- **P3-01 est déjà à moitié fait.** `src/i18n/locales.ts` existe depuis la Phase 2, la couche
  Content en dépendant. Complète-le (négociation, repli), ne le recrée pas.
- **`getContentLocales(type, slug)` existe déjà** et rend les locales où une entité existe vraiment.
  C'est la brique de P3-07 : aucun `hreflang` ne doit pointer vers une page inexistante (R-07).
  Le contenu d'amorçage contient exprès des entités traduites et non traduites.
- **Vérifie qu'aucune route ne peut se rendre à la demande** (`dynamicParams`) : `content/` n'est
  pas dans l'image de production. C'est une dette tracée en Phase 2 (`phase-2-log.md` §9.4), et
  c'est en Phase 3 qu'elle devient réelle.

P3-06 doit aussi confirmer la contrainte `seo → i18n, routing`, posée par défaut en Phase 1 et
jamais confirmée depuis.

Avant de coder, applique la méthode de phase : objectif, décisions à prendre, tâches, tests
correspondants, critères de sortie. Puis implémente par incréments.

Ne démarre PAS la Phase 4 tant que les critères de sortie de la Phase 3 ne sont pas tous
satisfaits : `/fr/projects/augure` et `/en/projects/augure` résolus indépendamment (prouvé par
test), aucun `hreflang` vers une page inexistante, sitemap exact, couverture ≥ 95 % sur `i18n` et
`routing`.

À la fin de la phase, produis un bilan : fait / dérives / reporté.

## Contexte de planning

Objectif : portfolio documentaire EN LIGNE début septembre 2026 (tranche T1 = Phases 1 à 4 +
P4-13 à P4-16). La 3D vient après, par incréments, sur le site déjà en ligne.
Le chemin critique n'est pas technique : c'est la rédaction du contenu (P2-11), à ma charge.

## Points encore ouverts

Aucun ne bloque la Phase 3. Ils sont listés parce qu'ils se rappelleront au mauvais moment si
personne ne les écrit.

- **P2-11, la rédaction du contenu réel, est le chemin critique de T1** et n'a pas commencé. Le
  format est figé, vérifié par `make check-content`, et deux règles d'écriture sont dans
  `content/README.md` — dont celle qui a déjà mordu : une valeur contenant `: ` doit être entre
  guillemets.
- **Le runtime MDX n'est pas encore dans l'image de production** (381 Mo, inchangée) : il y entrera
  avec la première page qui rend un corps, en Phase 4, pour environ 7 Mo. Le seuil bloquant est à
  400 Mo.
- **La liste blanche MDX n'est pas une barrière de sécurité** : MDX exécute du JavaScript sans passer
  par un composant, `content/` est donc du code. À reprendre tel quel à l'audit de la Phase 14.
- **`content/` n'est pas dans l'image de production** : aucune route ne doit pouvoir se rendre à la
  demande. C'est en Phase 3 que cette dette devient réelle.

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
- le bloc **Décisions qui m'attendent** : retirer celles qui ont été tranchées — en les reportant
  dans `phase-0-questions.md` ou dans un ADR selon leur portée — et y monter celles qui bloquent
  réellement la suite. Ce bloc n'a de valeur que s'il ne contient QUE des questions vivantes ;
- la liste des **ADR** si de nouveaux ont été créés ;
- la section **Ta mission cette session** ;
- les **points encore ouverts**.

Le reste est stable et n'a pas vocation à changer.
</content>
