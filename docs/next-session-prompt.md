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
11. deploy/README.md          ← exploitation réelle du serveur : déploiement, rollback, journaux
12. content/README.md         ← règles d'écriture du contenu, et deux réserves à corriger

Les Phases 0, 1, 2 et 3 sont TERMINÉES et validées. Ne les refais pas, ne les rediscute pas.

## État

Phases 0 à 3 : **DONE**. **Phase 4 (Portfolio HTML) : en cours**, 7 tâches sur 17 closes.

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

**Reste : P4-07 à P4-16.** Le journal de phase (`phase-4-log.md`) documente chacune, y compris ce que
la revue a renversé — lis-le, il porte l'essentiel des leçons.

### ⚠️ P4-07 est EN COURS, sur une branche, non fusionnée

Branche `feat/p4-07-not-found`, commit `23f37bb`, **poussée**. C'est un commit de travail : ne pas
fusionner en l'état.

**Ce qui fonctionne et est mesuré sur l'image de production :**

    /fr/projects/inconnu  404 | lang=fr | Page introuvable
    /fr/rien              404 | lang=fr | Page introuvable
    /de/projects          404 | lang=fr | Page introuvable
    /rien                 404 | lang=fr | Page introuvable
    /en/rien (accept:fr)  404 | lang=en | Page not found     <- l'URL l'emporte sur l'en-tete
    /fr/projects          200 | lang=fr | Projets            <- inchange

**Ce qui reste à faire, dans l'ordre :**

1. ⛔ **La confrontation manifeste ↔ sitemap dans `scripts/check-static-rendering.mts`.** Le proxy a
   besoin de la liste des chemins servis **avant** `next build` ; le sitemap est un produit de ce
   build. Ce sont donc **deux énumérations**, et deux énumérations qui divergent sont exactement la
   panne que décrit R-07. Rien ne les confronte encore. C'est le premier point, et il n'est pas
   optionnel.
2. La page d'erreur : `error.tsx` et `global-error.tsx`, avec le même traitement de langue. ⚠️
   `global-error.tsx` doit rendre son propre `<html>`/`<body>` — c'est la seule exception de Next, et
   elle est documentée.
3. Les parcours E2E : la 404 en français avec ses liens de secours, et **un audit axe sur la 404** —
   c'est le parcours qui manquait et qui aurait vu la violation WCAG 3.1.1.
4. La documentation : `phase-4-log.md` §13 (les trois sondes y sont déjà résumées dans le message de
   commit, à reprendre), `roadmap.md`, et `architecture.md` §4.2 dont le proxy contredit désormais la
   description (« il ne s'exécute que sur `/` »).
5. `/code-review` puis `/simplify`, puis PR.

**Le raisonnement à ne pas refaire** — trois sondes l'ont établi, et il est dans le commit :
`[locale]/not-found.tsx` n'est **jamais** atteint (`dynamicParams = false` fait du slug inconnu un
échec de *routage*, pas un `notFound()`) ; `app/not-found.tsx` est rendu mais **hors de tout layout
racine**, le nôtre vivant sous `[locale]` — donc sans `<html lang>` ; lui faire rendre sa propre
enveloppe produit **deux** `<html>` ; un groupe de routes avec son propre layout racine n'est pas
retenu. La voie choisie avec l'utilisateur est donc la réécriture par le proxy vers une vraie page
prérendue.

⚠️ **Le statut est porté par la réécriture** (`{ status: 404 }`). Une réécriture rend 200 par défaut :
servir le bon contenu avec le mauvais statut dirait à un moteur de recherche que la page existe.

⚠️ **Le site est volontairement fermé au public** : Cloudflare Access, OTP par e-mail. Une requête
anonyme reçoit une 302 vers `cloudflareaccess.com` — **ce n'est pas une panne**. Ce qui fait foi pour
juger d'un déploiement est `gh run list --branch main --limit 1`. Détail : `deploy/README.md` §4.2.

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

**Termine P4-07**, puis enchaîne sur P4-08 (métadonnées OpenGraph et gabarit de titre) et la suite de
la Phase 4. La liste des cinq points restants de P4-07 est dans « État » ci-dessus, dans l'ordre.

Cinq points de méthode que la Phase 4 a payés cher, et qui valent pour la suite :

⭐⭐⭐ **Un nombre recopié et jamais remesuré finit par décider seul.** L'image de production était
annoncée à 385 Mo dans quatre documents ; elle en pèse **268,6**. Ce chiffre avait réordonné la
phase — P4-05 était traitée comme « le seul sujet à risque » avec 15 Mo de marge, alors qu'il y en a
131 et que le runtime MDX coûte 0,5 Mo. **Remesure avant de t'appuyer sur un chiffre.**

⭐⭐⭐ **Un seuil que rien ne fait respecter n'est pas un seuil.** Celui de 400 Mo était écrit dans le
budget et appliqué nulle part : la CI écrivait la taille dans son résumé et n'en faisait rien. Il est
bloquant depuis P4-05 (`make check-image-size`). Quand tu vois un seuil documenté, **vérifie qui le
lit**.

⭐⭐⭐ **Un test neuf doit être vu rouge avant d'être cru.** La revue a trouvé, tâche après tâche, des
gardes qui ne pouvaient pas échouer : une liste désignée par sa **position** qui visait le sélecteur
de langue, une boucle sur une collection qui pouvait être vide, un motif de slug qui exigeait un tiret
que les technologies réelles n'ont pas. Trois fois la même forme. **Mutation-teste tes gardes** —
c'est devenu la pratique du dépôt, et elle a payé à chaque fois.

⭐⭐ **N'affiche jamais comme un fait une valeur d'attente.** Les dates portaient des 1ᵉʳ janvier
inventés ; les 40 niveaux de compétence sont une proposition non relue et **ne sont pas affichés**
(décision D2, ouverte). Le contrat le tient — `SkillGroup` ne porte que `{ slug, name }` — pas le
test, qui n'est qu'un filet.

⭐⭐ **`/code-review` puis `/simplify` avant chaque push, sans exception.** Sur les six tâches de cette
phase, ils ont trouvé **entre 4 et 9 défauts réels à chaque fois**, sur du code dont tous les gates
étaient déjà verts — dont trois régressions visibles qu'aucun gate ne pouvait voir : un mur de texte
(spécificité CSS), une carte sans indicateur de focus (`:has()`), 288 px de décalage (`margin-inline`
sur un élément flex). **Une régression purement visuelle ne se prouve que par une mesure géométrique.**

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

| Relevé | Valeur (2026-08-16) | Seuil |
|---|---|---|
| Image de production | **268,6 Mo** (base 229,1 + app 38,7) | cible 250 · **bloquant 400, appliqué** |
| JS propre à chaque route | **0,0 Ko** sur 18 routes | cible 25 · bloquant 40 Ko |
| Socle partagé | **129,5 Ko** | cible 136 · bloquant 146 Ko |
| Tests | **503** verts, couverture 100 % | — |
| E2E | 93 verts sur 5 profils | — |

⛔ **L'image dépasse la cible de 250 Mo depuis toujours**, et rien ne le disait avant que le gate ne
porte les deux paliers. `performance-budget.md` §7.1 tranche : ne rien changer, aucune image Node
officielle n'atteint 250 Mo.

**Dettes nommées, par ordre d'urgence :**

- ⛔ **La confrontation manifeste ↔ sitemap** (P4-07, point 1 ci-dessus). Deux énumérations sans
  garde, c'est R-07.
- ⚠️ **Le sélecteur de langue est rendu par chaque page**, à l'intérieur du `main` — inhabituel pour
  une commande de portée globale. Ses options dépendent de la page, donc un layout ne peut pas le
  rendre. Choix de gabarit, à trancher.
- ⚠️ **`architecture.md` §4.2 décrit un proxy qui « ne s'exécute que sur `/` »** — ce n'est plus vrai
  depuis P4-07. À amender avec la tâche.
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
