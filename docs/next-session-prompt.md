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
11. docs/phase-4-log.md       ← ⭐⭐ journal de la phase EN COURS, et le plus important de tous.
                                 Il est long, et c'est voulu : §13 à §18 portent SIX défauts déjà
                                 livrés, dix arbitrages tranchés, et ce que chaque tâche refuse
                                 d'affirmer. Le résumé ci-dessous ne le remplace pas.
12. deploy/README.md          ← exploitation réelle du serveur : déploiement, rollback, journaux
13. content/README.md         ← règles d'écriture du contenu, et deux réserves à corriger

Les Phases 0, 1, 2 et 3 sont TERMINÉES et validées. Ne les refais pas, ne les rediscute pas.

## État

Phases 0 à 3 : **DONE**. **Phase 4 (Portfolio HTML) : en cours**, 13 tâches sur 17 closes.
**Tout ce qui est ci-dessous est fusionné sur `main` et déployé**, CI verte à chaque fois.

| Tâche | Ce qu'elle a livré |
|---|---|
| P4-01 | ADR-0010 : CSS Modules + tokens, décidé sur une exécution |
| P4-02 | Layout documentaire, `aria-current`, identité « Aurélien Feignon » |
| P4-03 | Accueil : `SectionGuide` qui **dit** ce que chaque section contient |
| P4-04 | Liste et fiche des expériences |
| P4-17 | **Précision variable des dates** (`AAAA` / `AAAA-MM` / `AAAA-MM-JJ`) |
| P4-06 | Compétences groupées par catégorie, **niveaux non publiés** (D2) |
| P4-05 | Liste et fiche des projets, **premier corps MDX rendu** |
| P4-07 | 404 et pages d'erreur **localisées**, servies par réécriture du proxy |
| P4-08 | Gabarit de titre, OpenGraph, image de partage, icône |
| P4-09 | JSON-LD : `Person`, `WebSite`, `CreativeWork`, `BreadcrumbList` |
| P4-10 | Passe accessibilité, **périmètre dérivé du sitemap** ; plancher `globalNotFound` |
| P4-11 | Responsive : débordement, cibles tactiles et rognage sur 16 pages × 5 largeurs |
| P4-12 | Parcours complets, et l'**inventaire des 14 scénarios devenu un garde** |

**Reste : P4-13 à P4-16** — c'est-à-dire le jalon **T1**, la mise en production.

### ⛔⛔ Ce qui fait foi pour juger d'un déploiement

**Le site est volontairement FERMÉ au public**, derrière Cloudflare Access (OTP par e-mail), et le
restera tant que le portfolio n'est pas terminé. **Une requête anonyme reçoit une 302 vers
`cloudflareaccess.com` : ce n'est PAS une panne**, et cela y ressemble beaucoup. Ce qui fait foi est
la conclusion du workflow — les cinq jobs, publication GHCR et déploiement VPS compris :

```bash
gh run list --branch main --limit 1
```

Conséquence pour **P4-16** : la vérification post-déploiement — indexation, `canonical`, `hreflang`,
`sitemap.xml` observés **depuis l'extérieur** — est impossible tant qu'Access est actif. Lever Access
fait partie de la mise en ligne réelle. Détail : `deploy/README.md` §4.2.

### Ce que la Phase 4 coûte, remesuré après P4-12

| Relevé | Valeur (2026-08-16) | Seuil |
|---|---|---|
| JS propre à chaque route | **8,2 Ko** — le seul JavaScript applicatif du site | cible 25 · bloquant 40 |
| Socle partagé | **126,4 Ko** | cible 136 · bloquant 146 |
| Image de production | **273 Mo** | cible 250 · bloquant 400 |
| Tests | **631** verts, couverture **100 %** | ≥ 80 % |
| E2E | **144** verts sur 5 profils, 0 violation axe sur les **16 pages servies** | — |

⛔ **Le profil `no-js` n'est plus vrai *par construction*** : il l'est **par vérification**. Les
frontières d'erreur sont des composants client, et c'est tout le JavaScript applicatif du site.

⚠️ **Le site dépend d'un drapeau expérimental** : `experimental.globalNotFound` (Next 16.3) pose le
plancher qui donne un `lang` aux voies que le proxy n'atteint pas. Sa stabilisation — ou son retrait —
est un déclencheur de réexamen ; un parcours garde l'effet, donc le retrait se verrait.

### ⭐⭐⭐ Les six leçons que la Phase 4 a payées, et qui valent pour la suite

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
6. **`/code-review` puis `/simplify` avant chaque push, sans exception.** Sur les cinq dernières
   tâches ils ont trouvé **plus de trente défauts réels** sur du code dont tous les gates étaient
   verts — dont plusieurs régressions introduites par la tâche même qui les corrigeait.

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

**Enchaîne sur P4-13** — la **mise en production du portfolio documentaire**, jalon **T1**. Puis
P4-14 (supervision), P4-15 (checklist et rollback) et P4-16 (vérification depuis l'extérieur, qui
suppose de lever Cloudflare Access).

⭐⭐⭐ **Ce que P4-12 a appris, et qui vaut pour P4-13 : la mission précédente était fausse sur trois
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

### ⛔⛔ Ce que P4-13 exige d'avoir vérifié AVANT

C'est une mise en production, et deux points l'attendent depuis la Phase 3 :

- **`SITE_URL` a deux sources** — l'`ENV` de l'image et l'`env_file` de Compose, ce dernier
  l'emportant. Si `/srv/portfolio/.env` portait une autre origine, le site servirait des canoniques
  d'un domaine et des liens d'exécution d'un autre, **sans que rien n'échoue** (`phase-3-log.md`
  §17.4, dette 1).
- **`content/` n'est pas dans l'image** : aucune route ne doit pouvoir se rendre à la demande. Le
  gate le vérifie ; la checklist de P4-15 doit le redire plutôt que de le supposer acquis.

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
**Closes : D1, D3, D4, D7** (le 2026-08-16 pour les deux dernières).

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

Mettre à jour dans le bloc ci-dessus :

- la section **État** (phase terminée, phase suivante, tâches en cours) ;
- le bloc **Décisions qui m'attendent** : retirer celles qui ont été tranchées — en les reportant
  dans `phase-0-questions.md` ou dans un ADR selon leur portée — et y monter celles qui bloquent
  réellement la suite. Ce bloc n'a de valeur que s'il ne contient QUE des questions vivantes ;
- la liste des **ADR** si de nouveaux ont été créés ou amendés ;
- la section **Ta mission cette session** ;
- les **points encore ouverts**.

Le reste est stable et n'a pas vocation à changer.
