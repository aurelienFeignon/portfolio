# Journal de la Phase 4 — Portfolio HTML

> Ouverte le 2026-08-15.
> Ce document consigne, **au fil de l'eau**, les décisions prises pendant la phase, les mesures
> relevées et les écarts par rapport aux documents de Phase 0. Le bilan final le clôt.
> Les statuts des tâches restent dans [`roadmap.md`](./roadmap.md), seule source de vérité.

---

## 1. Objectif

Un portfolio **complet et utilisable sans Three.js**. C'est le socle de tout le reste, le filet de
sécurité permanent du projet, et le jalon **T1** : à la fin de cette phase, le site est en ligne,
supervisé, avec un rollback prouvé.

Ce que la phase fait, que les précédentes n'ont pas fait : elle **met en forme**. Les pages de la
Phase 3 sont structurelles — elles prouvent qu'une route résout la bonne entité dans la bonne
langue, et rien de plus. Aucune n'est présentable, aucune ne rend le corps MDX de son entité.

Ce que la phase ne fait pas : aucune scène, aucune dépendance Three.js dans le dépôt (c'est un
critère de sortie), aucun formulaire de CV (Phase 10 — P4-13 met en ligne un site dont la page de
contact n'existe pas encore, et c'est assumé : le CV est déjà téléchargeable en PDF).

## 2. Contexte d'ouverture — ce qui existe et ne doit pas être refait

| Acquis | Origine | Conséquence pour la phase |
|---|---|---|
| **Contenu réel** : 2 expériences, 1 projet, 40 compétences par locale | P2-11 | Le chemin critique de T1 est levé. Les pages ont de quoi être jugées sur du vrai |
| Content Layer complet, tris et dérivations **dans la couche** | P2-05, P2-06 | Une vue qui trie elle-même est un défaut, pas une commodité |
| `src/ui/` : `SiteNav`, `LanguageSwitcher`, `EntityList`, `DateRange` — testés, **sans style** | P3-02, P3-09 | On les habille, on ne les réécrit pas |
| `src/seo/` : `pageMetadata`, `hreflang.ts` **seule** construction de la carte des langues | P3-06, P3-07 | P4-08 et P4-09 s'y branchent, ne créent pas un second chemin |
| Rendu MDX (`src/ui/mdx/`), liste blanche qui refuse **avant** de rendre | P2-08 | **Aucune page ne l'appelle encore** : P4-05 est la première |
| Quatre gates branchés sur `pnpm build` / `make ci`, tous **vus échouer** | P1 → P3 | Ils ne se gardent plus du zéro mais du sous-comptage |
| Site déployé, derrière Cloudflare Access depuis le 2026-08-15 | P1-15 | P4-16 suppose de lever Access — c'est une étape de la mise en ligne, pas un préalable au code |

Trois chiffres à ne pas découvrir :

- **image de production à 385 Mo**, seuil bloquant 400 — soit **15 Mo de marge**, dont ~7 Mo
  attendus en P4-05 avec le runtime MDX ;
- **0,0 Ko de JS propre sur 16 routes**, socle partagé 129,5 Ko — le profil `no-js` est vrai *par
  construction*, la navigation étant faite de balises `<a>` ;
- **436 tests**, couverture 100 % globale.

## 3. Décisions prises à l'ouverture

| # | Décision | Tâche | Statut |
|---|---|---|---|
| 1 | **Stratégie de style** : CSS Modules + tokens en variables CSS | P4-01 | **Tranchée** — [ADR-0010](./adr/0010-styling-strategy.md) |
| 2 | **Identité de marque** : le site s'appelle « Aurélien Feignon » | P4-02, P4-08 | **Tranchée** (§4) |
| 3 | Navigation client (`next/link`) ou balises `<a>` | P4-02 | **Mesure d'abord** — reporté de la Phase 3 avec cette consigne |
| 4 | Précision d'affichage des dates (« mars 2022 ») | P4-04, P4-05 | À trancher au rendu, reporté de P2-02 |
| 5 | Composants MDX ajoutés à la liste blanche | P4-05 | Dépend de la décision 1, donc pas avant |

### 3.1 L'identité de marque, et ce qu'elle change

Le dictionnaire porte aujourd'hui `site.name = "Portfolio"`, valeur d'attente de la Phase 3. Elle
devient **« Aurélien Feignon »** : c'est le nom que cherche un recruteur, celui du domaine, et
celui qui doit figurer dans le gabarit de titre (`%s — Aurélien Feignon`, reporté en P4-08) comme
dans les données structurées `Person` (P4-09).

Conséquence immédiate, à ne pas manquer : `site.name` est **un nom propre**, donc identique dans
les deux locales. Le test de non-régression des dictionnaires refuse les valeurs identiques entre
`fr` et `en` — il tolérait déjà `site.name` comme seule exception, pour « Portfolio ». L'exception
reste, sa justification change et doit être réécrite.

## 4. Tâches et tests correspondants

| Tâche | Ce qu'elle livre | Ce qui le prouve |
|---|---|---|
| P4-01 | ADR-0010 : stratégie de style | L'ADR précède le premier composant stylé — pas de style écrit avant |
| P4-02 | Layout documentaire : en-tête, navigation, pied de page, lien d'évitement | Composants : `aria-current` sur la section active ; E2E : le lien d'évitement mène au `main` |
| P4-03 | Accueil : présentation et accès aux trois sections | Composants : les trois sections atteignables ; un seul `h1` |
| P4-04 | Liste et détail des expériences | Composants : dates mises en forme, poste en cours, réalisations |
| P4-05 | Liste et détail des projets, **corps MDX rendu** | Intégration : un corps MDX est rendu ; **mesure de l'image avant / après** |
| P4-06 | Compétences groupées par catégorie | Composants : cinq catégories, ordre stable, état vide |
| P4-07 | Pages 404 et erreur, localisées | E2E : `/fr/projects/inconnu` rend une 404 en français avec des liens de secours |
| P4-08 | Gabarit de titre, OpenGraph, images de partage | Unitaires : `%s — Aurélien Feignon` ; E2E : `og:image` servie et dimensionnée |
| P4-09 | JSON-LD `Person`, `WebSite`, `CreativeWork`, `BreadcrumbList` | Unitaires sur la sérialisation ; E2E : JSON valide et parsable |
| P4-10 | Passe accessibilité : titres, focus, contrastes, points de repère | axe-core sur les cinq types de page, 0 violation serious/critical |
| P4-11 | Responsive documentaire | E2E `mobile-safari` : aucun débordement horizontal, cibles tactiles |
| P4-12 | E2E : navigation complète, deep links, bascule de langue, clavier | E2E-01, E2E-02, E2E-03, E2E-08, E2E-12 de `testing-strategy.md` §4.7 |
| P4-13 | Mise en production (jalon T1) | La CI verte sur `main` fait foi (`deploy/README.md` §4.2) |
| P4-14 | Supervision : healthcheck + sonde externe avec alerte | Une alerte **reçue**, provoquée par un arrêt volontaire |
| P4-15 | Checklist de mise en ligne + rollback en conditions réelles | Rollback **exécuté**, comme en P1-15 |
| P4-16 | Vérification post-déploiement, Access levé | `canonical`, `hreflang`, sitemap et `robots.txt` observés **depuis l'extérieur** |

## 5. Ordre de travail

Prévu : P4-01 → P4-02 → P4-03 → P4-04 → P4-06 → P4-05 → P4-07 → P4-08 → P4-09 → P4-10 → P4-11 →
P4-12 → P4-13 → P4-14 → P4-15 → P4-16.

Deux écarts par rapport à l'ordre des identifiants, dictés par les dépendances réelles :

- **P4-06 avant P4-05.** Les compétences n'ont pas de page de détail et ne rendent aucun corps MDX :
  elles closent la mise en forme des listes avant qu'on ouvre le seul sujet à risque de la phase.
- **P4-05 isolé, et mesuré.** C'est la première page qui compile un corps MDX, donc celle qui fait
  entrer ~7 Mo de runtime dans une image qui n'a que 15 Mo de marge. Elle est traitée seule, avec
  une mesure avant et après, pour que le chiffre soit attribuable.

Le **gabarit de titre** (P4-08) est avancé au moment où `site.name` change, en P4-02 : toutes les
métadonnées en dépendent, et le poser après aurait voulu dire réécrire chaque test de titre.

## 6. Critères de sortie (rappel, `roadmap.md`)

- [ ] Toutes les exigences de la §20 de la mission satisfaites.
- [ ] Lighthouse mobile ≥ 85, **a11y 100**, **SEO 100**.
- [ ] 0 violation axe `serious`/`critical`.
- [ ] Le projet E2E `no-js` passe.
- [ ] **Aucune dépendance Three.js dans le dépôt** à ce stade.
- [ ] **Site en ligne, supervisé, avec un rollback prouvé.**

S'y ajoutent deux vérifications héritées, qui deviennent réelles ici :

- [ ] L'image de production reste **sous 400 Mo** après l'entrée du runtime MDX (P4-05).
- [ ] `SITE_URL` : l'`ENV` de l'image et l'`env_file` de Compose **coïncident** (P4-15).
