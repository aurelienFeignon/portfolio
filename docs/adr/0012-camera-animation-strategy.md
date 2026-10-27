# ADR-0012 — Animation de caméra : interpolation maison à durée fixe, sans bibliothèque

- **Statut** : ACCEPTÉ (Phase 6). La décision a été **livrée par #58 le 2026-10-23**, et l'ADR
  **écrit le 2026-10-27**, après coup (P6-09, voir « Écart » plus bas).
- **Décide** : comment la caméra passe d'un état de scène à l'autre, et comment elle suit le
  pointeur — avec quel outil, quelle courbe, quelle durée.
- **Numéro** : 0012, réservé à ce sujet dès la Phase 0 (`README.md`, « Décisions identifiées »).
- **Lié à** : ADR-0002 (la route est la seule source de vérité), ADR-0003 (enrichissement
  progressif), ADR-0016 (dépendances 3D), CT-08, CT-10.

## Écart : un ADR écrit après sa décision

L'ordre de travail de la Phase 6 (`phase-6-log.md` §5) plaçait P6-09 **avant** P6-04 : un choix
entre interpolation maison et bibliothèque de ressorts se pose avant d'écrire le rig, pas après.
Ce n'est pas ce qui s'est passé. Le rig a été écrit dans le prototype NEXUS (#58) et la décision
livrée **sans** son ADR. La roadmap l'a inscrit comme dette.

Ce document **constate** donc ce qui est en place et ce qui a été écarté. Il ne présente pas comme
ouvert un choix déjà fait. Les alternatives sont pourtant **chiffrées par mesure** (CT-08), le
2026-10-27 : à défaut d'avoir précédé le code, l'arbitrage reste vérifiable.

## Contexte

La route décide de l'état de scène, et l'état de scène décide de la pose de caméra :
`resolveSceneState` → `getCameraTarget` → caméra (ADR-0002). Le **comment** du déplacement restait
ouvert depuis la Phase 0, « parce qu'il dépend du ressenti réel ». Toute option devait permettre
quatre choses, écrites avant le rig :

1. **L'interruption** (P6-04). Une navigation pendant une transition repart de la pose **affichée**,
   sans saut.
2. **Le `fov` interpolé avec la position**, puis corrigé par `fovForAspect`. La correction de format
   s'applique à la valeur interpolée, jamais aux bornes (P6-02).
3. **La boucle à la demande** (P5-10). En `frameloop='demand'`, le mouvement demande ses images
   (`invalidate()`) tant qu'il dure, sans laisser la boucle en `always`.
4. **Une durée nulle sous `prefers-reduced-motion`** (P6-08) : une coupe, pas un mouvement accéléré.

S'y ajoute CT-10 : la logique de caméra doit être **testable sans WebGL**.

## Décision

**Aucune bibliothèque.** Deux mécanismes maison, chacun choisi pour ce qu'il anime.

### 1. Les transitions entre états : une interpolation à durée fixe

| Élément | Valeur | Où |
|---|---|---|
| Courbe | `easeInOutCubic`, lente au départ et à l'arrivée, « le mouvement d'une grue, pas d'un projectile » | `state/camera-motion.ts` |
| Durée | **1,6 s**, quelle que soit la distance | `transitionMs` dans `state/layout.ts` |
| Ce qui est interpolé | position, cible et `fov`, linéairement sur la valeur adoucie | `interpolatePose` |
| Interruption | la nouvelle transition part de `shown` : la pose **interpolée** de l'image précédente, avant l'orbite et la correction de format. L'orbite, elle, décroît séparément vers zéro : c'est cette indépendance qui évite le saut | `camera-rig.tsx` |
| Mouvement réduit | `transitionMs(true) = 0`, et `transitionProgress` rend **1** sur une durée nulle : une coupe | `camera-motion.ts` |
| Horloge | l'heure de la **première image** rendue après le changement d'état, pas celle de la navigation | `camera-rig.tsx` |

⭐ **La durée est née du ressenti.** La première valeur, 0,7 s, a été abandonnée au prototype : un
déplacement de 13 unités autour du noyau lu en 0,7 s se perçoit comme un saut, pas comme un
mouvement de caméra (`layout.ts`). C'est exactement l'incertitude que la Phase 0 refusait de
trancher sur le papier.

⭐ **L'horloge part de la première image, et c'est voulu.** Une scène cachée (une fiche,
`frameloop='never'`) ne rend rien. Une transition demandée pendant qu'elle est cachée commence quand
la scène réapparaît, au lieu d'être déjà finie sans avoir été vue.

### 2. L'orbite et la parallaxe : une approche exponentielle

Le glisser (±28° en lacet, ±12° en tangage) et la parallaxe vers la souris (±5° / ±3°) forment une
**consigne**, bornée par `clampOrbit`. L'orbite affichée la rattrape à chaque image :

```text
orbite += (consigne − orbite) × k,   k = min(1, δ × 5)   (δ : durée de l'image, en secondes)
```

Sans mouvement (`reduced-motion`), `k = 1` : l'orbite saute à sa consigne.

Ici, **pas de durée fixe**, à dessein : la consigne bouge **en continu** sous la souris. Une
transition à durée fixe repartirait de zéro à chaque `pointermove` et ne finirait jamais.

### Ce que les deux mécanismes partagent

- **La part pure** vit dans `state/camera-motion.ts`, sans import de three, et elle est éprouvée sans
  navigateur (`tests/unit/scene/camera-motion.test.ts`) : courbe et bornes, avancement, coupe à durée
  nulle, interruption sans saut, orbite bornée qui ne zoome pas, parallaxe (CT-10).
- ⚠️ **Elle n'est pas tout.** Restent dans le rig (`camera-rig.tsx`), **sans banc unitaire** :
  - l'approche exponentielle de l'orbite ;
  - la somme du glisser et de la parallaxe ;
  - les sensibilités du glisser (0,18 et 0,12) ;
  - le seuil de convergence (0,01°) ;
  - l'application de `fovForAspect` à la valeur **interpolée**.
- **Le rig demande ses images** : `invalidate()` tant que `t < 1` ou que l'orbite n'a pas rejoint sa
  consigne à 0,01° près. Hors de là, `demand` ne rend rien.

## Alternatives considérées

Coût mesuré le **2026-10-27** sur le chunk 3D différé (les deux chunks qui portent des modules
three, en `gzip -9`, comme `nexus-prototype.md` §7). Chaque sonde a été construite par `make bundle`,
puis retirée. Référence actuelle : **248 317 octets**. Budget : cible 260 Ko, seuil bloquant 320 Ko
en Phase 5 ; 300 et 350 Ko après la direction artistique (`performance-budget.md` §4.3).

| Option | Surcoût mesuré | Dépendance |
|---|---|---|
| **Interpolation maison** (retenue) | **0** | aucune |
| `maath` — `easing.damp3`, l'amortissement qu'emploie drei | **+3 030 octets** | ⚠️ une **dépendance directe de plus** : `maath` est dans le verrou, mais seulement comme dépendance de drei, et pnpm le refuse à l'import (`Module not found`) |
| `CameraControls` de drei (la bibliothèque `camera-controls`) | **+10 570 octets** | aucune nouvelle, drei étant déjà là |
| `@react-spring/three` 10.1.2, ressort physique | **+13 960 octets** | **six** paquets entrent au verrou |

**Aucune ne crève le budget** : le poids n'a pas décidé. Ce qui a décidé, option par option :

**`maath` (amortissement exponentiel).** C'est l'alternative la plus légère et la plus proche du
besoin. L'interruption y est naturelle, sans état de départ. Elle est rejetée pour trois raisons :
- **Pas de durée.** Une transition amortie n'a pas de fin, seulement une convergence. La coupe sous
  `reduced-motion` devient un cas à part au lieu d'une durée nulle.
- **Les bancs perdent leur prise.** « À 10 % du temps, moins de 1 % du chemin » ne se teste plus sur
  une fonction pure. Il faut simuler une suite d'images.
- **CT-08** : une dépendance structurante de plus pour 15 lignes qu'elle remplacerait.

Pour l'orbite, où l'absence de durée est souhaitable, le dépôt fait déjà la même chose, en une ligne.

**`CameraControls` (drei).** Ce composant **possède** la caméra : il porte son propre état de pose,
ses propres gestes et ses propres transitions (`setLookAt(…, true)`). Il entre en conflit avec
ADR-0002, où la pose se **déduit** de la route à chaque rendu, et avec le cadrage par
`setViewOffset` et `fovForAspect`, qu'il faudrait réconcilier avec son état interne. Ce serait deux
sources de vérité pour une seule caméra, soit la classe de défauts qu'ADR-0016 a écartée en
choisissant React Three Fiber.

**`@react-spring/three` (ressort).** C'est le plus « physique », et une transition y conserve sa
vitesse quand elle est interrompue. C'est aussi le plus cher, avec six paquets. Il a les mêmes
défauts que `maath` : pas de durée, des bancs à simuler. Il ajoute un ordonnanceur propre, qui
s'articule mal avec `frameloop='demand'` (P5-10), puisqu'il faudrait lui faire réclamer les images.

## Conséquences

**Ce qui est obtenu.**
- Zéro octet et zéro dépendance pour l'animation de caméra.
- Une durée exacte, que la coupe sous `reduced-motion` réduit à zéro sans cas à part.
- Les quatre exigences tenues. ⚠️ **Deux seulement sont épinglées par un banc unitaire** :
  l'interruption (1) et la durée nulle (4). La correction de format sur la valeur interpolée (2) et
  l'`invalidate()` image par image (3) ne vivent que dans le rig. Seuls le parcours E2E et la
  relecture les gardent : une régression y passerait avec tous les bancs unitaires au vert.

**Ce qui est accepté.**
- **L'interruption repart de la pose, pas de la vitesse.** Une navigation au milieu d'un déplacement
  rapide repart de vitesse nulle, avec l'accélération douce de `easeInOutCubic`. C'est un léger coup
  de frein perceptible, que seul un ressort éviterait. Jugé acceptable sur un site où l'on navigue
  entre quatre états, pas en continu.
- **1,6 s pour tout trajet**, court ou long. Un trajet court paraît lent : c'est le prix d'une
  durée exacte. Une durée fonction de la distance resterait compatible avec cette décision, car seule
  `transitionMs` changerait.
- **`k = min(1, δ × 5)` n'est qu'approximativement indépendant de la cadence.** La forme exacte
  serait `1 − e^(−5δ)`. En rendu continu, l'écart est faible : après une seconde, il reste 0,54 % de
  l'écart à 60 i/s et 0,42 % à 30 i/s, contre 0,67 % pour la forme exacte.
  ⛔ **Il n'en va pas de même en `frameloop='demand'`.** La première image après un repos porte une
  durée δ égale à tout ce repos, donc `k = 1`, et l'orbite **saute** à sa consigne sans amortissement.
  Le défaut ne se voit pas aujourd'hui, mais **par configuration seulement** : la boucle ne passe en
  `demand` qu'au palier `lite`, où l'orbite et la parallaxe sont désactivées, et sous mouvement
  réduit, où `k = 1` est voulu. ⚠️ Un futur palier qui garderait l'orbite en `demand` le rendrait
  visible : plafonner δ ou passer à la forme exacte n'y suffirait pas seul, il faudrait repartir
  d'une image courte.

**Ce qui reste ouvert, non démontré.**
- **L'interruption remet `from` et `started` dans un `useEffect`**, passif. Si une image est rendue
  entre la validation du nouvel état par React et l'exécution de l'effet, elle lit le **nouvel**
  objectif avec l'**ancien** départ. Une transition déjà finie (`t = 1`) poserait alors la caméra
  directement sur la cible : une coupe, là où l'ADR promet un mouvement. Rien ne l'a observé à ce
  jour. Un `useLayoutEffect` fermerait cette fenêtre : à vérifier, puis à corriger dans le rig.

**Ce qui rouvrirait la décision.**
- Un **besoin de suivi continu** à durée inconnue, comme une caméra qui accompagne un objet animé.
  Un amortissement s'imposerait alors, et `maath` deviendrait le premier candidat, sous CT-08.
- Un **retour d'usage** qui jugerait le coup de frein à l'interruption gênant. Un ressort réglé à la
  main, sans bibliothèque, serait à mesurer avant `@react-spring/three`.
