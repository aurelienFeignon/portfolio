# ADR-0002 — Le routeur Next.js est la source de vérité de l'état de navigation

- **Statut** : ACCEPTÉ (Phase 0, 2026-08-11) — *amendé le 2026-08-26 (P6-03), voir §Amendement*
- **Décide** : synchronisation entre l'URL et la scène 3D
- **Lié à** : ADR-0003, ADR-0004

## Contexte

Le portfolio a deux façons de naviguer : les liens HTML classiques, et les interactions dans la
scène 3D (cliquer un écran, revenir en arrière). Sans règle, on obtient deux états concurrents —
celui du routeur et celui de la scène — qui divergent dès qu'un cas limite apparaît : bouton
précédent du navigateur, ouverture directe d'une URL, lien partagé, restauration d'onglet. C'est
le risque R-03, classique et coûteux à réparer après coup.

Par ailleurs, une exigence produit impose que **chaque état significatif ait une URL réelle**
(CF-04).

## Décision

**Un seul sens de flux : l'URL décide, la scène suit.**

```text
URL ──▶ resolveSceneState(pathname) ──▶ SceneState ──▶ getCameraTarget(state) ──▶ caméra
```

Une interaction 3D ne modifie **jamais** directement la caméra ni un état local :

```text
clic sur un écran ──▶ getRouteForScreen(screen, locale) ──▶ router.push(url)
                                                                 │
                                        (la route change) ───────┘
                                                 ▼
                                    resolveSceneState ──▶ la caméra suit
```

Corollaires :

1. `resolveSceneState`, `getCameraTarget`, `getRouteForScreen` sont des **fonctions pures**, dans
   `src/scene/state/`, **sans aucun import Three.js** — vérifié par une règle ESLint.
2. La scène ne détient aucun état de navigation propre. Elle détient de l'état d'**animation**
   (progression d'une transition en cours), qui est une donnée de rendu, pas de navigation.
3. L'état de scène courant est exposé au DOM (`data-scene-focus`) : observable, testable en E2E,
   utile au débogage.
4. Le canvas est monté **au-dessus** des routes (dans le layout de locale) : changer de route ne le
   démonte pas, donc pas de rechargement d'assets ni de fuite GPU (R-10).

## Amendement du 2026-08-26 (P6-03) — `getRouteForScreen` prend un **état**, pas un écran

Le schéma ci-dessus écrit `getRouteForScreen(screen, locale)`, et l'exemple de
`testing-strategy.md` §4.3 le lit comme *l'un des trois écrans*. À l'écriture, cette lecture
**ouvrait une seconde porte** : « revenir au bureau » — touche Échap, clic hors écran (P6-05) — est
une navigation comme une autre, et elle aurait dû appeler `homePath` directement, à côté de la
fonction que cet ADR déclare unique.

La fonction prend donc un **`SceneFocus`**, les quatre états, `overview` compris. Rien d'autre ne
change : `getRouteForScreen('skills', 'en')` rend toujours `/en/skills`, et le sens du flux est
inchangé.

**Ce que l'amendement gagne, et qui est vérifiable** : l'aller-retour cesse d'être vacant.
`resolveSceneState(getRouteForScreen(focus, locale)).focus === focus` se prouve sur les **quatre**
focus et les **deux** locales, là où la version restreinte n'aurait rien affirmé que
`pathFor ∘ parsePagePath = id` — tenu depuis P6-01 — n'affirmait déjà.

⛔ **Et l'aller-retour seul ne suffit pas**, ce que l'écriture a montré : pour `overview`, *toute*
adresse que le site ne sert pas le satisfait, puisqu'elle s'effondre justement vers la vue
d'ensemble. Une route d'accueil inventée passerait. La propriété est donc doublée d'une seconde —
la route désigne une **vraie page** (`parsePagePath(route) !== null`).

## Alternatives considérées

| Alternative | Pourquoi écartée |
|---|---|
| **État de scène dans un store client** (Zustand/Context) avec synchronisation bidirectionnelle vers l'URL | Deux sources de vérité à réconcilier. Chaque cas limite (back, deep link, restauration) demande du code de rattrapage, et les bogues apparaissent surtout en production. Ajoute une dépendance pour créer un problème. |
| **Scène maîtresse, URL mise à jour en effet de bord** | Casse le deep linking et le bouton précédent, c'est-à-dire deux exigences produit explicites. |
| **Deux modes distincts** (site documentaire *ou* application 3D, séparés) | Duplique la navigation et le contenu, et donne deux produits à maintenir. Contredit ADR-0001. |
| **URL avec fragment ou paramètre de requête** (`/fr#projects`) | Les fragments ne sont pas indexés comme des pages distinctes ; on perd `title`, `canonical` et métadonnées par section. Rédhibitoire pour le SEO. |

## Conséquences

**Positives**

- Le bouton précédent, le partage d'URL et l'ouverture directe fonctionnent **par construction**,
  pas par correctif.
- La logique de navigation est testable en Vitest pur, sans WebGL ni navigateur (CT-10). C'est ce
  qui rend possible la cible de couverture à 95 % sur `scene/state`.
- Le mapping écran ↔ section est explicite et exhaustif : un écran ajouté sans mapping échoue au
  typage ou au test.
- L'accessibilité en découle naturellement : puisque toute navigation est un changement d'URL,
  chaque action 3D a un équivalent `<a href>` trivial (CF-06).

**Négatives, assumées**

- Une interaction 3D subit la latence du routeur avant que la caméra ne bouge. Traitement : la
  transition de caméra démarre sur la nouvelle route, et un retour visuel immédiat (survol, focus)
  est donné au clic. À vérifier en Phase 6 ; si la latence est perceptible, on la corrige par un
  effet optimiste **de rendu uniquement**, jamais par un second état de navigation.
- Les transitions doivent être interruptibles (navigation rapide entre deux écrans) : cas de test
  explicite en Phase 6.

**Déclencheur de réexamen**

Une exigence d'état non représentable en URL (ex. : une vue libre où l'utilisateur oriente la
caméra à la souris). Dans ce cas, cet état devient de l'état de **présentation**, hors navigation,
et la présente décision reste valable pour tout ce qui est navigable.
</content>
