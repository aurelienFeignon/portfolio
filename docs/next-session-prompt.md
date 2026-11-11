# Prompt de reprise — session suivante

> À copier-coller tel quel dans une nouvelle session Claude Code ouverte **à la racine du dépôt**.
> Mettre à jour la section « État » à chaque fin de tâche.

---

```text
Tu reprends le développement de mon portfolio de développeur Full-Stack.
Répertoire de travail : **la racine de ce dépôt**, où que tu la trouves.

⚠️ Ne suppose pas un chemin. Ce prompt a longtemps annoncé
`/home/aurel/projects/portfolio` ; sur une autre machine le dépôt est ailleurs, et une session
ouverte au mauvais endroit relit un autre projet en silence — c'est arrivé, et le rapport était
crédible de bout en bout. Constate le chemin (`git rev-parse --show-toplevel`) au lieu de le croire.

## Avant toute chose

Lis, dans cet ordre, et ne me demande pas de te les résumer :

1. docs/roadmap.md            ← source de vérité des tâches et des statuts, commence par « Jalons »
2. docs/vision.md             ← vision, contraintes, risques, hypothèses
3. docs/architecture.md       ← architecture, Docker, déploiement VPS
4. docs/adr/README.md         ← index des décisions + journal des révisions
5. docs/testing-strategy.md   ← ce qui est testé, comment, seuils de couverture
6. docs/performance-budget.md ← budgets chiffrés
7. docs/phase-0-questions.md  ← ce qui est tranché et ce qui reste ouvert
8. docs/phase-1-log.md        ← journal de la Phase 1
9. docs/phase-2-log.md        ← journal de la Phase 2
10. docs/phase-3-log.md       ← journal de la Phase 3 : ce que l'exécution a renversé, dette tracée
11. docs/phase-4-log.md       ← journal de la Phase 4, CLOSE. Long, et c'est voulu : §13 à §23
                                 portent les défauts déjà livrés qu'elle a trouvés, les arbitrages
                                 tranchés, et ce que chaque tâche refuse d'affirmer.
12. docs/phase-5-log.md       ← journal de la Phase 5, CLOSE. §10 porte le bilan et le seul relevé
                                 comparatif de Core Web Vitals du projet.
12bis. docs/carte-mere.md     ← ⭐⭐⭐ LA CARTE MÈRE, la scène en production : conception (D14), génération
                                 par `make board` (§12), mesures (§11, §12.5).
12ter. docs/nexus-prototype.md ← NEXUS, la scène retirée le 2026-10-31 : historique, mais §6 (l'enquête
                                 de performance) reste la meilleure lecture sur la mesure de la scène.
13. docs/phase-6-log.md       ← journal de la phase CLOSE. §3 porte les arbitrages
                                 d'ouverture, §5 l'ordre de travail et ses deux écarts assumés.
14. deploy/README.md          ← exploitation réelle du serveur : déploiement, rollback, journaux,
                                 checklist de mise en ligne (§8) et vérification publique (§9)
15. content/README.md         ← règles d'écriture du contenu, et deux réserves à corriger

Les Phases 0 à 4 sont TERMINÉES et validées. Ne les refais pas, ne les rediscute pas.

## État

Phases 0 à 4 : **DONE** — le jalon T1 est atteint, le portfolio documentaire est en ligne,
supervisé, avec une checklist de mise en ligne et un rollback rejoué.
**Phase 5 (Fondation Three.js) : CLOSE**, 10 tâches sur 10 — P5-10 close le 2026-10-23 avec #58.
**Phase 6 (Navigation spatiale) : CLOSE** le 2026-10-27, 12 tâches sur 12 — `phase-6-log.md` §11
et §12.
**Phase 7 (Interfaces de lecture)** : **toutes les tâches livrées** (P7-03 à P7-08, P7-01/02 abandonnées) ;
**CLOSE le 2026-10-29** — critère CWV mesuré (`performance-budget.md` §6.4) et tenu par
arbitrage **D13** ; l'écart de LCP mobile introduit par #58 s'est révélé un artefact de Lantern
(**P11-11**, `performance-budget.md` §6.5).
**Phase 8** : ⭐⭐ **D14 (2026-10-29) — la carte mère remplace la composition NEXUS** :
[`carte-mere.md`](./carte-mere.md), trois plans, **tous livrés** : P8-13 contenu (#84), P8-14 plan de carte (#85),
P8-15 génération et rendu (#86, 2026-10-31). ⭐⭐ **La carte mère est en production depuis le 2026-10-31** :
`make board` régénère `src/scene/generated/board-plan.<locale>.json` depuis les MDX (une liaison perdue
fait échouer la commande, donc le build), et la scène ne fait que le dessiner. NEXUS est retiré.
⚠️ **Ce qui suit sur NEXUS est historique** (en production du 2026-10-23 au 2026-10-31, #58, `854d1fe`) — D11 : le bureau 3D est
remplacé par un noyau numérique et trois univers, avec navigation hybride et `ReadingPanel` en verre
lumineux. Pour l'historique, `docs/nexus-prototype.md` §6 (enquête de performance). Les Phases 7 à 9 sont réorientées dans la roadmap.
**Tout ce qui suit est fusionné sur `main` et déployé**, les cinq jobs verts à chaque fois —
publication GHCR et déploiement VPS compris.

### Dernière reprise — 2026-11-11

Session « dettes ouvertes » : branche `fix/dettes-ouvertes-2026-11-11`. Elle traite le healthcheck
de dev, `deploy.sh` face à une coupure SSH, la détection d'un déploiement manquant,
`getFeaturedProjects` et la confrontation du `BreadcrumbList` (détail dans « Points encore
ouverts »). ⛔ Elle a découvert que **la production ne se déploie plus depuis le 2026-11-10**
(jeton GHCR refusé, D6). Vérifier la PR, sa CI et sa fusion avant toute suite.

### Reprise précédente — 2026-11-03

La mise à jour précédente du prompt est fusionnée : **#97, `a873086`**, présente dans le `main`
local au relevé du 2026-11-03. Ne plus demander de vérifier la fusion de sa branche.
Le déploiement distant de ce commit n'a pas été vérifié lors de ce nettoyage : lire la CI et
l'état servi avant de tirer une conclusion sur la production (procédure ci-dessous).

Les détails des Phases 5 et 6 closes sont dans leurs journaux ; les mesures de NEXUS sont
historiques. La scène actuelle est la carte mère, documentée dans `carte-mere.md`.

### ⛔⛔ Ce qui fait foi pour juger d'un déploiement

**Le site est volontairement FERMÉ au public**, derrière Cloudflare Access (OTP par e-mail), et le
restera tant que le portfolio n'est pas terminé. **Une requête anonyme reçoit une 302 vers
`cloudflareaccess.com` : ce n'est PAS une panne**, et cela y ressemble beaucoup. Ce qui fait foi est
la conclusion du workflow — les cinq jobs, publication GHCR et déploiement VPS compris :

```bash
gh run list --branch main --workflow ci.yml --limit 1
```

⭐ Les cinq jobs ne sont verts que sur un run **`push` sur `main`** : sur une PR, `publier sur GHCR`
et `déployer sur le VPS` sont **`skipped`** par construction (`deploy/README.md` §8.1).

⭐ **P4-16 a été faite dans une fenêtre ouverte exprès** : Access levé le 2026-08-20 le temps de la
mesure, puis refermé le jour même à la demande de l'exploitant. Les relevés sont en
`deploy/README.md` §9 — 14 URL sans écart, Lighthouse contre le site réel. ⛔ Ne redemande pas cette
levée sans raison : elle rend le portfolio publiquement visible, et c'est une décision de mise en
ligne, pas une étape technique. `make check-public-seo` échoue en **nommant** la fermeture, ce qui
n'est pas un défaut.

⭐ **Une exception depuis P4-14** : `/robots.txt` porte une application Access en **Bypass**, pour que
la sonde atteigne l'origine (`deploy/README.md` §7.2). C'est le seul chemin public — vérifié URL par
URL, tout le reste rend toujours 302.

### Ce que le site coûte aujourd'hui

| Relevé | Valeur | Seuil |
|---|---|---|
| Chunk 3D, socle partagé, JS par route | chiffres courants en **un seul endroit** : [`performance-budget.md`](./performance-budget.md) §4.5 | — |
| Image de production | **281 Mo** | cible 250 · bloquant 400 |
| Tests | **1346** verts (2026-11-03, après enrichissement du contenu) ; couverture de `src/scene/state` : **100 %** sur les quatre axes (2026-10-31, après le retrait de NEXUS et de `closeUp`). Le chiffre global du dépôt n'a pas été relevé | ≥ 80 % |
| E2E | **185** sur 5 profils (2026-11-02, contre l'image de production ; `panel-during-transition` et `content-once` échouent parfois sous la charge de la suite complète, verts en isolé) | — |
| **Ce que le GPU rend** | carte mère, **les quatre vues**, 2026-11-02 (RTX 5050 Laptop) : **19** draw calls · **28 658** triangles · 11 programmes, identiques d'une vue à l'autre (la carte est dessinée entière) ; premier relevé mobile le 2026-11-03, voir `carte-mere.md` §12.5 | ≤ 60 / ≤ 150 000 |
| **TBT de la scène** (panneau `?debug=scene`, Accueil, production) | **0 ms** sur les quatre vues, 0 tâche longue, 1re image 416 à 495 ms (2026-11-02, après #95 ; 185 ms avant) | — |

Les anciens relevés de bundle et du bureau 3D sont conservés dans `phase-5-log.md` et
`performance-budget.md`. Pour comparer des versions, vérifier la date, la scène et la méthode
(notamment la somme des chunks 3D depuis la séparation du panneau de diagnostic).

⛔ **Le profil `no-js` n'est plus vrai *par construction*** : il l'est **par vérification**. Les
frontières d'erreur sont des composants client, et c'est tout le JavaScript applicatif du site.

⚠️ **Le site dépend d'un drapeau expérimental** : `experimental.globalNotFound` (Next 16.3) pose le
plancher qui donne un `lang` aux voies que le proxy n'atteint pas. Sa stabilisation — ou son retrait —
est un déclencheur de réexamen ; un parcours garde l'effet, donc le retrait se verrait.

### ⭐⭐⭐ Les sept leçons que la Phase 4 a payées, et qui valent pour la suite

Le détail est dans `phase-4-log.md` — ici, seulement ce qui se transporte.

1. **Une affirmation sur le monde que rien ne confronte au monde finit fausse.** Les six défauts déjà
   livrés qu'a trouvés cette phase ont tous cette forme : une liste d'exceptions écrite
   d'imagination, une heuristique de forme là où seul le disque sait, une base d'URL non déclarée,
   un composant sans style qu'aucun garde ne mesurait.
2. **Lis la sortie des outils.** Deux des pires défauts y étaient écrits en toutes lettres — un
   avertissement `metadataBase` au build, un rapport de couverture qui nommait ses fichiers.
3. **Un nombre recopié et jamais remesuré finit par décider seul**, et **une liste écrite de mémoire
   vieillit plus vite qu'un nombre**. Remesure les deux.
4. **Un test neuf doit être vu rouge avant d'être cru** — et un harnais de mutation qui ne vérifie
   pas que le build a réussi déclare « survivant » ce qu'il n'a jamais exécuté. ⭐ Une mutation peut
   aussi survivre **à bon droit** : interroge la mutation avant le test.
5. **Un garde ne couvre que la dimension qu'on lui a donnée.** Un audit d'accessibilité ne voit que
   les pages qu'on lui nomme ; un `Record<Type, …>` ne voit pas le disque ; un garde qui lit du texte
   source lit **tout** le texte source, commentaires compris. Dérive le périmètre, ne l'énumère pas.
6. **`/code-review` puis `/simplify` avant chaque push, sans exception.** Sur les six dernières
   tâches ils ont trouvé **plus de trente défauts réels** sur du code dont tous les gates étaient
   verts — dont plusieurs régressions introduites par la tâche même qui les corrigeait. En P4-14, la
   revue a posé la question qui a produit la leçon 7.
7. **Un intermédiaire change ce qu'un code de retour SIGNIFIE** (P4-14). Conteneur de production
   arrêté, `/robots.txt` rend **200 quand même** : Cloudflare compose la réponse à sa périphérie. Un
   contrôle jugé sur le statut aurait été vert sur un site éteint. Dès qu'un CDN, un proxy ou un
   cache peut répondre à la place de l'origine, juge sur quelque chose que **seule l'origine** peut
   produire.

## Décisions déjà prises — ne pas les rejouer

ADR-0001  Markdown/MDX = source de vérité unique, Content Layer pur TS validé par Zod
ADR-0002  Le routeur Next.js est la source de vérité de la navigation ; la scène suit l'URL
          **amendé le 2026-08-26 (P6-03)** : `getRouteForScreen` prend un `SceneFocus`, les quatre
          états — restreinte aux trois écrans, elle ouvrait une seconde porte
ADR-0003  Three.js = enrichissement progressif, 4 paliers de capacité
ADR-0004  Contenu des écrans = DOM superposé, instance unique déplacée par portail React
ADR-0005  i18n sans bibliothèque, dictionnaires TS, contenu localisé par fichier
ADR-0006  CV : Server Action + Mailjet (API Send v3.1 via fetch natif, ZÉRO dépendance)
ADR-0007  Environnement de développement 100 % dockerisé
ADR-0008  Auto-hébergement VPS — **amendé le 2026-08-14** : `SITE_URL` est un argument de build
ADR-0009  Compilation MDX par @mdx-js/mdx appelé directement (next-mdx-remote = repli désigné)
ADR-0010  CSS Modules + tokens en variables CSS (P4-01) — décidé sur une exécution
ADR-0016  `three` + React Three Fiber + drei, **drei importé composant par composant** (P5-02)

⭐ Le saut de 0010 à 0016 est délibéré : 0011 à 0015 sont **réservés** à des décisions déjà
planifiées, dont l'une est nommée par la tâche P8-01. Un numéro réservé ne se reprend pas.

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
- Petits incréments : une tâche → implémentation → test → validation.
- Ne jamais supprimer ni affaiblir un test pour verdir la suite sans justification fonctionnelle.
- **Un test ne nomme jamais une entité de `content/`** : le contenu m'appartient et changera. Un E2E
  qui codait `/fr/projects/augure` en dur a cassé le jour où Augure est devenu une expérience ; il
  déduit désormais son entité du sitemap. Les tests unitaires, eux, lisent des fixtures — jamais
  `content/`, et un garde-fou permanent le vérifie.
- Les identifiants de tâches (P1-01…) sont stables et ne sont JAMAIS réutilisés.
- Aucune dépendance structurante sans justifier : problème / pourquoi adaptée / alternatives /
  pourquoi préférée. Écris-le dans un ADR si la décision est structurante.
- **Avant CHAQUE push : `/code-review` puis `/simplify`**, et traite les retours avant de pousser,
  pas après. Sur la Phase 3, ce rituel a trouvé cinq défauts réels et un trou de vérification que
  personne n'avait identifié.
- **Heures de publication** : je travaille pour mon employeur 9h-12h30 et 14h-17h30 (heure de Paris),
  et le dépôt est public. Dans ces créneaux, commite localement mais **demande avant de pousser**.
  En dehors, pousse et ouvre les PR sans demander. La **fusion**, elle, se demande toujours : elle
  déclenche un déploiement en production.
- Mets à jour docs/roadmap.md (statuts) au fil de l'eau, pas à la fin.
- Documentation et échanges en français ; identifiants, code et noms de fichiers en anglais.

## Ta mission cette session

**Priorité convenue le 2026-11-03 : nettoyer ce prompt, puis recueillir le retour de l'utilisateur
sur son téléphone pour avancer vers la clôture de la partie carte mère.** Une première capture téléphone a été reçue le 2026-11-03 (`carte-mere.md` §12.5) ; son contexte et
le retour d’usage restent à compléter. Aucune clôture mobile ni validation visuelle ne doit être anticipée.

### Acquis — ne pas refaire

- Carte mère livrée : P8-13 (#84), P8-14 (#85), P8-15 (#86).
- P8-08 **DONE** : contrastes corrigés et gardés par test (#93, `carte-mere.md` §9).
- Tâche longue de l'accueil soldée sur le bureau mesuré : #94 corrige la précompilation d'une
  scène vide, sans gain mesuré ; #95 étale la première lecture des programmes. Le relevé après
  déploiement (#96) confirme le résultat sur la machine de l'utilisateur (`carte-mere.md` §12.5).
- P8-10 : cible de draw calls tenue par construction et confirmée sur ce bureau ; pas
  d'optimisation supplémentaire justifiée sur cet appareil. P8-11 reste ouverte pour les appareils
  non couverts. Le banc SwiftShader ne permet pas d'affirmer un gain sur un GPU réel.

### Livraison de cette session

L'utilisateur a demandé la mise à jour du prompt et le push le 2026-11-03.
Branche de livraison : `content/projets-competences-2026-11-03`. Vérifier la PR et sa CI avant
toute suite ; la fusion et le déploiement ne sont pas encore établis.

Accès au serveur de développement sur cette machine : `http://localhost:3002/fr`, via
la surcharge locale `/tmp/portfolio-preview-port.yml` (hors dépôt). Le port 3000 est occupé
par un autre processus ; ne pas utiliser `make up` seul en supposant qu'il est libre.

### Suite et conditions de clôture

**Ordre précisé par l'utilisateur le 2026-11-03 : terminer le contenu, puis faire une repasse
visuelle.** Le rendu sur Xiaomi 14T Pro sous Chrome ne lui convient pas vraiment. Ne pas
présenter P8-05 comme validée ni lancer la repasse avant la fin du contenu. Le travail de contenu engagé porte sur les expériences et les projets : PHP ajouté, Codex et OpenCode ajoutés aux outils aux côtés de Claude Code,
fiches Hephaistos 3D, Dedale et exploration NCM créées en français et en anglais, expériences
Askor/Augure et fiche portfolio enrichies. **Cet incrément de contenu est validé par
l'utilisateur le 2026-11-03**, avec les liens vers les dépôts publics et les compétences PHP,
Codex et OpenCode. Cela ne vaut pas validation du rendu visuel ni clôture de la Phase 8. NCM distingue le travail local du fork public ; Dedale est privé.
Les fiches rendent désormais `links.repository` avec un lien traduit vers GitHub lorsque
ce champ est renseigné : portfolio, Hephaistos 3D et fork NCM. Ne renseigner ce champ que pour
un dépôt public ; Dedale, Askor et Augure restent sans lien de code public.
Ne pas supposer que la Phase 10 (envoi du CV) équivaut à finaliser le contenu.

Direction visuelle retenue pour la future repasse : panneaux sombres à fine bordure cyan,
badge monospace et hiérarchie typographique inspirés de la référence fournie ; pas de CTA
dans ces blocs, la navigation étant déjà présente dans le header.

Les relevés GPU du 2026-11-02 et du téléphone précèdent cet enrichissement du contenu :
ils portent sur trois projets. La carte régénérée en porte six ; ne pas lui attribuer ces
anciens chiffres sans nouveau relevé.

1. **P8-11 — compléter le retour sur téléphone réel.** Première capture reçue le 2026-11-03 :
   Xiaomi 14T Pro sous Chrome, GPU Mali-G720-Immortalis MC12, sans compilation parallèle ; relevé transcrit dans
   `carte-mere.md` §12.5. Ne pas redemander les valeurs déjà visibles ; recueillir le contexte
   manquant et le ressenti, puis les autres vues si nécessaire.
   Utiliser le site avec `?debug=scene`, dans une nouvelle fenêtre privée, et préciser :
   modèle du téléphone, système, navigateur, URL et version servie si disponible.
   Relever à l'accueil le palier (`lite`/`full`/`none`), la première image, les tâches longues/TBT
   si disponibles, les appels, triangles et programmes ; puis parcourir Expériences, Projets,
   Compétences et une fiche. Signaler chargement, saccades, lisibilité et navigation.
   Une valeur absente du panneau est **non disponible**, jamais zéro. Si la scène ne monte pas,
   relever le palier et vérifier le contenu documentaire : cela ne mesure pas la performance 3D.
   Consigner le retour et ses limites dans `carte-mere.md` §12.5 avant de mettre à jour la roadmap.
   Un téléphone ne couvre pas à lui seul tous les GPU intégrés et Safari : nommer ce qui reste
   non mesuré et expliciter l'arbitrage si une clôture avec couverture partielle est proposée.
2. **P8-05 — repasse visuelle après finalisation du contenu**, puis validation par l'utilisateur.
   Le rendu actuel ne lui convient pas vraiment ; tâche reportée, toujours ouverte.
   Recueillir aussi les arbitrages de `carte-mere.md` §12.6 : vide sous Expériences, aspect des
   ponts, affinité des emplacements de processeurs, impulsions immobiles au palier `lite`.
   Ne pas trancher ces choix à sa place.
3. **Bilan de clôture.** Après les retours, corriger les défauts observés si nécessaire,
   vérifier les critères de sortie de la Phase 8 et mettre à jour ensemble la roadmap, les
   mesures et ce prompt. Distinguer tâches terminées, arbitrages acceptés et couverture restante.
   La Phase 8 reste **IN_PROGRESS** tant que ce bilan n'est pas établi.

**En parallèle, indépendant de la 3D : Phase 10 (envoi du CV), à commencer par P10-11**, vérification
des prérequis d'expédition.

**Décision ultérieure — Phase 9 :** faire choisir à l'utilisateur la forme des destinations CV,
GitHub, LinkedIn et « à propos » dans la carte mère ; les objets du bureau et NEXUS sont retirés.

**Cloudflare Access :** la fermeture a été demandée par l'exploitant après la fenêtre de mesure
P4-16 (`deploy/README.md` §9). Ne pas reposer « voulu ou non ? » sur la seule base du constat
historique de 302 ; vérifier l'état actuel uniquement si la tâche l'exige. Toute ouverture publique
reste une décision de l'utilisateur.

Les détails des tâches closes et leurs leçons restent dans les journaux des Phases 4 à 6,
les ADR et `nexus-prototype.md` pour NEXUS. Les dettes actives sont regroupées dans « Points encore
ouverts » ci-dessous. Ne pas reprendre les anciennes missions de ces journaux comme des tâches actuelles.

## Décisions qui m'attendent

Format des réponses : « D2 = …, défaut partout ailleurs » suffit. Aucune ne bloque la suite.

⭐ **Ce bloc ne contient QUE des questions vivantes**, et c'est ce qui lui donne sa valeur. Les
décisions tranchées sont reportées dans `phase-0-questions.md` ; elles n'ont plus à être lues ici.
**Closes : D1, D3, D4, D7** (le 2026-08-16 pour les deux dernières), **D9 et D10** (le 2026-08-20),
**D11** (le 2026-08-25, « laisser » — `phase-5-log.md` §6.7), **D13** (le 2026-10-29, critère CWV
de la Phase 7 tenu), **D8** (le 2026-10-29 : les fiches projet Augure et Askor, #84), **D14** (le
2026-10-29, la carte mère). **D5 et D12 sont sans objet** depuis que le bureau est retiré (D11 de la
Phase 8, puis D14) : retirées du bloc.

**D2 🟠 — Relire les 43 niveaux de compétence (1 à 5).** *La seule qui ait un effet visible : les
niveaux **ne sont ni affichés ni publiés** tant que tu ne les as pas relus.* Les publier afficherait
comme un fait une auto-évaluation que personne n'a validée, et **deux gardes le tiennent** — le
contrat de `SkillGroup`, qui ne porte que `{ slug, name }`, et un parcours sur le JSON-LD.
→ *Dis-moi seulement ceux qui te paraissent faux. Dix compétences sont `featured` : TypeScript,
Python, Node.js, React, Next.js, PostgreSQL, Docker, microservices, architecture événementielle,
intégration de modèles de langage.*
✅ Arbitré le 2026-10-30 pour la carte mère : voir `carte-mere.md` §12.1 (puces de taille égale tant que D2 est ouverte, paramètre du générateur) et `phase-0-questions.md` (D2).

**D6 🔴 — Rendre le paquet GHCR public ?** *(devenue bloquante le 2026-11-10 : le jeton du VPS est
refusé, plus rien ne se déploie — voir « Points encore ouverts »)* *(action manuelle, je n'ai pas les droits)* → *GitHub →
Packages → portfolio → Change visibility → Public. Puis sur le VPS : `docker logout ghcr.io && rm
/srv/portfolio/.ghcr-token`, et retirer le `docker login` de `deploy.sh`. Bénéfice : plus de PAT à
renouveler, donc plus de déploiement qui s'arrête un jour sans rapport apparent avec le code.*

## Contexte de planning

Objectif : portfolio documentaire EN LIGNE début septembre 2026 (tranche T1 = Phases 1 à 4 +
P4-13 à P4-16). La 3D vient après, par incréments, sur le site déjà en ligne.
Le chemin critique — la rédaction du contenu — est **levé** depuis le 2026-08-15.

## Points encore ouverts

⛔⛔ **Ce fichier a longtemps porté le tableau de mesures DEUX fois**, et les deux copies avaient
divergé — sous un titre qui disait « chiffres à jour, remesurés ». Il n'y en a plus qu'un, en tête.
**Remesure-le avant de t'y appuyer** : `make bundle`, `make check-image-size`, `make coverage`.

⛔⛔ **Le JS par route valait 7,3 Ko dans cinq documents, et il en mesure 8,2** (remesuré en P4-12,
sur un artefact identique à celui de `main` — cette branche ne touchait pas `src/`). Le budget n'est
pas en cause (cible 25, bloquant 40) ; le chiffre l'était. P4-07 et P4-08 l'avaient **mesuré**, puis
trois tâches ont écrit « inchangé » de suite. **D'où vient l'écart n'est pas établi** — le trancher
demanderait de rejouer `make bundle` sur trois commits.

⛔ **L'image dépasse la cible de 250 Mo depuis toujours**, et rien ne le disait avant que le gate ne
porte les deux paliers. `performance-budget.md` §7.1 tranche : ne rien changer, aucune image Node
officielle n'atteint 250 Mo.

**Dettes nommées, par ordre d'urgence :**

- ⚠️ **Le conteneur de développement FUIT — la fuite est BORNÉE depuis le 2026-09-24, pas corrigée.**
  Relevée le 2026-09-23 par la session qui instruisait la récidive NVMe du homeserver :
  `portfolio-web-1` tournait en `pnpm dev` **sans aucune limite mémoire**, et écrivait en continu
  dans le swap du SSD dont le contrôleur a gelé deux fois.
  ⚠️ **Non établi, et à ne pas affirmer** : que la fuite ait *causé* ces gels. Elle ajoute une charge
  d'écriture continue et inutile — c'est tout ce qui est démontré.

  ✅ **Fait et fusionné** (#52, 2026-09-24) : `mem_limit` **et** `memswap_limit` sur le service
  `web`. ⭐ **Les chiffres, le raisonnement et les contrôles vivent dans `docker-compose.yml`**, à
  l'endroit où la valeur est écrite — ne pas les recopier ici. Les portes de `make ci` qui passent
  par ce service (`lint`, `typecheck`, `coverage`, `bundle`) ont été rejouées **sous la borne** :
  les quatre sortent en 0.
  ⭐ Ce service n'est **que** l'environnement de développement : `docker-compose.prod.yml` est
  intact, et le site en ligne n'est pas concerné.

  ⛔ **Ce qui RESTE ouvert, et qu'une borne ne règle pas :**
  1. ✅ Remède d'attente appliqué le 2026-11-11 : `healthcheck` de dev à 30 s une fois sain
     (`start_interval` de 5 s au démarrage, pour ne pas ralentir `e2e`), ~290 Mo/jour au lieu de
     ~1,7 Go. ⚠️ **La cause racine reste ouverte** — qui retient les tampons de `next dev` (piste
     Next/Turbopack, à signaler en amont) : voir le commentaire du service `web`.
  2. **Ne pas le faire tourner en permanence** — `make up` à la demande, `make down` après. C'est une
     habitude à prendre, pas un correctif à écrire : l'étage `dev` porte `CMD ["pnpm", "dev"]`, donc
     le conteneur sert un serveur de développement tant qu'il vit, même quand personne ne développe.

- ✅ ~~La confrontation manifeste ↔ sitemap~~ — **faite en P4-07**, et autrement que prévu : les
  listes générées sont confrontées **aux pages réellement prégénérées**, pas au sitemap. Il y a trois
  énumérations, dont deux dérivées ; comparer deux dérivées produit un message qui accuse celle qui
  n'a pas tort. Le gate porte **six contrôles**, tous vus rouges.
- ✅ ~~Cinq fichiers non couverts~~ — **soldé en P4-10**, couverture 100 %.
- ⚠️ **`experimental.globalNotFound` est un drapeau expérimental** de Next 16.3, et le site en dépend
  depuis P4-10 pour que les voies hors du proxy déclarent leur langue. Sa stabilisation — ou son
  retrait — est un déclencheur de réexamen ; un parcours garde l'effet, donc le retrait se verrait.
- ⛔⛔ **Lighthouse est un critère de SORTIE de la Phase 4 que rien ne mesure** (relevé en P4-12) :
  « mobile ≥ 85 / a11y 100 / SEO 100 » n'apparaît que dans quatre documents, et aucun gate ne produit
  de score. C'est le défaut du seuil de 400 Mo que P4-05 avait découvert **en s'y référant**.
  **Arbitrage du 2026-08-16 : porté par P4-13 et P4-15**, la mesure se faisant contre le site
  déployé. La phase ne peut pas se déclarer close sans ce relevé.
- ✅ **`BreadcrumbList` confronté à la navigation visible le 2026-11-11** : même hiérarchie
  (site → section → fiche) que les retours des `ReadingPanel`, feuille = `h1` de la page. Seul écart,
  assumé : la racine se nomme « Aurélien Feignon » dans le fil, « Vue d'ensemble » sur le retour
  visible des sections — le nom du site, pas un libellé de bouton. Aucun changement de code.
- ⚠️ **Une CSP stricte supprimerait les blocs `ld+json` en silence** — note dans
  `src/seo/json-ld.ts` pour l'ADR-0015 (Phase 14) : il faudra un `nonce` ou un condensat.
- ✅ **Les six arbitrages de P4-07 et P4-08 sont TRANCHÉS** (2026-08-16, `phase-4-log.md` §14.8) :
  garder les deux frontières d'erreur, garder le monogramme d'attente, laisser `og:type` à
  `website`, laisser l'`og:image` sans condensat, laisser `/favicon.ico` nu en 404, ne rien changer
  aux 273 Mo. **Ne les repose pas** — chacun porte sa condition de réouverture.
  ⚠️ Ils ont été posés **après la fusion**, parce qu'ils étaient consignés en prose au lieu d'être
  présentés comme une liste de décisions. **Une tâche qui produit des arbitrages les pose au moment
  où ils naissent.**
- ⚠️ **Le sélecteur de langue est rendu par chaque page**, à l'intérieur du `main` — inhabituel pour
  une commande de portée globale. Ses options dépendent de la page, donc un layout ne peut pas le
  rendre. Choix de gabarit, à trancher.
- **`EntityList` ne sert plus qu'aux projets** ; les expériences et les compétences ont leur
  composant. Il reste parce qu'un projet n'a qu'un titre et un résumé, pas parce qu'il est générique.
- ✅ **`getFeaturedProjects` retiré le 2026-11-11** (aucun appelant de production). ⚠️ Le drapeau
  `featured` d'un **projet** reste porté par le contenu et validé, mais rien ne le lit : à rebrancher
  quand une vue en aura l'usage. Celui des compétences est lu (`knowsAbout`, P4-09).
- **La liste blanche MDX n'est pas une barrière de sécurité** : à reprendre tel quel à l'audit de la
  Phase 14.
- **Mesure CPU en régime stable** (P11-08) : le seul relevé date d'une minute après démarrage — 32 %,
  au-dessus du seuil d'alerte de 25 %. Ce n'est pas une mesure valide.
- ✅ **`workflow_dispatch` dans `ci.yml` depuis le 2026-10-29** : rattrapage par `deploy/README.md`
  §8.4, et plus d'annulation des runs de `main` (raison dans `ci.yml`).
- ⚠️ **`deploy.sh` survit à une coupure SSH depuis le 2026-11-11 — DANS LE DÉPÔT** (`HUP`/`PIPE`
  ignorés, sortie vers `/srv/portfolio/deploy.log`, verrou `flock`), éprouvé sur un banc simulé
  (`deploy/README.md` §3.3). ⛔ **Pas encore installé sur le VPS** : la copie qui s'exécute est
  `/srv/portfolio/deploy.sh`, à remplacer à la main après fusion.
- ✅ **Un déploiement manquant se voit depuis le 2026-11-11** : l'image sert `X-Source-Revision` sur
  `/robots.txt`, et la sonde planifiée exige la tête de `main` une heure après sa fusion
  (`deploy/README.md` §7.3 bis). Rejouée contre la production : elle crie sur l'incident ci-dessous.
- ⛔⛔ **Production bloquée sur `9e5fe91` depuis le 2026-11-10** : les déploiements de #100 (`fe06017`) et #103 (`d8b084c`)
  ont échoué au `docker pull` (`error from registry: denied`) — le jeton GHCR du VPS ne donne plus
  accès. C'est exactement ce que D6 annonçait. **Action de l'utilisateur** : renouveler le jeton (ou
  trancher D6), puis rattraper par `deploy/README.md` §8.4. Tant que ce n'est pas fait, la sonde
  sera rouge à chaque passage après la fusion du contrôle de révision.
- **Procédure de restauration du serveur** (R-23) : Hetzner restreint par intermittence la création
  d'instances. À écrire sous cette contrainte en Phase 15.
- **Plages Cloudflare** : un timer hebdomadaire les rafraîchit sur le VPS.
  `sudo /srv/edge/sync-cloudflare-origin-firewall.sh --check` sort en 1 s'il y a dérive.

**Pièges d'environnement rencontrés, à ne pas redécouvrir :**

- ⛔ **`make e2e-prod` ne peut pas tourner sans contournement sur cette machine** : Grafana occupe
  `127.0.0.1:3001`, que `docker-compose.prod.yml` publie en dur. Surcharger le port avec
  `ports: !override` — une surcharge de `ports` est **fusionnée** par défaut, donc `ports: []` ne
  libère rien.
- ⛔ **Une PR empilée sur une autre branche ne déclenche pas la CI** (le workflow ne se lance que sur
  les PR visant `main`), et **elle peut se fusionner dans une branche déjà morte** : c'est arrivé à
  #18, dont le travail n'a jamais atteint `main` malgré un « merged » vert. Pousser sur `main` ou
  attendre la fusion — ne pas empiler.
- ⛔⛔ **`composes` de CSS Modules ne se propage pas en chaîne.** `.b { composes: .a }` ne rend pas
  le `composes: x from './x.css'` que `.a` porte : le CSS servi n'a pas la classe externe. Composer
  explicitement. Trouvé en P4-11, dans le commit qui corrigeait le défaut que cela recréait.
- ⛔⛔ **Un harnais de mutation qui ne vérifie pas que le build a réussi** déclare « survivant » ce
  qu'il n'a jamais exécuté : la mutation casse la compilation, le banc tourne contre l'image
  précédente, et passe au vert. Contrôler le code de sortie du build **avant** de conclure.
- ⛔ **`git checkout --` ne restaure pas un fichier non suivi.** Une mutation appliquée à un fichier
  neuf y reste après la « restauration ». Relire `git status` plutôt que supposer l'arbre propre.
- ⚠️ Un `*/` dans un chemin écrit en commentaire **ferme le bloc JSDoc**. Deux fichiers s'en sont
  cassés.
- - ⛔⛔ **Playwright sort en 1 sur « No tests found ».** Un filtre `-g` qui ne correspond à rien — une
  apostrophe droite là où le titre porte une apostrophe typographique suffit — est alors lu comme un
  test en échec. Un harnais de mutation doit vérifier que son filtre **sélectionne** quelque chose
  avant de conclure. Trouvé en P4-12, sur sa première mutation.
- ⚠️ **`pnpm build` régénère `src/routing/route-manifest.ts`** avant `next build`. Le générateur rend
  la forme déjà passée par Prettier — sans quoi chaque build salissait l'arbre de travail — et un
  test compare octet à octet le fichier committé à ce que produirait le générateur aujourd'hui.
- ⚠️ **Les types de routes générés par Next périment `tsc`** après l'ajout d'un layout : `make
  typecheck` échoue sur `.next/dev/types` tant qu'un build n'a pas eu lieu. Reconstruire, pas
  débugger.
- ⚠️ **`next-env.d.ts` est VERSIONNÉ et il OSCILLE** : il importe `./.next/dev/types/…` après un
  `make up`, `./.next/types/…` après un `make build` ou `make bundle`. Il ressort donc modifié d'une
  tâche sur deux, sans que personne l'ait touché. **Ne pas le committer** au fil de l'eau — ce serait
  un aller-retour permanent selon la dernière commande lancée. Relevé en P5-09.
- ⛔⛔ **Un `str.replace` dont le motif ne correspond pas ne dit RIEN** et rend le fichier inchangé.
  P5-08 l'a payé deux fois, dont une où **les tests sont restés verts** — ils attendaient exactement
  ce que l'ancien code produisait, et seul ESLint a signalé quelque chose. Toute édition scriptée doit
  porter une assertion (`assert s != avant`) ou passer par un index de ligne vérifié. C'est le mode de
  panne que ce fichier dénonce déjà pour lui-même.
- ⚠️ **`.next` vit dans un volume Docker nommé**, pas sur l'hôte : `ls .next/…` depuis le dépôt rend
  « No such file or directory », ce qui ressemble à un build absent. Passer par le conteneur
  (`docker compose run --rm web sh -c '…'`).

**Questions Q3 à Q6, Q8, Q9, Q11, Q14 à Q19** de `docs/phase-0-questions.md` : applique la
recommandation par défaut et signale-le, ne me bloque pas dessus.

Si quelque chose est ambigu : propose une solution argumentée et marque explicitement l'hypothèse.
Ne construis jamais une architecture cachée.
```

## Entretien de ce fichier

⛔⛔ **À la fin de chaque TÂCHE, pas de chaque phase.** La section « Ta mission » a annoncé P4-10
pendant que P4-10 et P4-11 étaient livrées : deux mises à jour successives étaient des
remplacements de texte **sans vérification**, donc des no-op silencieux. Après édition, **relis** ce
que tu as écrit — c'est la règle que ce fichier applique au code, appliquée à lui-même.

⭐ Et **une seule copie de chaque chiffre** : ce fichier a porté le tableau de mesures deux fois, et
les deux avaient divergé.

⛔⛔ **Une mise à jour PARTIELLE laisse un fichier qui se contredit lui-même, et c'est pire qu'un
fichier périmé.** Constaté le 2026-08-25, sur question de l'exploitant : la section « État »
annonçait P5-06 close et la livrait dans son tableau, pendant que le paragraphe **six lignes plus
bas** disait « Restent P5-06 et P5-10, toutes deux REPORTÉES », et que la section « Ta mission »
expliquait encore comment la régler. Trois endroits, une seule vérité, deux versions.
⭐ Le remède tient en une habitude : après toute édition, **`grep` l'identifiant qu'on vient de
changer** — `grep -n "P5-06" docs/next-session-prompt.md` — plutôt que de relire de mémoire le
passage qu'on croit unique.

Mettre à jour dans le bloc ci-dessus :

- la section **État** (phase terminée, phase suivante, tâches en cours) ;
- le bloc **Décisions qui m'attendent** : retirer celles qui ont été tranchées — en les reportant
  dans `phase-0-questions.md` ou dans un ADR selon leur portée — et y monter celles qui bloquent
  réellement la suite. Ce bloc n'a de valeur que s'il ne contient QUE des questions vivantes ;
- la liste des **ADR** si de nouveaux ont été créés ou amendés ;
- la section **Ta mission cette session** ;
- les **points encore ouverts**.

Le reste est stable et n'a pas vocation à changer.
