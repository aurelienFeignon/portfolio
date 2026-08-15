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

Phases 0, 1, 2 et 3 : **DONE**. **P2-11 (rédaction du contenu réel) : DONE (2026-08-15)** — le
chemin critique de la tranche T1 est levé.

**Tout est sur `main` et déployé.** Quatre PR fusionnées les 14 et 15 août (#10 Phase 2, #11 Phase 3,
#12 documentation, #13 contenu réel), les cinq jobs de la CI verts à chaque fois, image publiée sur
GHCR et VPS à jour. **Aucune branche en attente** : la prochaine phase repart d'un `main` propre.

Phase 4 (Portfolio HTML) : à ouvrir, aucune tâche démarrée. **C'est la dernière phase de la tranche
T1**, celle qui met le portfolio documentaire en ligne.

⚠️ **Le site est volontairement fermé au public** : Cloudflare Access, OTP par e-mail, tant que le
portfolio n'est pas terminé. Une requête anonyme reçoit une 302 vers `cloudflareaccess.com` — **ce
n'est pas une panne**, et je l'ai fait diagnostiquer comme telle une fois. Ce qui fait foi pour juger
d'un déploiement est `gh run list --branch main --limit 1`. Détail : `deploy/README.md` §4.2.

Ce qui existe et fonctionne, à ne pas redécouvrir :

- **Contenu réel** (`content/`), par locale : 2 expériences — Augure, et Askor chez EVEA Conseil —,
  1 projet (ce portfolio) et 40 compétences en cinq catégories, dont dix `featured`. 86 fichiers
  validés par `make check-content`, qui casse le build.
- **Content Layer** (`src/content/`) : schémas Zod stricts, dépôt typé, tris et dérivations,
  cohérence référentielle `technologies` ↔ `Skill.slug` **par locale**.
- **Routage par locale** : `src/app/[locale]/` est le layout **racine** — il n'y a plus de
  `app/layout.tsx`, et c'est ce qui permet à `<html lang>` de porter la langue réelle. `/` n'est pas
  une page mais une redirection négociée (`src/proxy.ts`, 307 + `Vary` ; Next 16.3 déprécie
  `middleware.ts`).
- **Métadonnées et SEO** : `src/seo/` produit `title`, `description`, `canonical` et `hreflang` en un
  seul endroit ; `src/seo/hreflang.ts` est la **seule** construction de la carte des langues, que le
  sitemap et le sélecteur de langue lisent aussi — ils ne peuvent donc pas se contredire (R-07).
- **`sitemap.xml` et `robots.txt`** dérivés du Content Layer. `robots.txt` n'interdit **pas**
  `/resume/` : le bloquer empêcherait le robot de lire le `noindex` qui, lui, fait le travail.
- **Dictionnaires d'interface** (`src/i18n/messages/`) : une clé manquante **ne compile pas**.
- **`src/ui/`** : `SiteNav`, `LanguageSwitcher`, `EntityList`, `DateRange` — tous testés, tous **sans
  style** (l'ADR-0010 est en P4-01).
- **Quatre gates**, branchés sur `pnpm build` ou `make ci`, et tous **vus échouer** : contenu
  invalide, budget de bundle, rendu statique, cloisonnement des couches par ESLint. Ils ne se gardent
  plus du zéro mais du **sous-comptage** : chacun confronte son compte à ce que Next déclare.
- Squelette Next.js 16 / React 19, TypeScript strict, Vitest + Playwright, environnement 100 %
  dockerisé (`make`). CI en cinq jobs, `main` protégée, gates non contournables.
- VPS Hetzner CX23 durci, rollback **exécuté pour de vrai** (9 s). Domaine `aurelienfeignon.com`,
  zone Cloudflare, proxy *Full (strict)*, SPF/DKIM/DMARC publiés, origine fermée à tout ce qui ne
  vient pas de Cloudflare.
- **Rendu MDX** (`src/ui/mdx/`) avec liste blanche, qui refuse **avant** de rendre. Aucune page ne
  l'appelle encore : c'est P4-05.

⚠️ Contraintes héritées, à ne pas défaire par mégarde :

- **`SITE_URL` est un argument de construction**, pas seulement une variable d'exécution : les
  `canonical`, `hreflang` et le sitemap sont gravés dans le HTML statique. L'image n'est plus neutre
  vis-à-vis du domaine (ADR-0008 amendé). `env_file` de Compose l'emporte sur l'`ENV` de l'image :
  les deux valeurs **doivent** coïncider — point de la checklist de P4-15.
- **Aucune route ne peut se rendre à la demande** : `content/` n'est pas dans l'image de production.
  `scripts/check-static-rendering.mts` le vérifie **et** exige que chaque page prégénérée figure au
  sitemap. Ne le contourne pas.
- `pnpm build` appelé **directement** dans le conteneur de développement échoue au prérendu :
  `NODE_ENV` y vaut `development`. `make bundle` et `make build` passent déjà `NODE_ENV=production`.
- `package.json` porte `"type": "module"` et les imports relatifs de `src/content/**` portent leur
  extension `.ts` — c'est ce qui rend la couche exécutable par `node` seul, donc le gate possible.
- La liste blanche MDX n'est **pas** une barrière de sécurité (MDX exécute du JavaScript).
- `ufw` ne gouverne PAS les ports publiés par un conteneur, et le port 22 ne peut pas être restreint
  à une IP tant que le déploiement part des runners GitHub (`deploy/README.md` §1.1 et §6.3).

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

**Ouvre la PHASE 4 — Portfolio HTML** (P4-01 à P4-16, détaillées dans roadmap.md). Pose-moi d'abord
le bloc « Décisions » ci-dessous, groupé, avec ta recommandation — mais n'attends pas mes réponses
pour commencer : aucune ne bloque le démarrage.

Objectif : un portfolio **complet et utilisable sans Three.js**. C'est le socle de tout le reste, le
filet de sécurité permanent du projet, et le jalon T1.

Cinq points de méthode propres à cette phase :

- **P4-01 crée l'ADR-0010** (stratégie de style) **avant** d'écrire le moindre composant stylé. Rien
  n'est stylé aujourd'hui, délibérément.
- **Le corps MDX n'est rendu par aucune page.** P4-05 sera la première : c'est là que les ~7 Mo de
  runtime MDX entreront dans l'image de production, qui est à **385 Mo** pour un seuil bloquant à
  400. La marge est de 15 Mo. Mesure avant et après, ne découvre pas.
- **Le site n'a aujourd'hui aucun composant client** : 0,0 Ko de JS propre sur 16 routes, la
  navigation étant faite de balises `<a>`. C'est ce qui rend le profil `no-js` vrai par construction.
  Si P4-02 introduit `next/link`, mesure ce que ça coûte et écris-le.
- **P4-13 n'est plus bloquée par le contenu** (P2-11 est faite). Restent les critères de sortie de la
  phase : Lighthouse mobile ≥ 85, a11y 100, SEO 100, zéro violation axe serious/critical.
- **P4-16 suppose de lever Cloudflare Access.** Vérifier l'indexation, les `canonical`, les
  `hreflang` et le sitemap **depuis l'extérieur** est impossible tant qu'il protège le site. Lever
  Access fait partie de la mise en ligne, au même titre que le déploiement. Une chose reste à
  vérifier ce jour-là : Cloudflare sert son propre `robots.txt` managé, qui remplacerait celui de
  l'application et sa directive `Sitemap:`.

Avant de coder, applique la méthode de phase : objectif, décisions à prendre, tâches, tests
correspondants, critères de sortie. Puis implémente par incréments.

À la fin de la phase, produis un bilan : fait / dérives / reporté.

---

## Décisions qui m'attendent

Aucune ne bloque le démarrage de la Phase 4. Format des réponses : « D1 = …, défaut partout
ailleurs » suffit.

**D1 🟠 — Les vrais mois de début d'Askor et d'Augure.**
Le CV ne donne que les années (2021, 2025) et le schéma exige un jour : j'ai mis le 1ᵉʳ janvier, en
le signalant plutôt qu'en le taisant. → *Donne-moi les deux mois, je corrige deux fichiers par
locale. Sans réponse, je laisse tel quel — c'est faux d'au plus onze mois, et invisible tant
qu'aucune page n'affiche les dates.*

**D2 🟠 — Relire les niveaux de compétence (1 à 5).**
Les 40 niveaux sont une proposition, déduite de la place que chaque technologie occupe dans tes
expériences. → *C'est un jugement sur toi-même, il ne se délègue pas — mais il se corrige vite :
dis-moi seulement ceux qui te paraissent faux. Dix compétences sont `featured` : TypeScript, Python,
Node.js, React, Next.js, PostgreSQL, Docker, microservices, architecture événementielle, intégration
de modèles de langage.*

**D3 🟠 — Un seul projet publié, est-ce voulu ?**
`content/*/projects/` ne contient que ce portfolio : ton CV ne cite aucun autre projet, Augure et
Askor étant des expériences. → *Un portfolio à un seul projet est maigre pour un CTO venu évaluer ta
profondeur technique sur une ou deux réalisations (persona B). Si tu as quelque chose à montrer pour
lui-même — travail open source, side project, réalisation détachable —, c'est un fichier par locale.
Sinon on assume, et la page Projets restera légère.*

**D4 🟠 — Augure : expérience ou projet ?**
Aujourd'hui c'est une **expérience**, avec `company: Augure` — ce qui nomme le produit dont tu es
propriétaire, comme le fait ton CV. → *Recommandation : laisser ainsi. Je le repose une dernière fois
parce que l'absence d'employeur rendrait le rangement en « projet » tout aussi défendable, et que
c'est un fichier par locale à déplacer. Après quoi je ne le rouvre plus.*

**D5 🟠 — Photos de ton poste de travail ?** (question Q17, qui arrive en Phase 8)
→ *Recommandation : les rassembler quand tu y penses, sans urgence. C'est l'élément qui distingue ce
portfolio d'une démo Three.js, et ça ne coûte rien de le préparer tôt.*

**D6 🟢 — Rendre le paquet GHCR public ?** *(action manuelle, je n'ai pas les droits)*
Mon jeton `gh` local n'a pas la portée `read:packages`. → *GitHub → Packages → portfolio → Package
settings → Change visibility → Public. Puis sur le VPS : `docker logout ghcr.io && rm
/srv/portfolio/.ghcr-token`, et retirer le `docker login` de `deploy.sh`. Bénéfice : plus de PAT à
renouveler, donc plus de déploiement qui s'arrête un jour sans rapport apparent avec le code.*

## Contexte de planning

Objectif : portfolio documentaire EN LIGNE début septembre 2026 (tranche T1 = Phases 1 à 4 +
P4-13 à P4-16). La 3D vient après, par incréments, sur le site déjà en ligne.
Le chemin critique — la rédaction du contenu — est **levé** depuis le 2026-08-15.

## Points encore ouverts

- **La marge sous le seuil d'image est de 15 Mo** (385 Mo pour 400), et P4-05 y ajoutera ~7 Mo de
  runtime MDX avec la première page qui rend un corps.
- **`SITE_URL` a deux sources en production** : l'`ENV` de l'image et l'`env_file` de Compose, ce
  dernier l'emportant. À vérifier dans la checklist de P4-15.
- **`content/` est parfaitement symétrique** : le cas « entité non traduite » n'existe que dans les
  fixtures. Aucun E2E ne peut l'exercer tant qu'une entité réellement non traduite n'existe pas.
- **`dynamicParams = false` des pages de détail est inerte**, la valeur du segment parent étant
  héritée. Conservé pour une restructuration future, mais ce n'est pas ce qui protège aujourd'hui —
  c'est le gate.
- **Gabarit de titre** (`%s — <nom du site>`) reporté en P4-08 : il suppose de décider l'identité de
  marque. Les titres sont aujourd'hui nus (« Projets », « Augure »).
- **`aria-current` sur le lien de section actif** reporté en P4-02 : le layout ne connaît pas la
  section affichée.
- **Mise en forme des dates** (« mars 2022 ») reportée en P4-04 et P4-05 : elle suppose de choisir
  une précision d'affichage, laissée au rendu par P2-02.
- **Deux déclencheurs chiffrés**, mesurés en Phase 3 et à ne pas redécouvrir : la revalidation Zod du
  dépôt coûte ≈ 120·N² µs et mérite un regard **vers 50 entités par section** (aujourd'hui : 40
  compétences, 2 expériences) ; et la cascade E2E de R-07 croît linéairement avec le sitemap.
- **La liste blanche MDX n'est pas une barrière de sécurité** : à reprendre tel quel à l'audit de la
  Phase 14.
- **Mesure CPU en régime stable** (P11-08) : le seul relevé date d'une minute après démarrage —
  32 %, au-dessus du seuil d'alerte de 25 %. Ce n'est pas une mesure valide.
- **Procédure de restauration du serveur** (risque R-23) : Hetzner restreint par intermittence la
  création d'instances. À écrire sous cette contrainte en Phase 15.
- **Plages Cloudflare** : un timer hebdomadaire les rafraîchit sur le VPS.
  `sudo /srv/edge/sync-cloudflare-origin-firewall.sh --check` sort en 1 s'il y a dérive.
- Questions Q3 à Q6, Q8, Q9, Q11, Q14 à Q19 de docs/phase-0-questions.md : applique la
  recommandation par défaut et signale-le, ne me bloque pas dessus.

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
- la liste des **ADR** si de nouveaux ont été créés ou amendés ;
- la section **Ta mission cette session** ;
- les **points encore ouverts**.

Le reste est stable et n'a pas vocation à changer.
