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

Les Phases 0, 1, 2 et 3 sont TERMINÉES et validées. Ne les refais pas, ne les rediscute pas.

## État

Phases 0, 1 et 2 : DONE. **Phase 3 (Internationalisation) : DONE (2026-08-14)** — 9 tâches sur 9,
cinq critères de sortie satisfaits, chacun vérifié par une exécution. **436 tests**, couverture
**100 %** sur les quatre métriques (globale comprise), 17 mutations appliquées au code de production
et toutes tuées. `make ci` vert.
Phase 4 (Portfolio HTML) : à ouvrir, aucune tâche démarrée. **C'est la dernière phase de la tranche T1.**

**Tout est sur `main` et déployé.** PR #10 (Phase 2) fusionnée le 2026-08-14, PR #11 (Phase 3) le
2026-08-15 — les cinq jobs de la CI verts, image publiée sur GHCR, VPS mis à jour. Aucune branche en
attente : la prochaine phase repart d'un `main` propre.

⚠️ **Le site est volontairement fermé au public** : Cloudflare Access, OTP par e-mail, tant que le
portfolio n'est pas terminé. Une requête anonyme reçoit une 302 vers `cloudflareaccess.com` — **ce
n'est pas une panne**, et j'ai commencé à le diagnostiquer comme telle une fois. Ce qui fait foi est
`gh run list --branch main --limit 1`. Détail et conséquences : `deploy/README.md` §4.2.

**À traiter avant de lever Access**, et pas avant : le contenu d'amorçage de P2-10 est publié sur
`/fr` et `/en`, et chaque fichier porte « à remplacer en P2-11 ». Tant qu'Access est actif, aucun
moteur ne le voit. Le jour où il tombe, soit P2-11 est écrite, soit un `noindex` est posé.

Ce qui a été ajouté par la Phase 3 et ne doit pas être redécouvert :

- **Routage par locale** : `src/app/[locale]/` est le layout **racine** — il n'y a plus de
  `app/layout.tsx`. C'est ce qui permet à `<html lang>` de porter la langue réelle. `/` n'est pas
  une page mais une redirection, faite par `src/proxy.ts` (Next 16.3 déprécie `middleware.ts`).
- **Métadonnées** : `src/seo/metadata.ts` produit `title`, `description`, `canonical` et `hreflang`
  en un seul endroit. Le sitemap et le sélecteur de langue lisent la **même** source d'alternatives
  (`src/routing/alternates.ts`) : ils ne peuvent pas se contredire.
- **`sitemap.xml` et `robots.txt`** dérivés du Content Layer. `robots.txt` n'interdit **pas**
  `/resume/` — le bloquer empêcherait le robot de lire le `noindex` qui, lui, fait le travail.
- **Dictionnaires d'interface** (`src/i18n/messages/`) : une clé manquante **ne compile pas**.
- **`src/ui/`** : `SiteNav`, `LanguageSwitcher`, `EntityList`, `DateRange` — tous testés, tous sans
  style (l'ADR-0010 est en P4-01).
- **Un gate de plus** : `scripts/check-static-rendering.mts`, branché sur `pnpm build`, refuse toute
  route qui se rendrait à la demande **et** toute page prégénérée absente du sitemap. Il prend sa
  racine en argument, donc il est testé contre des manifestes fabriqués.
- **Les gates ne se gardent plus du zéro mais du sous-comptage** : `check-bundle-budget` confronte
  ses pages mesurées à celles que Next déclare. C'est ce qui aurait attrapé le défaut « 4 pages
  sur 20 » de cette phase.

Ce qui existait déjà et fonctionne, à ne pas redécouvrir non plus :

- Squelette Next.js 16 / React 19, TypeScript strict, ESLint avec règles de cloisonnement,
  Vitest + Playwright, environnement 100 % dockerisé (`make`).
- CI GitHub Actions en cinq jobs : versions → gates → E2E contre l'image de production →
  publication GHCR taguée par SHA → déploiement SSH. `main` est protégée, gates non contournables.
- VPS Hetzner CX23 (Debian 13, Nuremberg), durci ; rollback **exécuté pour de vrai** (9 s).
- Domaine `aurelienfeignon.com`, zone Cloudflare, proxy *Full (strict)*, SPF/DKIM/DMARC publiés.
  L'origine n'accepte plus que les plages Cloudflare, filtrées dans `DOCKER-USER`.
- **Content Layer complet** (`src/content/`) : schémas Zod stricts, dépôt typé, tris, cohérence
  référentielle. `make check-content` casse le build.
- **Rendu MDX** (`src/ui/mdx/`) avec liste blanche, qui refuse **avant** de rendre. Aucune page ne
  l'appelle encore : c'est P4-05.

⚠️ Contraintes héritées, à ne pas défaire par mégarde :

- **`SITE_URL` est un argument de construction**, pas seulement une variable d'exécution : les
  `canonical`, `hreflang` et le sitemap sont gravés dans le HTML statique. L'image n'est plus neutre
  vis-à-vis du domaine (ADR-0008 amendé). ⚠️ `env_file` de Compose l'emporte sur l'`ENV` de l'image :
  les deux valeurs **doivent** coïncider — c'est un point de la checklist de P4-15.
- **Aucune route ne doit pouvoir se rendre à la demande** : `content/` n'est pas dans l'image. Le
  gate le vérifie, ne le contourne pas.
- `package.json` porte `"type": "module"` et les imports relatifs de `src/content/**` portent leur
  extension `.ts` — c'est ce qui rend la couche exécutable par `node` seul.
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
  ⚠️ `pnpm build` appelé directement dans le conteneur de développement échoue au prérendu :
  `NODE_ENV` y vaut `development`. `make bundle` et `make build` passent déjà `NODE_ENV=production`.
- Une tâche n'est DONE que si : implémentation finie, code typé, tests pertinents ajoutés et
  verts, lint vert, zéro erreur TypeScript, doc à jour, critères d'acceptation satisfaits,
  aucune dette introduite silencieusement.
- Petits incréments : une tâche → implémentation → test → validation.
- Ne jamais supprimer ni affaiblir un test pour verdir la suite sans justification fonctionnelle.
- Les identifiants de tâches (P1-01…) sont stables et ne sont JAMAIS réutilisés.
- Aucune dépendance structurante sans justifier : problème / pourquoi adaptée / alternatives /
  pourquoi préférée. Écris-le dans un ADR si la décision est structurante.
- **Avant CHAQUE push : `/code-review` puis `/simplify`**, et traite les retours avant de pousser.
- **Heures de publication** : je travaille pour mon employeur 9h-12h30 et 14h-17h30 (heure de Paris),
  et le dépôt est public. Dans ces créneaux, commite localement mais **demande avant de pousser**.
  En dehors, pousse et ouvre les PR sans demander. La **fusion**, elle, se demande toujours.
- Mets à jour docs/roadmap.md (statuts) au fil de l'eau, pas à la fin.
- Documentation et échanges en français ; identifiants, code et noms de fichiers en anglais.

## Ta mission cette session

**Commence par me faire trancher le bloc « Décisions » ci-dessous.** Pose-les-moi groupées, avec ta
recommandation, et n'attends pas mes réponses pour ce qui n'en dépend pas. Puis, dans cet ordre :

1. **P2-11 — la rédaction du contenu réel**, dès que D1 est tranchée : tu as les deux versions du
   CV, tu peux en écrire l'essentiel toi-même. C'est le chemin critique de T1, et **c'est ce qui
   bloque P4-13**, la mise en production.

   Pour lire les PDF : l'hôte n'a ni `poppler-utils` ni Node (ADR-0007). Conteneur jetable :

   ```bash
   docker run --rm -v "$PWD/public/resume:/cv:ro" -v "$PWD/.tmp:/out" debian:trixie-slim \
     sh -c 'apt-get -qq update && apt-get -qq install -y poppler-utils &&
            pdftotext -layout /cv/cv-fr.pdf /out/cv-fr.txt &&
            pdftotext -layout /cv/cv-en.pdf /out/cv-en.txt'
   ```

   Deux garde-fous : **mon téléphone et mon adresse e-mail n'entrent jamais dans `content/`** — ils
   relèvent de la page contact en Phase 10 —, et tu ne transposes que ce que le CV dit. Ce qu'il ne
   dit pas, tu me le demandes. `.tmp/` n'est pas dans `.gitignore` : sors-en les fichiers.

2. **PHASE 4 — Portfolio HTML** (P4-01 à P4-16), qui n'en dépend pas **sauf P4-13**.

Si je ne réponds pas, ouvre la Phase 4 et signale ce qui reste en attente. Ne simule jamais une
réponse à ma place.

---

## Décisions qui m'attendent

Format des réponses : « D1 = …, défaut partout ailleurs » suffit.

**D1 🔴 — `company` et `role` pour Augure et Askor ?** *(reposée : elle bloque toujours)*
Le CV les titre par leur **produit** (« AUGURE — PLATEFORME PRÉDICTIVE TEMPS RÉEL »), jamais par un
employeur ni un intitulé de poste. Le schéma exige les deux, et les deux périodes sont données comme
simultanées. → *Sans réponse, je ne peux pas écrire les expériences : je refuse d'inventer un
employeur. Réponds en une ligne : « Augure = <société> / <intitulé> ; Askor = <société> /
<intitulé> ».*

**D2 🟠 — Photos de ton poste de travail ?** (question Q17, qui arrive en Phase 8)
→ *Recommandation : les rassembler quand tu y penses, sans urgence. C'est l'élément qui distingue ce
portfolio d'une démo Three.js, et ça ne coûte rien de le préparer tôt.*

**D3 🟢 — Rendre le paquet GHCR public ?** *(reposée : je n'ai pas pu le faire)*
Tu l'avais accepté, mais mon jeton `gh` local n'a pas la portée `read:packages`.
→ *Action manuelle : GitHub → Packages → portfolio → Package settings → Change visibility → Public.
Puis sur le VPS : `docker logout ghcr.io && rm /srv/portfolio/.ghcr-token`, et retirer le
`docker login` de `deploy.sh`. Bénéfice : plus de PAT à renouveler, donc plus de déploiement qui
s'arrête un jour sans rapport apparent avec le code.*

---

Puis : ouvre la PHASE 4 — Portfolio HTML (tâches P4-01 à P4-16, détaillées dans roadmap.md).

Objectif : un portfolio **complet et utilisable sans Three.js**. C'est le socle de tout le reste et
le filet de sécurité permanent du projet — et c'est le jalon T1.

Quatre points de méthode propres à cette phase :

- **P4-01 crée l'ADR-0010** (stratégie de style) **avant** d'écrire le moindre composant stylé. Rien
  n'est stylé aujourd'hui, délibérément.
- **Le corps MDX n'est rendu par aucune page.** P4-05 sera la première : c'est là que les ~7 Mo de
  runtime MDX entreront dans l'image de production, qui est à **385 Mo** pour un seuil bloquant à
  400. La marge est de 15 Mo. Mesure avant et après, ne découvre pas.
- **Le site n'a aujourd'hui aucun composant client** (0,0 Ko de JS propre sur 18 routes) : la
  navigation est faite de balises `<a>`. C'est ce qui rend le profil `no-js` vrai par construction.
  Si P4-02 introduit `next/link`, mesure ce que ça coûte et écris-le.
- **P4-13 dépend de P2-11.** Ne mets pas en production un site rempli de contenu d'amorçage.

Avant de coder, applique la méthode de phase : objectif, décisions à prendre, tâches, tests
correspondants, critères de sortie. Puis implémente par incréments.

À la fin de la phase, produis un bilan : fait / dérives / reporté.

## Contexte de planning

Objectif : portfolio documentaire EN LIGNE début septembre 2026 (tranche T1 = Phases 1 à 4 +
P4-13 à P4-16). La 3D vient après, par incréments, sur le site déjà en ligne.
Le chemin critique n'est pas technique : c'est la rédaction du contenu (P2-11).

## Points encore ouverts

Aucun ne bloque la Phase 4 — sauf le premier, qui bloque sa mise en production.

- **Le site est volontairement fermé au public.** `aurelienfeignon.com` est derrière Cloudflare
  Access (OTP par e-mail) tant que le portfolio n'est pas terminé. Une requête anonyme renvoie une
  302 vers `cloudflareaccess.com` : **ce n'est pas une panne**, et ce qui fait foi est la conclusion
  du workflow CI sur `main`. Conséquence : P4-16 (vérification post-déploiement) suppose de lever
  Access, et aucun moteur n'atteint le site d'ici là — ce qui retire d'ailleurs son urgence au
  `noindex` de D1. Détail : `deploy/README.md` §4.2.
- **P2-11, la rédaction du contenu réel, est le chemin critique de T1** et n'a pas commencé. Le
  format est figé, vérifié par `make check-content`, et deux règles d'écriture sont dans
  `content/README.md` — dont celle qui a déjà mordu : une valeur contenant `: ` doit être entre
  guillemets.
- **`SITE_URL` a deux sources en production** : l'`ENV` de l'image et l'`env_file` de Compose, ce
  dernier l'emportant. À vérifier dans la checklist de P4-15.
- **La marge sous le seuil d'image est de 15 Mo** (385 Mo pour 400), et la Phase 4 y ajoutera ~7 Mo.
- **`dynamicParams = false` des pages de détail est inerte**, la valeur du segment parent étant
  héritée. Conservé pour une restructuration future, mais ce n'est pas ce qui protège aujourd'hui —
  c'est le gate.
- **`content/` est parfaitement symétrique** : le cas « entité non traduite » n'existe que dans les
  fixtures. Aucun E2E ne peut l'exercer tant que P2-11 n'aura pas produit une entité réellement non
  traduite.
- **Gabarit de titre** (`%s — <nom du site>`) reporté en P4-08 : il suppose de décider l'identité de
  marque. Les titres sont aujourd'hui nus (« Projets », « Augure »).
- **`aria-current` sur le lien de section actif** reporté en P4-02 : le layout ne connaît pas la
  section affichée.
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
