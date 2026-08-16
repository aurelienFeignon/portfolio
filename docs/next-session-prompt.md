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
8. docs/phase-1-log.md        ← journal de la Phase 1
9. docs/phase-2-log.md        ← journal de la Phase 2
10. docs/phase-3-log.md       ← journal de la Phase 3 : ce que l'exécution a renversé, dette tracée
11. docs/phase-4-log.md       ← ⭐ journal de la phase EN COURS. Le plus important des trois :
                                 §13 et §14 portent trois défauts déjà livrés et six arbitrages
                                 tranchés. Il manquait à cette liste jusqu'au 2026-08-16.
12. deploy/README.md          ← exploitation réelle du serveur : déploiement, rollback, journaux
13. content/README.md         ← règles d'écriture du contenu, et deux réserves à corriger

Les Phases 0, 1, 2 et 3 sont TERMINÉES et validées. Ne les refais pas, ne les rediscute pas.

## État

Phases 0 à 3 : **DONE**. **Phase 4 (Portfolio HTML) : en cours**, 9 tâches sur 17 closes.

**Fusionné sur `main` et déployé** — PR #15 à #21, CI verte à chaque fois :

| Tâche | Ce qu'elle a livré |
|---|---|
| P4-01 | ADR-0010 : CSS Modules + tokens, décidé sur une exécution |
| P4-02 | Layout documentaire, `aria-current`, identité « Aurélien Feignon » |
| P4-03 | Accueil : `SectionGuide` qui **dit** ce que chaque section contient |
| P4-04 | Liste et fiche des expériences, précision d'affichage des dates |
| P4-17 | **Précision variable des dates** (`AAAA` / `AAAA-MM` / `AAAA-MM-JJ`) |
| P4-06 | Compétences groupées par catégorie |
| P4-05 | Liste et fiche des projets, **premier corps MDX rendu** |

### P4-07 et P4-08 — fusionnées et **déployées** le 2026-08-16 (PR #22, `50a3b4b`)

Les cinq jobs sont verts, publication GHCR et déploiement VPS compris. C'est en ligne.

| Tâche | Ce qu'elle a livré |
|---|---|
| P4-07 | 404 et pages d'erreur **localisées**, servies par réécriture du proxy |
| P4-08 | Gabarit de titre, OpenGraph, image de partage, icône |

**Reste : P4-09 à P4-16.**

⚠️ **Une branche locale non poussée t'attend** : `docs/arbitrages-p4-07-p4-08`, **deux commits**,
documentation seule. Elle inscrit les six arbitrages tranchés et remet ce prompt à jour. Pousse-la
et ouvre la PR, ou dis-moi de la reprendre autrement.

⛔⛔ **Le site est volontairement FERMÉ au public**, derrière Cloudflare Access (OTP par e-mail),
et le restera tant que le portfolio n'est pas terminé. **Une requête anonyme reçoit une 302 vers
`cloudflareaccess.com` : ce n'est PAS une panne de déploiement**, et cela y ressemble beaucoup.
Ce qui fait foi pour juger d'un déploiement est la conclusion du workflow :

```bash
gh run list --branch main --limit 1
```

Conséquence pour **P4-16** : la vérification post-déploiement — indexation, `canonical`, `hreflang`,
`sitemap.xml` observés **depuis l'extérieur** — est impossible tant qu'Access est actif. Lever Access
fait partie de la mise en ligne réelle. Détail : `deploy/README.md` §4.2.

⭐⭐⭐ **Le journal de phase (`phase-4-log.md` §13 et §14) est ce qu'il faut lire, pas ce résumé.**
Ces deux tâches ont trouvé **trois défauts déjà livrés**, et aucun n'était visible à la relecture :

| Défaut | Trouvé par |
|---|---|
| ⛔⛔ **Les deux CV répondaient 404** — en ligne depuis la Phase 2 | le parcours E2E |
| ⛔⛔ `/wp-login.php`, `/cv.pdf` rendaient un `<html>` **sans `lang`** | `/code-review` + mesure |
| ⛔⛔⛔ Une URL **`localhost`** gravée dans les pages 404 prérendues | `/code-review` + mesure |

⭐⭐⭐ **Les trois ont la même forme : une affirmation sur le monde que rien ne confrontait au
monde.** Une liste d'exceptions écrite d'imagination ; une heuristique de forme là où seul le disque
sait ; une base d'URL non déclarée — **dont Next écrivait l'avertissement au build, en toutes
lettres**. Ce dernier point est la leçon de la Phase 3 repayée à l'identique : *lis la sortie des
outils*.

⭐⭐ **Deux gardes que j'ai écrits ont payé le même piège que ceux qu'ils remplaçaient** : celui des
enveloppes racines comptait les `<html>` **cités dans les commentaires**, et la sonde de palette ne
pouvait pas voir la duplication qu'elle prétendait garder — elle vérifie qu'un littéral *est* un
token, jamais que deux fichiers désignent *le même*. Un garde qui lit du texte source lit **tout** le
texte source.

### Ce que la Phase 4 coûte désormais, et qu'il ne faut pas redécouvrir

| Relevé | Valeur (2026-08-16) | Seuil |
|---|---|---|
| JS propre à chaque route | **7,3 Ko** — le premier JavaScript applicatif du site | cible 25 · bloquant 40 |
| Socle partagé | **126,4 Ko** | cible 136 · bloquant 146 |
| Image de production | **272 Mo** (+4 Mo : `next/og`, **entièrement de build**) | cible 250 · bloquant 400 |
| Tests | **569** verts, couverture **98,6 %** | ≥ 80 % |
| E2E | **117** verts sur 5 profils, 0 violation axe | — |

⛔ **« Couverture 100 % » était faux depuis P4-05**, et le chiffre a survécu deux tâches dans ce
journal. **Cinq** fichiers ne sont pas couverts — `place-layout.tsx`, `technology-section.tsx`,
`prose.tsx`, `brand-palette.ts`, `company-line.tsx` — dette nommée, reprise en **P4-10**.
⛔⛔ La liste en annonçait **trois** : le *chiffre* avait été remesuré, la *liste* écrite de mémoire,
et elle oubliait l'une des deux extractions d'un même commit. Remesure, ne recopie pas — **la liste
autant que le nombre**.

⛔ **Le profil `no-js` n'est plus vrai *par construction*** : il l'est **par vérification**. Les
frontières d'erreur sont des composants client, et c'est le seul JavaScript applicatif du site.

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

**Enchaîne sur P4-09** (JSON-LD : `Person`, `WebSite`, `CreativeWork`, `BreadcrumbList`), puis la
suite de la Phase 4.

⛔⛔ **Avant de commencer, lis `phase-4-log.md` §14.8 : les six arbitrages de P4-07 et P4-08 sont
TRANCHÉS.** Ne les repose pas — chacun porte sa condition de réouverture. Et retiens **pourquoi** ils
y sont : ils ont été posés **après la fusion**, parce qu'ils étaient consignés en prose au lieu
d'être présentés comme une liste de décisions.

⭐⭐⭐ **Une tâche qui produit des arbitrages les pose au moment où ils naissent**, comme une liste de
choix avec un défaut recommandé — pas en fin de rapport, pas dans un journal qu'on lit après avoir
fusionné. C'est la même faute que celles que la tâche traquait dans le code : *une chose écrite
quelque part que rien ne confronte au moment où elle compte*.

⚠️ **P4-09 hérite de deux choses de P4-08**, écrites pour ne pas être redécouvertes :

- **`og:type` vaut `website` partout**, y compris sur les fiches. Une fiche est un `article` au sens
  d'OpenGraph, mais l'annoncer inviterait à chercher un `article:published_time` que nos dates à
  **précision variable** ne peuvent pas former (P4-17). C'est le JSON-LD qui porte la sémantique
  d'entité — donc toi.
- **Le préalable de P4-09 est déjà levé** : `isoDateSchema` accepte `AAAA` / `AAAA-MM` / `AAAA-MM-JJ`,
  et ce qui est stocké est **émissible verbatim**. Émets le champ tel quel ; ne le complète jamais.

⭐⭐ **Un gate travaillera pour toi si tu le laisses faire.** `check-static-rendering.mts` porte six
contrôles et a refusé, sans qu'on le lui demande, une image de partage rendue à la demande puis une
route que le proxy aurait réécrite en 404. Toute nouvelle route non-page devra entrer dans
`ROUTE_HANDLERS` — le gate te le dira, avec le nom du fichier à éditer.

Cinq points de méthode que la Phase 4 a payés cher, et qui valent pour la suite :

⭐⭐⭐ **Un nombre recopié et jamais remesuré finit par décider seul.** L'image de production était
annoncée à 385 Mo dans quatre documents ; elle en pesait **268,6**. Ce chiffre avait réordonné la
phase. Et « couverture 100 % » a survécu deux tâches après être devenu faux. **Remesure avant de
t'appuyer sur un chiffre.**

⭐⭐⭐ **Un seuil que rien ne fait respecter n'est pas un seuil.** Celui de 400 Mo était écrit dans le
budget et appliqué nulle part. Il est bloquant depuis P4-05. Quand tu vois un seuil documenté,
**vérifie qui le lit**.

⭐⭐⭐ **Un test neuf doit être vu rouge avant d'être cru** — et un garde qui lit du texte source lit
**tout** le texte source, commentaires compris (P4-07). Mutation-teste tes gardes, sans exception.

⭐⭐⭐ **Lis la sortie des outils.** Les défauts les plus graves de P4-07 et P4-08 y étaient écrits :
un avertissement `metadataBase` au build, un gate qui nommait le fichier à corriger. Aucun n'a été
trouvé en relisant du code.

⭐⭐ **`/code-review` puis `/simplify` avant chaque push, sans exception.** Sur ces deux tâches, ils
ont trouvé **douze défauts réels** sur du code dont tous les gates étaient verts — dont trois défauts
**déjà livrés**.

Avant de coder, applique la méthode de phase. À la fin de la phase, produis un bilan : fait / dérives
/ reporté.

## Décisions qui m'attendent

Format des réponses : « D1 = …, défaut partout ailleurs » suffit. Aucune ne bloque la suite.

**D1 🟢 — Les vrais mois de début d'Askor et d'Augure.** *Résolue autrement, et déclassée.*
`content/` disait `2021-01-01` faute de mieux ; il dit maintenant **`'2021'`**, c'est-à-dire
exactement ce que l'on sait. Le schéma accepte les trois précisions et le site affiche celle qu'il
reçoit. → *Si tu retrouves les mois, écris `'2021-09'` : affichage et `datetime` suivent. Ce n'est
plus une fausseté inscrite, c'est une précision manquante.*

**D2 🟠 — Relire les 40 niveaux de compétence (1 à 5).** *Toujours ouverte, et elle a un effet visible :
les niveaux **ne sont pas affichés** tant que tu ne les as pas relus.* Les publier afficherait comme
un fait une auto-évaluation que personne n'a validée. → *Dis-moi seulement ceux qui te paraissent
faux. Dix compétences sont `featured` : TypeScript, Python, Node.js, React, Next.js, PostgreSQL,
Docker, microservices, architecture événementielle, intégration de modèles de langage.*

**D3 🟠 — Un seul projet publié, est-ce voulu ?** `content/*/projects/` ne contient que ce portfolio.
→ *La page Projets et l'accueil sont maigres pour un CTO venu évaluer ta profondeur technique
(persona B). Si tu as quelque chose à montrer pour lui-même, c'est un fichier par locale.*

**D4 🟢 — Augure : expérience ou projet ?** *Close par défaut* : reste une expérience, avec
`company: Augure`. Je ne la rouvre plus.

**D7 🟠 — Le texte d'accueil, et les descriptions de section.** *Neuve, née de P4-03.* L'accueil
affiche `site.description`, qui est une **méta-description**, pas une accroche — exact et
insuffisant. Aucun texte de présentation n'a été écrit : ce serait du contenu éditorial dans un
dictionnaire d'interface, et des affirmations sur toi qu'aucune session ne tient de toi.
⚠️ **Le même constat vaut trois fois de plus** : les `sections[x].description` sont à la fois la
`<meta name="description">` des pages de section **et** la copie visible des cartes de l'accueil.
Longueur SEO d'un côté, accroche lisible de l'autre — ajuster l'une changera l'autre en silence.
→ *Deux ou trois phrases pour l'accueil. Si elles sont courtes et factuelles, c'est une clé de
dictionnaire ; si elles relèvent du récit, c'est un fichier de `content/` — plus juste, et ça suppose
un type de contenu qui n'existe pas encore. Le jour où tu tranches, la séparation des descriptions
fait six clés, pas trois.*

**D5 🟠 — Photos de ton poste de travail ?** (Q17, Phase 8) → *Les rassembler sans urgence. C'est ce
qui distinguera ce portfolio d'une démo Three.js.*

**D6 🟢 — Rendre le paquet GHCR public ?** *(action manuelle, je n'ai pas les droits)* → *GitHub →
Packages → portfolio → Change visibility → Public. Puis sur le VPS : `docker logout ghcr.io && rm
/srv/portfolio/.ghcr-token`, et retirer le `docker login` de `deploy.sh`. Bénéfice : plus de PAT à
renouveler, donc plus de déploiement qui s'arrête un jour sans rapport apparent avec le code.*

## Contexte de planning

Objectif : portfolio documentaire EN LIGNE début septembre 2026 (tranche T1 = Phases 1 à 4 +
P4-13 à P4-16). La 3D vient après, par incréments, sur le site déjà en ligne.
Le chemin critique — la rédaction du contenu — est **levé** depuis le 2026-08-15.

## Points encore ouverts

**Chiffres à jour — ceux-ci ont été remesurés, ne les recopie pas sans les revérifier :**

| Relevé | Valeur (2026-08-16, après P4-08) | Seuil |
|---|---|---|
| Image de production | **272 Mo** | cible 250 · **bloquant 400, appliqué** |
| JS propre à chaque route | **7,3 Ko** sur 18 routes | cible 25 · bloquant 40 Ko |
| Socle partagé | **126,4 Ko** | cible 136 · bloquant 146 Ko |
| Tests | **569** verts, couverture **98,6 %** | ≥ 80 % |
| E2E | **117** verts sur 5 profils | — |

⛔⛔ **Les cinq valeurs de ce tableau étaient périmées** au moment de l'écrire — sous un titre qui dit
« chiffres à jour, remesurés ». La section qui met en garde contre les nombres recopiés en portait
elle-même cinq. Remesure : `make bundle`, `make check-image-size`, `make coverage`.

⛔ **L'image dépasse la cible de 250 Mo depuis toujours**, et rien ne le disait avant que le gate ne
porte les deux paliers. `performance-budget.md` §7.1 tranche : ne rien changer, aucune image Node
officielle n'atteint 250 Mo.

**Dettes nommées, par ordre d'urgence :**

- ✅ ~~La confrontation manifeste ↔ sitemap~~ — **faite en P4-07**, et autrement que prévu : les
  listes générées sont confrontées **aux pages réellement prégénérées**, pas au sitemap. Il y a trois
  énumérations, dont deux dérivées ; comparer deux dérivées produit un message qui accuse celle qui
  n'a pas tort. Le gate porte **six contrôles**, tous vus rouges.
- ⛔ **Cinq fichiers ne sont pas couverts** — `place-layout.tsx` (P4-02), `technology-section.tsx` et
  `prose.tsx` (P4-05), `brand-palette.ts` (P4-08), `company-line.tsx` (P4-04, 75 % de branches).
  Tests de composant manquants, à écrire en **P4-10**. La liste en annonçait trois : elle avait été
  écrite de mémoire à côté d'un chiffre, lui, remesuré (`phase-4-log.md` §13.8).
- ✅ **Les six arbitrages de P4-07 et P4-08 sont TRANCHÉS** (2026-08-16, `phase-4-log.md` §14.8) :
  garder les deux frontières d'erreur, garder le monogramme d'attente, laisser `og:type` à
  `website`, laisser l'`og:image` sans condensat, laisser `/favicon.ico` nu en 404, ne rien changer
  aux 272 Mo. **Ne les repose pas** — chacun porte sa condition de réouverture.
  ⚠️ Ils ont été posés **après la fusion**, parce qu'ils étaient consignés en prose au lieu d'être
  présentés comme une liste de décisions. **Une tâche qui produit des arbitrages les pose au moment
  où ils naissent.**
- ⚠️ **Le sélecteur de langue est rendu par chaque page**, à l'intérieur du `main` — inhabituel pour
  une commande de portée globale. Ses options dépendent de la page, donc un layout ne peut pas le
  rendre. Choix de gabarit, à trancher.
- **`EntityList` ne sert plus qu'aux projets** ; les expériences et les compétences ont leur
  composant. Il reste parce qu'un projet n'a qu'un titre et un résumé, pas parce qu'il est générique.
- **`getFeaturedProjects` / `getFeaturedSkills` n'ont aucun appelant de production.** Le drapeau
  `featured` est porté par le contenu et lu par personne.
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
- ⚠️ Un `*/` dans un chemin écrit en commentaire **ferme le bloc JSDoc**. Deux fichiers s'en sont
  cassés.
- ⚠️ **`pnpm build` régénère `src/routing/route-manifest.ts`** avant `next build`. Le générateur rend
  la forme déjà passée par Prettier — sans quoi chaque build salissait l'arbre de travail — et un
  test compare octet à octet le fichier committé à ce que produirait le générateur aujourd'hui.
- ⚠️ **Les types de routes générés par Next périment `tsc`** après l'ajout d'un layout : `make
  typecheck` échoue sur `.next/dev/types` tant qu'un build n'a pas eu lieu. Reconstruire, pas
  débugger.

**Questions Q3 à Q6, Q8, Q9, Q11, Q14 à Q19** de `docs/phase-0-questions.md` : applique la
recommandation par défaut et signale-le, ne me bloque pas dessus.

Si quelque chose est ambigu : propose une solution argumentée et marque explicitement l'hypothèse.
Ne construis jamais une architecture cachée.
```

## Entretien de ce fichier

À la fin de chaque phase, mettre à jour dans le bloc ci-dessus :

- la section **État** (phase terminée, phase suivante, tâches en cours) ;
- le bloc **Décisions qui m'attendent** : retirer celles qui ont été tranchées — en les reportant
  dans `phase-0-questions.md` ou dans un ADR selon leur portée — et y monter celles qui bloquent
  réellement la suite. Ce bloc n'a de valeur que s'il ne contient QUE des questions vivantes ;
- la liste des **ADR** si de nouveaux ont été créés ou amendés ;
- la section **Ta mission cette session** ;
- les **points encore ouverts**.

Le reste est stable et n'a pas vocation à changer.
