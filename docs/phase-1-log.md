# Journal de la Phase 1 — Fondation technique

> Ouverte le 2026-08-11.
> Ce document consigne, **au fil de l'eau**, les décisions prises pendant la phase, les mesures
> relevées et les écarts par rapport aux documents de Phase 0. Le bilan final (P1-16) le clôt.
> Les statuts des tâches restent dans [`roadmap.md`](./roadmap.md), seule source de vérité.

---

## 1. Objectif et critères de sortie

Rappel, sans reformulation : voir [`roadmap.md`](./roadmap.md) § « PHASE 1 ». Un squelette
dockerisé, typé, testé, vérifié en CI et effectivement déployable. Aucune fonctionnalité métier,
aucune dépendance Three.js.

## 2. Prérequis d'hôte constatés au démarrage

Relevé sur la machine de développement (Ubuntu 24.04 sous WSL2, 2026-08-11) :

| Vérification | Constat | Traitement |
|---|---|---|
| Projet dans le FS natif WSL2 | ✅ `/home/aurel/projects/portfolio` sur `/dev/sdd`, pas sous `/mnt/c` | Rien — condition du hot reload (R-13) satisfaite |
| Docker + Compose installés | ✅ Docker 29.2.1, Compose v5.1.0 | — |
| Accès au démon Docker | ❌ `permission denied` sur `/var/run/docker.sock` ; l'utilisateur n'est pas dans le groupe `docker` | **Bloquant** — `sudo usermod -aG docker $USER` puis nouvelle session |
| GNU Make | ❌ absent | **Bloquant** — voir §3 |
| Node sur l'hôte | ❌ absent | Conforme et voulu (ADR-0007) |
| Identité Git configurée | ❌ `user.name` / `user.email` vides | Aucun commit possible tant que ce n'est pas réglé |

Les deux points bloquants ont été levés en cours de session (`usermod -aG docker`,
`apt install make`), et l'identité Git posée au moment des premiers commits. Tout ce qui suit a donc
été **exécuté et vérifié**, jamais seulement écrit.

## 2 bis. Prérequis externes — état au 2026-08-11

Quatre prérequis ne relèvent pas du code. Ils sont listés ici pour qu'aucun ne soit découvert au
moment où il bloque.

| Prérequis | État | Ce qu'il bloque | Quand il devient bloquant |
|---|---|---|---|
| Accès au groupe `docker` + GNU Make | ✅ fait *(2026-08-11)* | **P1-02 → P1-16**, c'est-à-dire tout | levé |
| Nom de domaine (P1-17) | 🟡 **`aurelienfeignon.com` acheté et sécurisé chez Namecheap** *(2026-08-11 ; expire le 2027-08-11, renouvellement auto, verrou de transfert et WHOIS privé vérifiés au whois)* — SPF et DKIM publiés ; restent la validation Mailjet, DMARC, et le pointage vers le VPS | P1-15, P3-06, P10-11 | Phase 3 pour les URL canoniques ; avant la mise en ligne T1 |
| VPS (Q1) | ✅ **provisionné et durci** — Hetzner CX23, Debian 13 *(2026-08-11, `deploy/README.md` §1)* | P1-15 | levé |
| Dépôt GitHub distant | ✅ **public** — `aurelienFeignon/portfolio` *(2026-08-11)* | P1-14 (CI), P1-15 (GHCR) | levé |

**Lecture** : les deux prérequis d'hôte sont levés et le dépôt distant existe. Il reste le VPS,
qui ne bloque que P1-15. Le report de P1-15 est explicitement autorisé par la roadmap, à condition
que P1-13 et P1-14 soient `DONE` — ce qui reste atteignable, la construction et le démarrage de
l'image de production se vérifiant en local et en CI, sans serveur ni domaine.

Conséquence de planning : le domaine et le VPS n'ont **aucun impact sur le chemin critique de T1**
tant qu'on reste en Phase 1 à 3, mais ils conditionnent P4-13. Le domaine est le plus urgent des
deux : il est nécessaire dès la Phase 3 (URL canoniques, `hreflang`) et son délai de propagation et
de validation Mailjet est subi, pas maîtrisé.

## 3. Écart assumé : GNU Make devient un prérequis d'hôte

**Constat** — L'ADR-0007 affirme « l'hôte n'a besoin que de Docker et de Git », tout en désignant un
`Makefile` comme interface de commandes. `make` n'est pas installé sur la machine et ne fait pas
partie de l'installation minimale d'Ubuntu 24.04. Les deux affirmations sont donc incompatibles en
l'état.

**Options**

| Option | Coût | Effet |
|---|---|---|
| **(a) Installer GNU Make** (`sudo apt install make`) | Une commande, ~2 Mo, une fois | Toute la documentation existante reste exacte |
| (b) Remplacer le `Makefile` par un script `./x` | Zéro installation ; explicitement prévu par `architecture.md` §2.4 | Réécriture de toutes les mentions `make …` dans `roadmap.md`, `architecture.md`, ADR-0007, et perte de l'habitude d'appel |

**Décision : (a).** GNU Make n'est pas un outil de l'écosystème Node — l'esprit de l'ADR-0007 (aucune
chaîne Node sur l'hôte, aucun binaire natif hors conteneur) est intégralement préservé. L'accès au
groupe `docker` exige de toute façon une intervention `sudo` : la seconde commande n'ajoute rien au
coût réel. L'option (b) reste disponible sans dette : le `Makefile` ne contient que des appels
`docker compose`, sa traduction en script POSIX est mécanique.

**Conséquence** — ADR-0007 amendé (prérequis d'hôte : Docker, Git, **GNU Make**), ligne ajoutée au
journal des révisions. Aucune autre décision n'est touchée.

## 3 bis. Défaut corrigé en P1-02 — répertoires `root` créés par le démon Docker

**Symptôme** — Au premier démarrage d'un conteneur, `node_modules/` et `.next/` apparaissaient dans
le dépôt, **vides et appartenant à `root:root`**, non supprimables sans `sudo`. Violation directe
d'un critère d'acceptation de P1-02 et manifestation exacte du risque **R-13**.

**Cause** — Quand un volume nommé est monté sur un chemin qui n'existe pas dans le bind mount de
l'hôte, c'est le **démon** Docker qui crée le point de montage, et il tourne en `root`. Exécuter le
conteneur avec l'UID/GID de l'hôte ne change rien : la création précède le conteneur.

**Correction** — Le `Makefile` crée les points de montage à l'avance, avec la propriété de l'hôte
(prérequis d'ordre `| $(MOUNTPOINTS)` sur `install`, `up`, `up-d`, `sh`). Docker monte alors par-dessus
un répertoire existant et n'en crée aucun.

**Vérifié** — Après suppression des deux répertoires fautifs et relance : plus aucun fichier
`root` dans le dépôt, et un fichier créé depuis le conteneur apparaît en `aurel:aurel` sur l'hôte.

> Ce défaut n'apparaît **qu'à la première exécution sur une machine neuve**. C'est précisément le
> genre de friction qui aurait été découverte par un tiers clonant le dépôt, et pas par moi.

## 3 ter. Défaut corrigé en P1-03 — 355 Mo de store pnpm déversés sur l'hôte

**Symptôme** — Après le premier `make install`, un répertoire `.pnpm-store/` de **355 Mo**
apparaissait dans le dépôt, sur l'hôte. Violation de **CT-13** (« aucun binaire natif ne fuit du
conteneur vers l'hôte »). Le journal d'installation indiquait par ailleurs *« Packages are **copied**
from the content-addressable store »* — c'est-à-dire l'exact contraire de ce pour quoi pnpm a été
choisi.

**Cause** — pnpm exige que son store et `node_modules` soient sur le même système de fichiers pour
lier en dur. `node_modules` étant un volume nommé et le store par défaut vivant dans le système de
fichiers de l'image, la condition n'est pas remplie : pnpm relocalise alors son store en
`<projet>/.pnpm-store`, donc **dans le bind mount**.

**Correction** — `storeDir: /app/node_modules/.pnpm-store` dans `pnpm-workspace.yaml`.

**Deux mécanismes essayés avant, et vérifiés inopérants** — la variable d'environnement
`npm_config_store_dir` (présente dans l'image, ignorée par pnpm) et un `.npmrc` utilisateur (lu,
mais `pnpm config get store-dir` renvoyait toujours `undefined`). Depuis pnpm 10, les réglages
propres à pnpm ne sont plus lus que depuis `pnpm-workspace.yaml`. Le fichier porte donc un
commentaire expliquant pourquoi il existe alors qu'il n'y a pas de monorepo — sans quoi il serait
supprimé par erreur un jour.

**Vérifié** après reconstruction complète : *« Packages are **hard linked** »*, store à
`/app/node_modules/.pnpm-store` (355 Mo, dans le volume), **rien** sur l'hôte.

## 3 quater. Reconfiguration automatique de `tsconfig.json` par Next

Au premier démarrage, Next a modifié `tsconfig.json` de lui-même : `jsx` passé de `preserve` à
`react-jsx` (« mandatory change », runtime JSX automatique) et ajout de `.next/dev/types/**/*.ts`
aux `include`. Le fichier a également été reformaté.

Changement **accepté** : il est correct et documenté par Next. Il est signalé ici parce qu'un outil
qui réécrit un fichier versionné sans qu'on le lui demande doit être constaté, jamais subi. Le
`tsconfig.json` définitif est établi en **P1-04** ; ces valeurs y seront reprises explicitement.

## 4. Versions figées

Relevées sur les registres publics le 2026-08-11 et arrêtées pour la phase.

| Élément | Version | Justification |
|---|---|---|
| Node | **24.19.0** « Krypton » | LTS active (Node 22 est en maintenance depuis octobre 2025). Image `bookworm-slim` **pinnée par digest** `sha256:3638d9a6…` : un tag est mutable et ferait dériver l'environnement sans qu'aucun fichier ne change. Source unique = `ARG` du Dockerfile. |
| pnpm | **11.21.0** | Store partagé par liens durs (gain net dans une image reconstruite souvent) ; `node_modules` non plat, donc les dépendances fantômes échouent au plus tôt. Activé par corepack depuis `package.json#packageManager` : une seule source de vérité. |
| Next.js | **16.3.0** | Dernière version stable ; `engines.node >= 20.9.0`, compatible avec Node 24. Figée par le lockfile. |
| React | **19.2.8** | Version alignée sur le pair déclaré par Next 16. La compatibilité R3F / drei sera **revérifiée en P5-01** avant toute écriture de scène (risque R-08) — elle n'est pas supposée acquise ici. |
| TypeScript | **6.0.3** *(à confirmer en P1-04)* | TypeScript 7.0.2 (compilateur natif) est disponible mais **hors du domaine supporté par `typescript-eslint@8.67.0`** (`>=4.8.4 <6.1.0`). Adopter TS 7 aujourd'hui, c'est perdre le lint typé — donc la règle de cloisonnement de P1-05, qui est un critère de sortie de phase. 6.0.3 est la dernière version couverte, et le palier de migration désigné vers 7. |
| ESLint | **9.39.5** *(et non 10.8.1)* | `eslint-plugin-import@2.32.0`, qui fournit `import/no-restricted-paths`, ne déclare pas ESLint 10 dans ses pairs. Cette règle **est** le mécanisme qui rend l'ADR-0001 exécutable (`architecture.md` §1.2) : elle ne peut pas reposer sur une combinaison non supportée. |
| Vitest | 4.1.10 | — |
| Playwright | 1.62.1 (image `mcr.microsoft.com/playwright:v1.62.1-noble`) | Service séparé (ADR-0007) |

**Déclencheurs de réexamen** — TypeScript 7 dès que `typescript-eslint` l'accepte ; ESLint 10 dès
que `eslint-plugin-import` (ou son remplaçant `eslint-plugin-import-x`, déjà compatible) est adopté.
Ces deux montées se font ensemble, hors d'une phase fonctionnelle.

**Dépendances volontairement écartées** — `@vitejs/plugin-react` (esbuild transforme déjà le JSX des
tests ; le Fast Refresh n'a aucun sens en test) et `vite-tsconfig-paths` (six lignes de
`resolve.alias` suffisent). Deux dépendances en moins, deux surfaces de conflit en moins.

## 4 bis. P1-04 — les options strictes ont été vues échouer

Une option de compilation écrite dans un fichier n'est pas une garantie tant qu'on ne l'a pas vue
refuser du code. Une sonde temporaire (`src/__strictness-probe/`, supprimée aussitôt) a produit
exactement une erreur par option :

| Option | Erreur observée |
|---|---|
| `noUncheckedIndexedAccess` | `TS2322: Type 'string \| undefined' is not assignable to type 'string'` |
| `exactOptionalPropertyTypes` | `TS2375: … with 'exactOptionalPropertyTypes: true'` |
| `noFallthroughCasesInSwitch` | `TS7029: Fallthrough case in switch` |
| `strict` (`noImplicitAny`) | `TS7006: Parameter 'g' implicitly has an 'any' type` |
| `noImplicitOverride` | `TS4114: This member must have an 'override' modifier` |

`verbatimModuleSyntax` a été ajouté au-delà de ce qu'exigeait la tâche : il force `import type` à se
déclarer, ce qui garde lisible la frontière entre valeurs et types — utile dès la Phase 2, où la
couche Content ne doit importer aucune valeur React.

**Effet de bord corrigé au passage** : `tsc --noEmit` écrivait `tsconfig.tsbuildinfo` à la racine du
dépôt, sur l'hôte. Redirigé vers `.next/cache/` (volume nommé) par `tsBuildInfoFile`. Gitignoré, il
serait passé inaperçu ; il n'en restait pas moins un artefact de conteneur posé sur l'hôte (CT-13).

## 4 ter. P1-05 — la règle de cloisonnement a été vue échouer

Sept violations volontaires ont été introduites, puis retirées. Toutes ont été détectées :

| Violation | Règle | Détectée |
|---|---|---|
| `content` importe `@/i18n` | `import/no-restricted-paths` | ✅ |
| `content` importe `react` | `no-restricted-imports` | ✅ |
| `content` importe `three` | `no-restricted-imports` | ✅ |
| `scene` importe `@/content` (alias) | `import/no-restricted-paths` | ✅ |
| `scene` importe `../content` (relatif) | `import/no-restricted-paths` | ✅ |
| `scene/state` importe `three` | `no-restricted-imports` | ✅ |
| `ui` importe `@/content` | `import/no-restricted-paths` | ✅ |

**Le premier essai n'a détecté que 3 violations sur 7** : les imports par alias `@/…` n'étaient pas
résolus, faute de `paths` dans `tsconfig.json`. Sans cette sonde, la règle aurait été déclarée
active tout en laissant passer la totalité des imports réels — qui utilisent tous l'alias. C'est
exactement ce que la roadmap cherchait à éviter en exigeant un échec observé.

**Effet de bord utile** : la résolution par alias fonctionne alors que le script d'installation de
`unrs-resolver` est refusé (voir §4 quater). La restriction est donc gratuite, et vérifiée telle.

## 4 quater. Décisions de chaîne d'approvisionnement imposées par pnpm 11

pnpm 11 introduit deux protections actives par défaut. Elles ont interrompu l'installation ; **les
deux sont conservées**, aucune dérogation n'a été inscrite.

| Protection | Effet rencontré | Décision |
|---|---|---|
| Scripts d'installation bloqués (`allowBuilds`) | `unrs-resolver` réclamait son `postinstall` | **Refusé.** Ses binaires arrivent par dépendances optionnelles ; le script n'est qu'un rattrapage. Vérifié : la résolution des alias fonctionne sans lui. |
| Âge minimum des versions (`minimumReleaseAge`, 24 h) | `typescript-eslint@8.67.0`, publiée la veille, rejetée | **Version précédente retenue** (8.65.0, même domaine de compatibilité) plutôt qu'une dérogation. |

Le principe retenu, écrit dans `pnpm-workspace.yaml` : quand une version est trop récente, on prend
la précédente ; on n'inscrit pas d'exception. La plupart des compromissions de registre sont
détectées et dépubliées en quelques jours — attendre coûte peu et supprime la fenêtre.

## 4 quinquies. P1-10 — les tests ont été vus échouer, et deux d'entre eux ne testaient rien

Six mutations ont été appliquées au code de production, une à la fois, pour vérifier que la suite
devient rouge. **Deux ont survécu au premier passage** — c'est-à-dire que deux tests ne testaient
rien :

| Mutation | 1ᵉʳ passage | Cause réelle | Correction |
|---|---|---|---|
| Validation de valeur vide retirée | **survit** | Le test assérait seulement que le message contient `SITE_URL` — or *toutes* les erreurs du module le contiennent | Assertion resserrée sur le message spécifique |
| Normalisation du slash initial retirée | **survit** | Le code était **redondant** : `parseSiteUrl` garantit une origine sans chemin, donc `new URL(path, base)` donne déjà le bon résultat | Branche supprimée du code de production |
| Contrôle de protocole retiré | tuée | | |
| Contrôle d'origine seule retiré | tuée | | |
| `h1` dégradé en `h2` | tuée | | |
| `id` du repère principal retiré | tuée | | |

Les deux survivantes illustrent les deux défauts que cette vérification est censée trouver : une
**assertion trop lâche**, et du **code mort** qu'un test couvrait sans le contraindre. La couverture
était pourtant à 100 % dans les deux cas — ce qui rappelle qu'elle mesure l'exécution, pas la
vérification.

Après correction, les six mutations sont tuées et la couverture reste à 100 %.

## 4 sexies. P1-08 — deux défauts trouvés en exécutant la suite E2E

**1. Un test propre à un profil s'exécutait dans tous les autres.** La garde interne
(`test.skip(({}, testInfo) => …)`) ne fonctionne pas : le rappel de `test.skip` ne reçoit pas
`testInfo`. Résultat au premier essai : le test « WebGL est neutralisé » tournait dans
`desktop-chromium`, `mobile-safari`, `no-js` et `reduced-motion`, où il échouait — et l'audit axe
tournait sous `no-js`, où il ne peut par construction pas fonctionner (axe injecte et exécute un
script dans la page).

Corrigé par un découpage des fichiers et un `testMatch` par profil :
`tests/e2e/shared/**` pour les parcours communs, `tests/e2e/profiles/<profil>/**` pour le reste.
Le filtrage est ainsi déclaré dans la configuration, au même endroit que les profils.

**2. Le serveur de développement produisait de fausses erreurs console.** Next 16 refuse en 403 la
connexion HMR provenant de l'origine `web:3000` (le service `e2e` atteint `web` par le réseau
Docker). Deux erreurs console apparaissaient donc systématiquement — et une assertion « aucune
erreur console » qui accepte du bruit connu n'assure plus rien. Corrigé par `allowedDevOrigins`
dans `next.config.ts`, sans effet en production.

> Les E2E seront rejouées **contre le build de production** à partir de P1-13, comme l'exige
> `testing-strategy.md` §8. Ce sera la vérification définitive ; celle-ci porte sur l'outillage.

## 5 bis. Écart : contradiction interne d'`architecture.md` sur le graphe de dépendances

Le graphe de §1.2 énumère `app → content, i18n, routing, ui` — **sans `scene`**. Or §5.1 fait monter
le canvas par `app/[locale]/layout.tsx`, ce qui exige précisément cet import. Les deux passages du
même document se contredisent.

**Tranché en faveur de §5.1** : `app → scene` est autorisé. C'est le sens de l'ADR-0004 (le contenu
descend par la branche documentaire, la scène ne reçoit que de l'état de navigation) — `app` est le
seul endroit où les deux couches peuvent se rencontrer.

Par ailleurs, `src/seo/` figure dans l'arborescence de §8 mais dans aucune liste de §1.2.
**Contrainte posée par défaut** : `seo → i18n, routing`. À confirmer en P3-06, quand les métadonnées
seront réellement écrites.

Ces deux points sont à répercuter dans `architecture.md` §1.2 en P1-16, avec mention explicite du
changement.

## 5. Valeurs par défaut appliquées aux questions ouvertes

Conformément à la consigne « applique la recommandation par défaut et signale-le »
([`phase-0-questions.md`](./phase-0-questions.md)). **Chacune reste modifiable à la phase indiquée
sans coût architectural.**

| # | Défaut appliqué | Phase |
|---|---|---|
| Q3 | CDN en frontal : décision reportée à la mesure multi-région | 11 |
| Q4 | Déploiement automatique après gates verts sur la branche principale | 1 (P1-15) |
| ~~Q5~~ | ~~Dépôt privé, publié à la release~~ → **modifié le 2026-08-11 : dépôt PUBLIC**, voir §5 ter | 1 (P1-14) |
| Q6 | Alertes de supervision vers `aurelien.feignon@gmail.com` | 4 (P4-14) |
| Q8 | Plafond de 20 envois/jour, à confirmer contre le quota réel du plan | 10 |
| Q9 | Expéditeur `contact@<domaine>`, réponse vers l'adresse personnelle | 1 (P1-17) |
| Q10 | Deux PDF : `cv-fr.pdf` et `cv-en.pdf` | 10 |
| Q12 | Tout traduit ; repli toléré pour les projets secondaires | 3 |
| Q13 | Français par défaut, `/` négocie via `Accept-Language` | 3 |
| Q14 | GitHub, LinkedIn, page « À propos », page « Contact » portant le formulaire | 4 |
| Q15 | Pas de blog en v1 | — |
| Q16 | Style low-poly construit à partir de primitives | 8 |
| Q17 | Photos du poste réel attendues | 8 |
| Q18 | Scène décorative non interactive sur mobile | 13 |
| Q19 | Aucune mesure d'audience en v1 | — |

**Q1 — réponse du 2026-08-11 : le VPS n'est pas commandé.** Le domaine, lui, a été acheté le même
jour (`aurelienfeignon.com`, Namecheap). P1-15 reste `BLOCKED` faute de serveur, comme prévu par la
roadmap ; le déploiement réel devient la première tâche de la Phase 2. Cela n'empêche pas la sortie
de Phase 1 dès lors que P1-13 et P1-14 sont `DONE`.

## 5 ter. Q5 rouverte : le dépôt passe en public

**Cause** — La première exécution de la CI n'a jamais démarré : *« The job was not started because
recent account payments have failed or your spending limit needs to be increased »*. GitHub Actions
est facturé sur les dépôts privés au-delà du quota offert ; il est **gratuit et illimité** sur un
dépôt public.

**Options pesées** — régler la facturation et rester privé ; héberger un runner sur le VPS ; passer
le dépôt en public.

Le runner auto-hébergé a été écarté : l'ADR-0008 rejette explicitement l'alternative « build sur le
VPS » (consommation de RAM et de CPU du serveur de production, H-01a), et un runner y ferait tourner
`next build` et les navigateurs Playwright sur la machine qui sert le site — en couplant au passage
la chaîne de build à la production. Sur une autre machine, ce serait défendable, mais cela
modifierait l'ADR-0008.

**Décision de l'utilisateur : dépôt public.** Vérifié avant bascule : aucun `.env` dans
l'historique, aucune clé, aucun secret, aucune adresse e-mail hors métadonnées d'auteur de commit.

**Conséquence assumée** : l'historique est définitivement visible, y compris les tâtonnements à
venir — ce que la réponse initiale à Q5 voulait précisément éviter. En contrepartie, un dépôt qui
expose ses ADR, son journal de phase et une CI qui bloque sur l'accessibilité est en soi une pièce
du portfolio.

## 5 quater. P1-14 — ce que la CI a trouvé et que l'exécution locale ne pouvait pas voir

`storeDir` portait `/app/node_modules/.pnpm-store`, chemin absolu du conteneur. Le commentaire qui
l'accompagnait justifiait ce choix par « aucune commande de ce projet ne s'exécute ailleurs ».
**C'était faux** : l'ADR-0007 §Règles 6 fait tourner les gates de la CI *nativement*, précisément
pour la vitesse. Sur le runner, `/app` n'existe pas et n'est pas créable — `EACCES` au premier
`pnpm install`.

Corrigé en chemin relatif, correct des deux côtés. Le défaut était **structurellement invisible en
local** : tout ce qui tourne ici tourne dans le conteneur. C'est exactement ce pour quoi le risque
**R-14** (divergence dev ↔ CI) était consigné, et la première exécution réelle l'a trouvé.

**Preuve des gates non contournables** : la fusion de la PR fautive a été tentée avec `--admin`, et
refusée — *« Required status check "lint · typecheck · tests · budget de bundle" is failing »*.
Un push direct sur `main` est lui aussi refusé (`GH013`). `bypass_actors` est vide.

## 6. Mesures

À remplir au fil des tâches — un tableau vide ici en fin de phase signifierait que les budgets ne
sont pas surveillés.

| Mesure | Tâche | Budget | Relevé |
|---|---|---|---|
| First Load JS partagé | P1-12 | ≤ 95 Ko (bloquant 120 Ko) | — |
| Taille de l'image de production | P1-13 | ≤ 250 Mo (bloquant 400 Mo) | — |
| **Délai de hot reload** | P1-03 | ≤ ~2 s | ✅ **34 / 107 / 120 ms** (3 mesures, modification de `page.tsx` → HTML servi) |
| Démarrage du serveur de développement | P1-03 | — | ✅ « Ready in 197 ms », HTTP 200 en ~1 s |
| Installation des dépendances (`make install`) | P1-03 | — | ✅ 3,8 s, **liens durs** |
| Taille de l'image de développement | P1-03 | — | 377 Mo (l'image de *production* est mesurée en P1-13) |
| Durée de `make ci` depuis un clone neuf | P1-11 | — | — |

## 7. Bilan de phase

### 7.1 Fait

**15 tâches sur 17 terminées** (P1-01 à P1-14, P1-16). Le squelette est dockerisé, typé, testé,
mesuré, vérifié en intégration continue, et l'artefact de production tourne réellement.

| Critère de sortie de la Phase 1 | État |
|---|---|
| `make ci` vert depuis un clone neuf, sans outil Node sur l'hôte | ✅ code 0, ~56 s, **sur un `git clone` réel**, volumes et images Docker détruits au préalable |
| Hot reload en moins de ~2 s | ✅ **34 / 107 / 120 ms** sur trois mesures |
| `make e2e` vert, tous profils déclarés exécutables | ✅ 17 tests sur 5 profils |
| Aucun fichier `root` produit dans le dépôt | ✅ après correction d'un défaut réel (§3 bis) |
| TypeScript strict, zéro erreur, aucune suppression | ✅ 5 options **vues échouer** avant d'être déclarées actives |
| Règle de cloisonnement active et vérifiée par un échec observé | ✅ 7 violations, dont 2 que la première version laissait passer |
| CI verte, gates non contournables, échec observé sur une PR fautive | ✅ fusion refusée **même avec `--admin`** ; push direct sur `main` refusé |
| Image de production construite, non-root, healthcheck | ✅ `uid=1000(node)`, saine en 6 s, 51 Mo de RSS |
| Budget de bundle mesuré et surveillé automatiquement | ✅ gate **vu échouer** ; budget révisé et justifié |
| P1-17 : domaine, DNS, authentification Mailjet | 🟡 domaine acheté, SPF et DKIM publiés ; DMARC, validation Mailjet et `A` restants |
| P1-15 `DONE` ou explicitement `BLOCKED` avec cause tracée | ✅ `BLOCKED`, cause tracée |
| Aucune dépendance Three.js | ✅ |

**Ce que je retiens** : dix défauts réels ont été trouvés, et **aucun par relecture** — tous en
exécutant. Quatre auraient survécu à une revue de code attentive : le store pnpm déversé sur l'hôte,
la règle de cloisonnement aveugle aux alias, le gate de bundle qui mesurait un champ de manifeste
sans rapport avec ce qu'un navigateur télécharge, et le chemin de store absolu qui ne pouvait
casser que sur un runner. Les quatre « fonctionnaient » à la lecture.

Le dernier mérite d'être souligné : il n'était pas seulement invisible en local, il était
**structurellement inaccessible** à toute vérification locale, puisque tout y tourne dans le
conteneur. Seule la première exécution réelle de la CI pouvait le révéler — c'est ce que le risque
R-14 anticipait.

### 7.2 Dérives assumées

| # | Dérive | Traitement |
|---|---|---|
| 1 | **GNU Make ajouté aux prérequis d'hôte** — l'ADR-0007 se contredisait | ADR amendé, journal des révisions mis à jour (§3) |
| 2 | **Budget « First Load JS partagé » révisé** de 95/120 Ko à 136/146 Ko | Le seuil initial était **sous le plancher du framework**, donc inatteignable. Rebasé sur mesure, justification écrite (`performance-budget.md` §4.1). La marge applicative retenue est **plus stricte** que l'intention d'origine |
| 3 | **Image de production à 381 Mo** contre une cible de 250 Mo | Sous le seuil bloquant. 340 Mo viennent de l'image de base, qu'aucune image Node officielle ne permet de descendre sous 234 Mo. Rien changé, rien relevé, analyse consignée (§7.1 du même document) |
| 4 | **`architecture.md` §1.2 corrigé** (`app → scene`, `seo`) | Contradiction interne du document, tranchée et documentée (§5 bis) |
| 5 | **ESLint 9 et TypeScript 6 retenus** plutôt que 10 et 7 | Les dernières versions cassent le lint typé, donc la règle de cloisonnement — qui est un critère de sortie. Déclencheurs de montée écrits (§4) |
| 6 | **Markdown exclu de Prettier** | Il réaligne les tableaux sur 180 colonnes : 150 lignes modifiées sur `vision.md` seul. Le code reste formaté sans discussion |

Aucune de ces dérives n'a été appliquée en silence : chacune est justifiée par écrit à l'endroit où
la décision d'origine était consignée.

### 7.3 Reporté

| Tâche | Cause | Reprise |
|---|---|---|
| **P1-15** (déploiement) | VPS provisionné et durci, mais DNS, pile edge, GHCR et rollback restent à faire | Première tâche de la Phase 2, report explicitement autorisé par la roadmap |
| **P1-17** (domaine) | Action utilisateur en cours | DMARC, validation Mailjet, enregistrement `A` |
| Réduction du socle JS du framework | Sans enjeu tant qu'aucun composant client n'existe | Phase 11 |
| Confirmation de la contrainte `seo → i18n, routing` | Les métadonnées n'existent pas encore | P3-06 |

### 7.4 Dette technique connue, tracée

1. **`src/app/layout.tsx` code `lang="fr"` en dur** — assumé et commenté ; premier point à corriger
   en P3-02.
2. **`src/seo/site-url.ts` n'est encore consommé par personne** — écrit en P1-10 pour satisfaire le
   critère « valeur unique » de P1-17 et servir de vraie fonction testée. Il sera branché en P3-06.
3. **Le socle du framework (126 Ko) n'a pas été attaqué** — voir Phase 11.

Rien de tout cela n'est un raccourci pris pour verdir un gate : aucun test n'a été supprimé ni
affaibli, aucun seuil relevé sans mesure et justification écrite.
