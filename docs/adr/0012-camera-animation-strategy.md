# ADR-0012 — Animation de caméra : interpolation maison à durée fixe, sans bibliothèque

- **Statut** : ACCEPTÉ (Phase 6). Décision livrée par #58 le 2026-10-23, ADR écrit le 2026-10-27
  (P6-09, voir « Écart »).
- **Décide** : comment la caméra passe d'un état de scène à l'autre, et comment elle suit le
  pointeur — avec quel outil, quelle courbe, quelle durée.
- **Numéro** : 0012, réservé à ce sujet dès la Phase 0 (`README.md`, « Décisions identifiées »).
- **Lié à** : ADR-0002 (la route est la seule source de vérité), ADR-0003 (enrichissement
  progressif), ADR-0016 (dépendances 3D), CT-08, CT-10.

## Écart : un ADR écrit après sa décision

L'ordre de travail de la Phase 6 (`phase-6-log.md` §5) plaçait P6-09 **avant** P6-04 : un choix
entre interpolation maison et bibliothèque de ressorts se pose avant d'écrire le rig, pas après.
Ce n'est pas ce qui s'est passé : le rig a été écrit dans le prototype NEXUS (#58), sans l'ADR. Ce
document **constate** donc ce qui est en place et ce qui a été écarté, sans présenter comme ouvert un
choix déjà fait. Ses alternatives sont pourtant **chiffrées par mesure** (CT-08) : à défaut d'avoir
précédé le code, l'arbitrage reste vérifiable.

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
| Interruption | la nouvelle transition part de `shown` : la pose **interpolée** de l'image précédente, avant l'orbite et la correction de format. L'orbite, elle, décroît séparément vers zéro : c'est cette indépendance qui évite le saut. La remise à zéro se fait dans un `useLayoutEffect`, avant toute image (P6-12) | `camera-rig.tsx` |
| Mouvement réduit | `transitionMs(true) = 0`, et `transitionProgress` rend **1** sur une durée nulle : une coupe | `camera-motion.ts` |
| Horloge | un temps **accumulé image par image**, remis à zéro au changement d'état, jamais l'horloge de R3F (révisé le 2026-10-27, voir plus bas) | `rigFrame` |

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
orbite += (consigne − orbite) × k,   k = 1 − e^(−5 · pas)   (pas : `frameStepS`, voir plus bas)
```

*Révisé le 2026-10-27 (P6-11) : la règle d'origine était `k = min(1, δ × 5)`. Voir « Ce qui est
accepté ».*

Sans mouvement (`reduced-motion`), `k = 1` : l'orbite saute à sa consigne.

Ici, **pas de durée fixe**, à dessein : la consigne bouge **en continu** sous la souris. Une
transition à durée fixe repartirait de zéro à chaque `pointermove` et ne finirait jamais.

### Ce que les deux mécanismes partagent

- **Tout le calcul d'une image est pur** depuis P6-11 : `rigFrame`, dans `state/camera-motion.ts`,
  sans import de three, éprouvée sans navigateur (`tests/unit/scene/camera-motion.test.ts`, CT-10).
  Elle porte la courbe, la coupe à durée nulle, l'interruption, la somme du glisser et de la
  parallaxe, l'approche de l'orbite (`approachOrbit`), les sensibilités du glisser (`dragOrbit`), le
  seuil de convergence et la correction de format sur la valeur **interpolée**. Le rig ne fait que
  l'appliquer à la caméra.
  *Jusqu'à P6-11, une partie de ce calcul vivait dans le rig, sans banc.*
- **Le rig demande ses images** : `invalidate()` tant que `t < 1` ou que l'orbite n'a pas rejoint sa
  consigne à 0,01° près. Hors de là, `demand` ne rend rien.

## Alternatives considérées

Coût mesuré le **2026-10-27** sur le chunk 3D différé, avec la méthode de `nexus-prototype.md` §6.1 :
la somme des deux chunks qui portent des modules three, en `gzip -9`. Référence : **248 317 octets,
soit 242,5 Kio**. Les seuils sont ceux de `performance-budget.md` §4.

| Option | Surcoût mesuré | Dépendance |
|---|---|---|
| **Interpolation maison** (retenue) | **0** | aucune |
| `maath` — `easing.damp3`, l'amortissement qu'emploie drei | **+3 030 octets (+3,0 Kio)** | ⚠️ une **dépendance directe de plus** : `maath` est dans le verrou, mais seulement comme dépendance de drei, et pnpm le refuse à l'import (`Module not found`) |
| `CameraControls` de drei (la bibliothèque `camera-controls`) | **+10 570 octets (+10,3 Kio)** | aucune nouvelle, drei étant déjà là |
| `@react-spring/three` 10.1.2, ressort physique | **+13 960 octets (+13,6 Kio)** | **six** paquets entrent au verrou |

**Reproduire.** Chaque sonde est construite, mesurée, puis retirée (`git checkout -- .`) :

- `maath` : `pnpm add --save-exact maath@0.10.8`, puis dans `camera-rig.tsx`, remplacer
  `camera.position.set(...position)` par `easing.damp3(camera.position, [...position], 0.25, delta)`.
- `CameraControls` : `import { CameraControls } from '@react-three/drei'`, et `<CameraControls />`
  rendu dans le `<Canvas>` de `scene-canvas.tsx`.
- `@react-spring/three` : `pnpm add --save-exact @react-spring/three@10.1.2`, puis un `useSpring`
  sur la position, dont la valeur (`.get()`) remplace celle de `camera.position.set`.

```bash
make bundle
docker compose run --rm web sh -c 'for f in $(grep -l WebGLRenderer .next/static/chunks/*.js); do gzip -9c "$f" | wc -c; done'
```

On additionne les deux nombres, puis on retranche la référence.

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
- Les quatre exigences tenues, **chacune épinglée par un banc unitaire** depuis P6-11 : la
  correction de format sur la valeur interpolée (2) et la demande d'image tant qu'une transition dure
  (3) se lisent désormais dans `rigFrame`. Les quatre mutations correspondantes sont tuées.
  *Avant P6-11, seules (1) et (4) l'étaient.*

**Ce qui est accepté.**
- **L'interruption repart de la pose, pas de la vitesse.** Une navigation au milieu d'un déplacement
  rapide repart de vitesse nulle, avec l'accélération douce de `easeInOutCubic`. C'est un léger coup
  de frein perceptible, que seul un ressort éviterait. Jugé acceptable sur un site où l'on navigue
  entre quatre états, pas en continu.
- **1,6 s pour tout trajet**, court ou long. Un trajet court paraît lent : c'est le prix d'une
  durée exacte. Une durée fonction de la distance resterait compatible avec cette décision, car seule
  `transitionMs` changerait.
- **Le pas d'une image** (`frameStepS`) n'est pas toujours sa durée réelle : une image de réveil,
  après un repos, compte pour 1/60 s ; une image figée en plein mouvement (onglet en arrière-plan,
  compilation) compte au plus pour 0,1 s. Entre les deux, la durée réelle : un appareil à 20 i/s
  n'est pas ralenti.

**Révisé le 2026-10-27 (P6-11, P6-12)** — quatre défauts, dont un en production :
- ⛔⛔ **Le temps de transition se lisait sur l'horloge de R3F, que `setFrameloop` remet à zéro**
  (vérifié dans R3F 9.8.2) : une fiche fait passer la boucle par `never`. Au retour, le temps écoulé
  devenait négatif, `t` retombait à 0, et la caméra **rejouait** une transition déjà finie depuis son
  ancien départ. Le défaut était en production, et un parcours E2E rougit sur l'image d'avant le
  correctif, sous Chromium comme sous WebKit. Le temps est désormais accumulé image par image
  (`rigFrame`), et l'horloge n'est plus lue.
- **`k = min(1, δ × 5)`** n'était qu'approximativement indépendant de la cadence : il restait, après
  une seconde, 0,54 % de l'écart à 60 i/s et 0,42 % à 30 i/s, contre `e^(−5)` = 0,67 %. Remplacé par
  la forme exacte, épinglée par un banc (même reste à 60 et à 30 i/s).
- **Le saut de l'orbite en `frameloop='demand'`** : la première image après un repos porte une durée
  égale à tout ce repos, donc `k = 1`. Le défaut était latent, masqué par configuration (`demand` ne
  sert qu'au palier `lite`, orbite désactivée, et sous mouvement réduit). Il est fermé par l'image de
  réveil ci-dessus, et un banc l'épingle. *Une première écriture plafonnait TOUTES les images à
  1/30 s : elle ralentissait l'orbite sous 30 i/s, et la revue l'a écartée.*
- **La remise à zéro de la transition dans un `useEffect` passif** : une image rendue avant l'effet
  aurait lu le nouvel objectif avec l'ancien départ, et une transition déjà finie serait devenue une
  coupe. Elle passe dans un `useLayoutEffect`, qui s'exécute au commit, avant toute image. ⚠️ Le
  défaut n'a jamais été observé : le changement le rend impossible par construction, aucun banc ne
  le montre.

**Ce qui rouvrirait la décision.**
- Un **besoin de suivi continu** à durée inconnue, comme une caméra qui accompagne un objet animé.
  Un amortissement s'imposerait alors, et `maath` deviendrait le premier candidat, sous CT-08.
- Un **retour d'usage** qui jugerait le coup de frein à l'interruption gênant. Un ressort réglé à la
  main, sans bibliothèque, serait à mesurer avant `@react-spring/three`.
