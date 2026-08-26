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
12. docs/phase-5-log.md       ← ⭐⭐ journal de la phase EN COURS. Court pour l'instant : P5-01, le
                                 verdict GO, et les deux contraintes qui gouvernent toute la phase.
13. deploy/README.md          ← exploitation réelle du serveur : déploiement, rollback, journaux,
                                 checklist de mise en ligne (§8) et vérification publique (§9)
14. content/README.md         ← règles d'écriture du contenu, et deux réserves à corriger

Les Phases 0 à 4 sont TERMINÉES et validées. Ne les refais pas, ne les rediscute pas.

## État

Phases 0 à 4 : **DONE** — le jalon T1 est atteint, le portfolio documentaire est en ligne,
supervisé, avec une checklist de mise en ligne et un rollback rejoué.
**Phase 5 (Fondation Three.js) : CLOSE le 2026-08-25**, **9 tâches sur 10**, les quatre critères de
sortie vérifiés par mesure (bilan : `phase-5-log.md` §10). **Seule P5-10 reste**, reportée après
P6-04 : rien n'anime encore.
**Tout ce qui suit est fusionné sur `main` et déployé**, les cinq jobs verts à chaque fois —
publication GHCR et déploiement VPS compris. ⭐ L'état réellement déployé ne se recopie pas ici, il
**se lit** — trois SHA successifs ont pourri à cet endroit :

```bash
gh run list --branch main --limit 1                                   # ce que la CI a conclu
ssh portfolio 'SSH_ORIGINAL_COMMAND="status" /srv/portfolio/deploy.sh' # ce que le serveur SERT
```

| Tâche | Ce qu'elle a livré |
|---|---|
| P5-01 | **Matrice R3F vérifiée par exécution** — installation, types sous TS 6, scène montée sans WebGL. Verdict GO |
| P5-02 | `three` + R3F + `drei` **épinglés** (ADR-0016), garde ESLint sur l'import global de `drei` |
| P5-03 | `resolveCapability` : quatre paliers, **pur**, et son adaptateur navigateur injectable |
| P5-04 | Montage du canvas : dynamique, après `idle`, `aria-hidden`, **rien au palier `none`** |
| P5-05 | **La scène primitive** : le bureau réel, 30 meshes, 4 114 triangles, pour **3 Ko** |
| P5-06 | **L'éclairage réglé à l'œil** dans la preview puis recopié — et le cadrage corrigé sous 16:9. ⭐⭐ Le réglage a révélé le travail de P5-05 : **les touches du clavier existent enfin**, les chanfreins accrochent la lumière |
| P5-07 | **La frontière d'erreur** — et le défaut livré qu'elle a révélé : sans elle, un chunk 3D manquant affichait « Une erreur est survenue » **sur tout le site** |
| P5-08 | **Le panneau de diagnostic** (`?debug=scene`). ⭐⭐⭐ Il a chiffré ce que le dossier annonçait sans le mesurer : la scène rend **8 182 triangles** pour 4 114 de géométrie — l'écart est **entièrement la passe d'ombre**, +73 % |
| P5-09 | **Le garde d'isolation** : `pnpm bundle` refuse un build dont la première visite porterait un module `three`. ⭐⭐⭐ Il porte un **témoin** — le détecteur doit voir la scène quelque part, sinon il s'accuse lui-même au lieu de rendre un vert |

La Phase 4 est close (17/17) ; son journal reste la meilleure lecture du dépôt. **Seule P5-10
reste**, reportée après P6-04 : sa moitié est livrée (`frameloop="demand"` depuis P5-04) et l'autre
est sans objet tant que rien n'anime. **La Phase 5 n'a plus de tâche exécutable.**

### ⛔⛔ Ce qui fait foi pour juger d'un déploiement

**Le site est volontairement FERMÉ au public**, derrière Cloudflare Access (OTP par e-mail), et le
restera tant que le portfolio n'est pas terminé. **Une requête anonyme reçoit une 302 vers
`cloudflareaccess.com` : ce n'est PAS une panne**, et cela y ressemble beaucoup. Ce qui fait foi est
la conclusion du workflow — les cinq jobs, publication GHCR et déploiement VPS compris :

```bash
gh run list --branch main --limit 1
```

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
| JS propre à chaque route | **11,0 Ko** — le seul JavaScript applicatif du site | cible 25 · bloquant 40 |
| Socle partagé | **127,1 Ko** | cible 136 · bloquant 146 |
| **Chunk 3D différé** | **234,5 Ko** — somme des **deux** chunks porteurs, hors du chemin critique | cible 260 · bloquant 320 |
| Image de production | **281 Mo** | cible 250 · bloquant 400 |
| Tests | **764** verts, couverture **100 %** sur les quatre métriques | ≥ 80 % |
| E2E | **153** verts sur 5 profils | — |
| **Ce que le GPU rend** | **52 draw calls · 8 182 triangles** en desktop — la passe d'ombre incluse, soit **+73 %** sur les 4 114 de géométrie | ≤ 60 / ≤ 150 000 |

⚠️ **Relevés du 2026-08-25, à la clôture de la Phase 5**, tous remesurés ce jour-là dans le même
conteneur et par le même geste (`gzip -9`). L'image de production est vérifiée par
`make check-image-size`, les tests par `pnpm vitest run`.

⛔⛔ **Le chunk 3D n'est plus UN chunk depuis P5-08** : l'import dynamique du panneau l'a scindé en
deux (225,4 + 9,1 Ko). Les 234,5 ci-dessus sont leur somme, mesurée à la clôture de la phase. Les
relevés antérieurs — 226, 229, 230,0, 230,8 — comptaient **un seul fichier** : ils ne se comparent
pas à celui-ci, et une « dérive de 4 Ko » lue entre eux serait un artefact de méthode.
⭐ Le garde de P5-09 énumère les chunks porteurs à chaque build : c'est lui qui dit combien il y en a,
plutôt qu'une hypothèse.

⛔⛔ **Le « 8,2 Ko par route » qu'annonçait ce tableau était périmé de 2,3 Ko** : remesuré sur `main`
sans une ligne de P5-07, il vaut **10,5**. C'est la **deuxième** dérive du même chiffre — P4-12 avait
déjà relevé 7,3 → 8,2 — et toujours pour la même raison : il est recopié de tâche en tâche avec la
mention « inchangé ». P5-07 y ajoute **+0,3 Ko**, et c'est tout ce qu'elle a le droit d'affirmer.
⭐ La ligne « Image de production » figurait **deux fois**, à deux valeurs différentes (273 et 281),
sous un tableau qui se disait unique. Il n'en reste qu'une, la mesurée.

⭐⭐ **Le bureau entier coûte 3 Ko** (226 → 229 Ko) : trente meshes, deux claviers fusionnés,
quatorze matériaux, trois lumières. C'est ce que vaut une scène **en primitives, sans un seul
asset** — ni texture, ni modèle, ni fichier à télécharger.

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

**La Phase 5 est close : ouvre la Phase 6.** Seule P5-10 reste, reportée après P6-04. Tout le reste
est livré et mesuré.

⭐⭐ **Ce que P5-06 a appris, et qui vaut au-delà d'elle** : le travail de géométrie de P5-05 — les
chanfreins portés de 3 à 8 mm, le fruit des capuchons — **ne se voyait pas**, faute d'un éclairage
pour le révéler. Deux tâches séparées par la roadmap étaient une seule chose à l'écran. *Un détail
modélisé mais non éclairé n'existe pas.*
⚠️ **Et le cadrage portrait est BORNÉ, pas réparé** : le plafond de 50° empêche l'œil de poisson (la
formule seule donnerait 103°), mais un téléphone vertical ne voit toujours pas tout le bureau — la
lampe reste hors cadre. Le traiter vraiment demanderait des cadrages portrait dédiés, donc des
**cotes**, qui viennent du dossier et ne s'inventent pas. C'est la **Phase 13**.

⛔⛔ **La dette que la Phase 5 lègue, et qu'il ne faut pas maquiller** : le **TBT est passé de 640 à
2 090 ms** (×3,3), et le score Lighthouse « performance » de ~97 à ~74. ✅ Le critère de sortie est
tenu au sens strict — **LCP 1,7 → 1,6 s, CLS 0 → 0**, les deux métriques qu'il nomme — et c'est un
arbitrage daté, pas un oubli. La dette est chiffrée dans `performance-budget.md` §6.2, à traiter en
Phase 11 **sur du matériel réel** : ces relevés sont pris **sans GPU**.
⛔ **Ne repousse PAS l'échéance du `requestIdleCallback` pour « améliorer » ce score** : le coût ne
disparaîtrait pas, seul l'instrument cesserait de le voir. C'est la classe de faux vert que toute
cette phase a traquée.

⭐⭐⭐ **Et la méthode qui a rendu ce verdict possible, parce qu'elle resservira** : le seul relevé de
la Phase 4 venait du **site réel** (P4-16, 98/100), donc incomparable à un relevé local. Il a fallu
**construire une image depuis `67e6ff0`**, le commit de clôture de la Phase 4, et lancer le **même**
Lighthouse contre les deux, sur la même machine, à quelques minutes d'écart. C'est cette mesure qui a
montré que la chute de 23 points ne touche **ni le LCP ni le CLS**.

⭐ **P6-01 est le point d'entrée** — `resolveSceneState(pathname)`, pur, sans Three.js. La Phase 6
fait suivre la scène à l'URL (ADR-0002), et `layout.ts` porte déjà les quatre cadrages avec leurs
positions et cibles calculées.
⛔⛔ **Le piège de P6-04 est écrit depuis P5-05 et n'a pas bougé** : le `fov` varie de **16° à 36°**
selon l'état et **doit être interpolé avec la position**, sinon la transition vers *Compétences*
produit un zoom sec.
⭐⭐ **Et P6-04 hérite de deux dettes nommées** : le `fov` n'est pas corrigé sous 16:9 (un téléphone
en portrait perd le cadrage d'accueil — P5-06), et la boucle de rendu devra invalider image par image
sans rester en `always` (P5-10).
✅ **Trois arbitrages tranchés le 2026-08-25** : la dépendance de P5-08 et P5-10 passe de P5-06 à
**P5-05** (une scène *rendue* suffit, un éclairage *réglé* n'y change rien) ; **P5-10 est reportée
après P6-04** ; **D11 est close en « laisser »**.

⭐⭐ **Pourquoi P5-10 est reportée, et ce que ça apprend** : `frameloop="demand"` est en place depuis
P5-04 et **rien n'appelle `invalidate()`**, faute d'animation. « Pause hors écran / onglet masqué »
suppose une boucle à mettre en pause — une boucle qui ne tourne pas ne se suspend pas. L'écrire
aujourd'hui produirait un mécanisme sans effet mesurable, donc **un garde qu'aucun banc ne pourrait
voir rouge**. Son contenu naît avec P6-04, quand la transition devra invalider image par image.

⭐ **P5-08 hérite d'un manque nommé par P5-07** : rien ne distingue à l'écran une scène qui n'a jamais
monté d'une scène tombée. Le panneau de diagnostic est le premier endroit où la **cause** pourra se
lire — `mount-state.ts` la porte déjà (`chunk`, `render`, `context-lost`), personne ne l'affiche.

✅ **Le défaut de cadrage sous 16:9 est corrigé** (P5-06, `framing.ts`) : la règle du dossier §6 est
appliquée aux quatre cadrages, plafonnée à 50°. ⚠️ Elle **borne** le portrait extrême sans le
réparer — voir la mission ci-dessus.

⛔⛔ **Et le piège qui attend P6-04** : le `fov` varie de **16° à 36°** selon l'état, parce que le
cadrage *Compétences* vise un écran monté sur un corps profond. **Il doit être interpolé avec la
position**, sinon la transition produit un zoom sec. Le rig lui-même — interpolation simultanée de la
position et de la cible, 700 ms, `easeInOutCubic` — est **P6-04**, pas P5-06.

⭐⭐ **Ce que la Phase 5 laisse et qu'il faut employer plutôt que refaire** :
`src/scene/state/layout.ts` porte **toutes** les cotes — aucune valeur de scène ne s'écrit ailleurs ;
`geometry.ts` construit les deux géométries que `three` ne fournit pas, en pur ; et
`tests/unit/scene/` recompte les budgets depuis les données. Un chiffre changé dans `layout.ts` fait
rougir le banc, ce qui est exactement l'effet voulu. ⭐ Et `capability/mount-state.ts` porte ce qu'une
défaillance fait au montage : la bascule en `none` est **terminale**, donc toute idée de « réessayer »
se discute là, jamais dans un composant.

⭐⭐ **Ce que la Phase 4 laisse, et qu'il faut employer plutôt que refaire** : `deploy/README.md` §8
(checklist de mise en ligne, jouée), `make check-uptime` (sonde externe), `make check-public-seo`
(canonical / hreflang / sitemap sur le site public). Aucun de ces trois ne s'imagine à nouveau.

⛔ **Trois portes ne tournent PAS dans `make e2e`, et se découvrent donc en CI** : la couverture
(`make coverage` — seuil de **95 %** sur `src/scene/state`), `make bundle` — qui porte désormais
**deux** contrôles, les budgets *et* l'isolation de la scène (P5-09) — et Lighthouse (contre l'image
de production, ce que le conflit de port local rend malaisé). Chacune a refusé une tâche de cette
phase après que `make test` l'eut déclarée bonne.

⚠️ **`make bundle` reconstruit** (`pnpm build && pnpm bundle`) : compter deux à trois minutes, et ne
pas s'étonner que l'arbre de travail en ressorte sali — voir `next-env.d.ts` dans les pièges
d'environnement.

⛔⛔⛔ **Les dix leçons que ces deux phases ont payées, et qui visent tout ce qui suit :**
(⚠️ ce titre a déjà annoncé « cinq » pour sept entrées — un compte écrit une fois puis jamais
recompté, dans le document qui interdit précisément cela. Recompter en éditant.)
1. **Une preuve d'exploitation peut se périmer sans jamais devenir fausse** (P4-15). Le rollback était
   « prouvé » depuis P1-15 — mesure prise proxy en *DNS only*, honnête ce jour-là, vide de sens depuis
   la bascule en *Full (strict)*. Rejoué en jugeant le corps : **~1 s d'origine absente sous un 200
   constant**.
2. **Une absence et un instrument aveugle se lisent exactement pareil** (P4-16). Une lecture sensible
   à la casse a rendu « aucun hreflang » sur quatorze pages qui en portent trois. Vérifie l'instrument
   avant de conclure au vide.
3. **Deux mesures ne se comparent que si leurs entrées ne diffèrent QUE par ce qu'on mesure** (P5-01).
   Un tableau de poids comparait un `export *` à cinq imports nommés : le sur-ensemble y pesait
   **moins** que son sous-ensemble, ce qui est impossible — et le budget de toute la phase allait s'y
   appuyer.
4. **Une préférence d'accessibilité et un coût matériel sont deux axes ORTHOGONAUX** (P5-03) ; les
   projeter sur un seul ordinal en perd un. Un mobile tombait en `lite` et `prefers-reduced-motion`
   n'était jamais évalué : la préférence était honorée sur un poste fixe, pas sur un téléphone.
5. ⛔⛔⛔ **Un échec qui SE DÉPLACE est une course, jamais un défaut du code** (P5-07). Vert en
   isolation, rouge en suite complète, puis rouge sur l'autre test au run suivant : la conclusion
   naturelle — « la bascule ne marche pas » — aurait fait corriger du code sain. Trois repères de banc
   étaient faux, dont un qui ne pouvait pas ne pas l'être : **un `<canvas>` sans attribut mesure
   300 × 150**, donc « taille non nulle » était vrai avant même l'événement attendu. ⭐⭐ *Une valeur
   par défaut peut rendre un repère vrai avant ce qu'il prétend attendre.*
6. ⭐⭐⭐ **Un garde qui cherche une absence doit porter un TÉMOIN** (P5-09). « Aucun module `three`
   dans la première visite » ne veut rien dire tant qu'on n'a pas montré que le détecteur sait en
   voir : le même instrument est donc passé sur tous les chunks et doit trouver la scène quelque
   part. Aveuglé exprès, le garde s'accuse lui-même au lieu de rendre un vert. ⛔⛔ Et le repère
   apparemment évident était **faux** : la chaîne `node_modules/three/` n'existe pas dans le code
   minifié, jusque dans le chunk qui est fait de `three`.
7. ⭐⭐⭐ **Deux mesures justes peuvent se contredire tant qu'on n'a pas dit ce que chacune compte**
   (P5-08). Le panneau annonçait 52 draw calls là où le banc en certifie 30 : aucune régression — le
   banc compte la **géométrie**, `renderer.info` compte **toutes les passes de rendu**. Prouvé au
   palier `lite`, ombres coupées, où les deux comptes coïncident exactement. ⭐ Un nombre nu sur un
   panneau est une conclusion fausse en attente ; les libellés disent « toutes passes ».
8. ⭐⭐ **Un banc vert ne voit pas ce qui est illisible** (P5-08). Le panneau recouvrait un lien de
   navigation ; `pointer-events: none` le gardait **cliquable**, donc tous les parcours passaient. Ce
   défaut-là ne se trouve qu'en **regardant une capture** — comme les deux de D11.
9. ⭐⭐ **Une frontière d'erreur ne se juge pas sur ce qu'elle attrape, mais sur ce qui l'attraperait à
   sa place** (P5-07). Il y en avait déjà une au-dessus, et elle faisait exactement ce qu'il ne
   fallait pas : afficher « Une erreur est survenue » sur tout le site parce qu'un décor n'avait pas
   pu se charger.
10. **Un test qui passe pour deux raisons possibles n'en garde aucune** (P5-04). « N'intercepte aucun
   clic » cliquait un lien ; `z-index: -1` suffisait déjà à le faire aboutir, donc retirer la ligne de
   CSS qu'il protégeait l'aurait laissé vert. Affirme la propriété, jamais son symptôme.

⭐⭐⭐ **Et celle qui décide des conflits, née de P5-05** : *entre deux documents qui se contredisent,
celui qui porte le RAISONNEMENT l'emporte — surtout quand ce raisonnement se mesure.* `layout.ts`
disait `InstancedMesh`, le dossier de scène disait « fusionné » **et disait pourquoi**. Le banc a
tranché en 1,2 mm.

⛔⛔⛔ **Et la leçon de P4-14, qui vaut pour toute vérification depuis l'extérieur :
interposer un CDN change ce qu'un code de retour SIGNIFIE.** Conteneur arrêté, `/robots.txt` rend
**200 quand même** : Cloudflare compose la réponse à sa périphérie. Un contrôle jugé sur le statut
aurait été vert sur un site éteint. Ne juge jamais l'origine sur un code de retour seul — juge sur
quelque chose que **seule l'origine** peut produire.

⭐⭐ **Le serveur est accessible, mais la clé porte une passphrase.** Demande à l'utilisateur de faire
`ssh-add ~/.ssh/id_ed25519_aureliefeignon` une fois, puis emploie
`SSH_AUTH_SOCK=/run/user/1000/openssh_agent ssh portfolio '…'`. ⛔⛔ Sans agent, `BatchMode=yes` rend
`Permission denied (publickey)` — **le même message que pour une clé non autorisée**, et j'en avais
tiré un diagnostic faux. `ssh-add -l` distingue les deux cas et coûte zéro.

⭐⭐⭐ **Ce que P4-12 a appris, et qui vaut pour la suite : une mission peut être fausse sur trois
points, et sincère.** Elle annonçait cinq scénarios E2E « couverts » ; trois ne l'étaient pas. C'est
la forme de défaut que la phase entière traque, arrivée dans le document qui demande de ne plus la
produire. **Constate, ne crois pas** — y compris ce fichier-ci.

⭐⭐ **L'inventaire des scénarios E2E est désormais un garde, pas un paragraphe.**
`tests/integration/every-e2e-scenario-has-a-status.test.ts` confronte les quatorze scénarios de
`testing-strategy.md` §4.7 au banc : un scénario sans statut rougit, un scénario déclaré couvert
qu'aucun parcours ne revendique (`@covers E2E-xx`) rougit, un report vers une tâche inexistante
rougit. **Écrire un parcours pour E2E-13 ou E2E-14 suppose donc de basculer son statut** — le garde
te le dira.

⛔⛔ **Avant de commencer, lis `phase-4-log.md` §14.8 et §15.1 : dix arbitrages sont TRANCHÉS.** Ne
les repose pas — chacun porte sa condition de réouverture.

⭐⭐⭐ **Une tâche qui produit des arbitrages les pose au moment où ils naissent**, comme une liste de
choix avec un défaut recommandé — pas en fin de rapport, pas dans un journal qu'on lit après avoir
fusionné. C'est la même faute que celles que ces tâches traquent dans le code : *une chose écrite
quelque part que rien ne confronte au moment où elle compte*. P4-09 à P4-11 ont tenu la règle.

### Ce que les tâches précédentes laissent pour toi

- **`links.repository` n'est rendu par aucune page.** Le contenu le porte, personne ne l'affiche, et
  le JSON-LD ne peut donc pas l'annoncer : une donnée structurée décrit ce que la page **montre**.
- **Une CSP stricte supprimerait les blocs `ld+json` en silence** — note dans `src/seo/json-ld.ts`
  pour l'ADR-0015 (Phase 14). Il faudra un `nonce` ou un condensat.
- **Le sélecteur de langue est rendu par chaque page, dans le `main`** — inhabituel pour une commande
  de portée globale. Ses options dépendent de la page, donc un layout ne peut pas le rendre. Choix de
  gabarit, toujours à trancher.
- **Le second volet de D7 n'est pas fait** : les `sections[x].description` sont à la fois la
  méta-description d'une section et la copie visible des cartes de l'accueil. Les séparer en six clés
  porterait aujourd'hui trois valeurs identiques.

### ✅ Ce que P4-13 a vérifié sur le serveur, et qu'il ne faut pas refaire

- ✅ **`SITE_URL` coïncide dans ses trois écritures** — `.env` du VPS, `Config.Env` du conteneur,
  `ENV` de l'image — et le site **sert** ce qu'elles annoncent : `canonical`, trois `hreflang`,
  14 URL au sitemap, zéro d'une autre origine. La dette 1 de `phase-3-log.md` §17.4 est soldée.
  ⭐ **La vérification qui compte n'est aucune des trois variables**, c'est le document servi.
- ⛔⛔ **`content/` EST dans l'image**, contrairement à ce que quatre documents affirmaient depuis
  P2-03 : 87 fichiers, 384 Ko, le traceur de Next l'incluant dans la sortie `standalone`. Mesuré en
  P4-13. L'exigence « aucune route ne se rend à la demande » tient toujours, mais ce qui la protège
  est le **gate de rendu statique, et lui seul** — le filet de sécurité auquel la Phase 2 croyait
  n'existe pas. La checklist de P4-15 doit le dire ainsi.

⭐⭐ **Un gate travaillera pour toi si tu le laisses faire.** `check-static-rendering.mts` porte six
contrôles et a refusé, sans qu'on le lui demande, une image de partage rendue à la demande puis une
route que le proxy aurait réécrite en 404. Toute nouvelle route non-page devra entrer dans
`ROUTE_HANDLERS` — le gate te le dira, avec le nom du fichier à éditer.

Avant de coder, applique la méthode de phase. À la fin de la phase, produis un bilan : fait / dérives
/ reporté.

## Décisions qui m'attendent

Format des réponses : « D2 = …, défaut partout ailleurs » suffit. Aucune ne bloque la suite.

⭐ **Ce bloc ne contient QUE des questions vivantes**, et c'est ce qui lui donne sa valeur. Les
décisions tranchées sont reportées dans `phase-0-questions.md` ; elles n'ont plus à être lues ici.
**Closes : D1, D3, D4, D7** (le 2026-08-16 pour les deux dernières), **D9 et D10** (le 2026-08-20),
**D11** (le 2026-08-25, « laisser » — `phase-5-log.md` §6.7).

**D2 🟠 — Relire les 40 niveaux de compétence (1 à 5).** *La seule qui ait un effet visible : les
niveaux **ne sont ni affichés ni publiés** tant que tu ne les as pas relus.* Les publier afficherait
comme un fait une auto-évaluation que personne n'a validée, et **deux gardes le tiennent** — le
contrat de `SkillGroup`, qui ne porte que `{ slug, name }`, et un parcours sur le JSON-LD.
→ *Dis-moi seulement ceux qui te paraissent faux. Dix compétences sont `featured` : TypeScript,
Python, Node.js, React, Next.js, PostgreSQL, Docker, microservices, architecture événementielle,
intégration de modèles de langage.*

**D5 🟠 — Photos de ton poste de travail ?** (Q17, Phase 8) → *Les rassembler sans urgence. C'est ce
qui distinguera ce portfolio d'une démo Three.js.*

**D6 🟠 — Rendre le paquet GHCR public ?** *(action manuelle, je n'ai pas les droits)* → *GitHub →
Packages → portfolio → Change visibility → Public. Puis sur le VPS : `docker logout ghcr.io && rm
/srv/portfolio/.ghcr-token`, et retirer le `docker login` de `deploy.sh`. Bénéfice : plus de PAT à
renouveler, donc plus de déploiement qui s'arrête un jour sans rapport apparent avec le code.*

**D8 🟠 — Un projet qui te représente aujourd'hui.** *Née de la clôture de D3.* Ton GitHub ne porte
que des travaux scolaires de 2021, et la page Projets ne contient que ce portfolio. Le levier n'est
pas d'ajouter du volume — c'est **un** projet récent, décrit pour lui-même.
→ *Si tu en as un à montrer, c'est un fichier par locale dans `content/*/projects/`. Sinon, dis-le :
la page reste à un projet, assumé, et je ne la rouvre plus.*

**D12 🟢 — La largeur du plateau, au mètre ruban.** *Une seule mesure, et toute la scène se
verrouille.* La photo donne **1,37 m**, la valeur retenue **1,40 m** ; toutes les cotes en découlent
par un facteur d'échelle. Sept autres hypothèses attendent avec elle — profondeur et hauteur du
plateau, diagonales des deux moniteurs, angle de l'écran gauche — mais celle-ci est la seule qui les
gouverne toutes.
→ *Mesure le chant avant du plateau et donne-moi le chiffre. Si tu n'as pas de mètre sous la main,
dis-le : 1,40 reste, et je l'écris comme assumé plutôt que comme provisoire.*

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
- ⛔ **Une donnée structurée décrit ce que la page montre, et deux ne le font pas** : `links.repository`
  (relevé en P4-09) *et* le `BreadcrumbList` (relevé en P4-12). `content/` porte le premier, P4-09
  émet le second sur les sections **et** les fiches — et **aucune page ne rend de fil d'Ariane, ni
  aucun retour visible**. Les deux sont la même dette, à reprendre avec la fiche de projet.
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
- **`getFeaturedProjects` n'a aucun appelant de production.** ⚠️ `getFeaturedSkills`, lui, en a un
  depuis **P4-09** — le `knowsAbout` du `Person`. La dette a donc **rétréci sans être réécrite**
  pendant une tâche : le drapeau `featured` est lu pour les compétences, par personne pour les
  projets.
- **La liste blanche MDX n'est pas une barrière de sécurité** : à reprendre tel quel à l'audit de la
  Phase 14.
- **Mesure CPU en régime stable** (P11-08) : le seul relevé date d'une minute après démarrage — 32 %,
  au-dessus du seuil d'alerte de 25 %. Ce n'est pas une mesure valide.
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
