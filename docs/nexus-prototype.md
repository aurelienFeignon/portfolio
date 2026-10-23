# NEXUS — le prototype

> Branche `feat/nexus-prototype`, ouverte le 2026-10-23 depuis `main` (`2f8389b`).
> **Prototype : rien n'est fusionné ni déployé.** Décision D11 (`phase-0-questions.md`) ;
> amendements d'ADR consignés dans le journal de `adr/README.md`.

## 1. Ce qui change, et ce qui ne change pas

**D11 remplace D10** : le bureau 3D disparaît. La scène devient un environnement numérique sombre — un
noyau central et trois univers, un par section.

| Reste | Change |
|---|---|
| La route est la **seule** source de vérité (ADR-0002) : `resolveSceneState` → `getCameraTarget` → caméra | La caméra **bouge** : transitions cinématiques interruptibles, orbite bornée (P6-04 livrée ici) |
| La 3D est un enrichissement (ADR-0003) : `aria-hidden`, montage après `idle`, rien au palier `none` | La couche de scène **reçoit le pointeur** ; l'empilement protège le contenu |
| Le rendu HTML indexable, les traductions, les routes | Le contenu vit dans un **`ReadingPanel`** opaque, jamais posé sur le WebGL (ADR-0004 amendé) |
| L'isolation du bundle (garde P5-09, garde `layout.ts`) | Thème **sombre** unique (ADR-0010 amendé) |
| `SceneFocus`, `CameraSpec`, `getCameraTarget`, `getRouteForScreen`, `fovForAspect`, les paliers, la frontière d'erreur, le panneau de diagnostic | `layout.ts` décrit NEXUS ; `desk.tsx` et `geometry.ts` (claviers, chanfreins) sont retirés avec leurs bancs |

## 2. La scène

| Élément | Construction | Pourquoi |
|---|---|---|
| **Noyau** | icosaèdre subdivisé, métal sombre à facettes ; structure filaire tournant à contre-sens ; 2 coques de Fresnel (cyan, violet) ; halo en sprite ; 4 anneaux orbitaux inclinés, chacun avec sa perle | Une silhouette taillée, de la profondeur par couches, une lueur **sans bloom** |
| **Expériences** | 5 anneaux empilés le long d'un axe, du plus large au plus serré, reliés par une hélice parcourue d'impulsions | Une chronologie orbitale |
| **Projets** | nœuds sur une sphère de Fibonacci (un seul draw call instancié), reliés à leurs 3 plus proches voisins | Un réseau |
| **Compétences** | 5 amas de points doux (un par domaine), moyeux reliés en anneau | Une constellation |
| **Ambiance** | 1 800 particules en galaxie aplatie (`full`) ; 3 arcs lumineux du noyau vers chaque univers | Profondeur et connexions animées |
| **Lumière** | ponctuelle cyan au cœur, principale froide de face, contre-jour violet | Les facettes accrochent la lumière, la silhouette se détache |

- **Aucun post-traitement, aucune dépendance ajoutée, aucun module drei.** La lueur est dans la
  géométrie : coques de Fresnel et points en mélange additif, lignes dont l'intensité circule
  (`components/nexus/materials.ts`, trois shaders courts).
- **Formes procédurales et déterministes** (`state/nexus-geometry.ts`, générateur à graine) : la même
  scène à chaque visite, et des bancs qui affirment des propriétés sur une sortie connue.
- **Aucune donnée de contenu dans la scène** : `scene` ne lit pas `content`. Les formes sont des
  emblèmes, pas des graphiques.
- **Densité par palier** (`DENSITY`) : la composition est la même partout, seul le peuplement baisse
  (`full` 1 800 particules, `reduced` 1 000, `lite` 500, une seule coque).
- Animations lentes : pulsation ~0,09 Hz, rotations de 0,002 à 0,09 rad/s. Sous
  `prefers-reduced-motion`, l'horloge des shaders est **figée** et la boucle passe en `demand`.

## 3. La navigation hybride

```text
clic sur un univers ─┐
lien du DOM ─────────┼─▶ router.push(route) ─▶ URL ─▶ resolveSceneState ─▶ getCameraTarget ─▶ rig
Échap ───────────────┘
```

- **Survol** : le nom de l'univers s'affiche dans une étiquette HTML, sur sa propre surface, en bas à
  droite — hors de la racine de scène, qui reste sans texte.
- **Clic** sur un univers (sphère de sélection invisible ; un glisser de plus de 6 px n'est pas un
  clic) → la route de la section.
- **Liens du DOM** (en-tête, panneau, clavier) : quand la scène est montée, `SceneMount` intercepte les
  clics ordinaires vers une page du site et les passe à `router.push` — **même transition**, sans
  recharger la page. Sans scène, ils restent des `<a>` ordinaires.
- **Échap** → vue d'ensemble. Lien « Vue d'ensemble » en tête de chaque section.
- **Orbite bornée** : glisser à la souris, ±28° en lacet, ±12° en tangage, amortie ; état de
  présentation, remis à zéro à chaque route. **Désactivée au tactile** : le doigt fait défiler la page.
- **Transition** : 1,6 s, `easeInOutCubic`, interruptible (repart de la pose affichée) ; **coupe
  instantanée** sous `prefers-reduced-motion`.
- **Cadrage dans la zone libre** : `SceneMount` mesure le panneau dans le DOM et la caméra décale son
  point principal (`setViewOffset`) pour centrer la scène dans l'espace restant — le canvas reste plein
  écran, aucun second contexte.
- **Gros plans** : calculés (`closeUp`) — la caméra se tient décalée de côté pour que le noyau reste
  visible, en retrait, **à droite** de l'univers, à l'opposé du panneau.

## 4. L'interface de lecture

| | Ordinateur (≥ 60 rem) | Mobile |
|---|---|---|
| Accueil, sections | colonne fixe à gauche, opaque, à défilement propre ; pied de page en socle sous elle | bande de scène de 42 svh en haut, puis feuille opaque dans le flux |
| Fiches | colonne de lecture centrée, **scène cachée** (montée, mais `frameloop="never"`) | idem, pleine largeur |

La bande mobile est réservée **dès le rendu serveur** : la réserver au montage de la scène décalerait
le contenu après `idle` (CLS). Sans WebGL, elle montre le halo CSS du fond.

## 5. Lancer le prototype

```bash
make build                                   # image de production locale (portfolio:local)
docker run --rm --name nexus-preview -p 127.0.0.1:3100:3000 portfolio:local
# puis http://localhost:3100/fr
```

⚠️ Sur la machine de développement, 3000 et 3001 sont occupés (stack Augure, Grafana) : d'où le
port 3100. Pour les E2E et la mesure : `ports: !override []` passé par `COMPOSE_PROD`
(`performance-budget.md` §6.3).

## 6. Mesures

*(complété ci-dessous après relevé)*
