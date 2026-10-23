# NEXUS — le prototype

> Branche `feat/nexus-prototype`, ouverte le 2026-10-23 depuis `main` (`2f8389b`).
> ⭐ **Fusionné et déployé le 2026-10-23** (#58, `854d1fe`) — NEXUS est la scène de production. Décision D11 (`phase-0-questions.md`) ;
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
| **Plateforme** | trois disques de métal sombre en gradins, cerclés de bandes lumineuses qui respirent avec le noyau ; colonne de lumière (shader de faisceau) ; grille de sol qui s'efface dans le brouillard | Le noyau est posé, pas suspendu ; la grille donne l'échelle (référence « univers central ») |
| **Expériences** | six plaques de verre translucides en spirale le long de l'axe du temps, liseré lumineux et traits évoquant des lignes de texte, reliées par une hélice parcourue d'impulsions | Une chronologie faite d'« interfaces » empilées (référence « les interfaces ») — six est un nombre de composition, pas le nombre de postes |
| **Projets** | architecture isométrique : trois plateaux de verre en gradins (tournés de 45°), blocs instanciés posés dessus, flux de données en équerre sur chaque plateau et verticaux entre étages | Des composants techniques et leurs flux (référence « les projets ») |
| **Compétences** | 5 amas de points doux (un par domaine) sur un anneau orbital, moyeu central relié à chaque domaine par un rayon lumineux, disque de visée en dessous ; inclinée vers le visiteur | Une constellation organisée : la structure se lit avant les points |
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

**Verre lumineux** (référence « les interfaces ») : panneau translucide (opacité 0,88, flou 16 px), liseré cyan, halo de bord, équerres d'angle dessinées en couches de fond (elles restent collées à la boîte quand le contenu défile) ; cartes à liseré en dégradé cyan → violet, halo au survol des seules cartes cliquables ; lien de navigation actif lumineux. ⭐ Contraste calculé dans le **pire cas** — du cyan pur derrière le verre : texte secondaire 5,3:1, cyan 6,9:1.

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

Protocole : `make perf-baseline` (`performance-budget.md` §6.3) — 5 tirs, médiane, palier lu, témoin
sans scène sur la même image. Référence : le bureau, `1ecfdb3`, `benchmarkIndex` 3 154.

### 6.1 Bundle

| | Bureau (P5) | NEXUS |
|---|---|---|
| Chunk 3D différé (gzip) | 234,5 Ko | **237,5 Ko** (225,0 + 12,5) avec plateforme, architecture et univers retravaillés, mesuré `gzip -9` |
| JS propre à chaque route | 11,0 Ko | **12,7 Ko** (+1,7 : lecture de la route et routeur dans `SceneMount`) |
| Module 3D en première visite | aucun | **aucun** (garde P5-09) |

Aucune dépendance, aucun module drei, aucun post-traitement.

### 6.2 Temps de blocage — relevé valide (`d42fa70`, indice 2 711, −14 %)

| Page · profil | Bureau | NEXUS | Témoin sans scène |
|---|---|---|---|
| Accueil · mobile (`lite`) | 544 ms | **1 231 ms** | 60 ms |
| Accueil · ordinateur (`full`) | 135 ms | **279 ms** | 0 ms |
| Fiche · mobile | 596 ms | **327 ms** | 81 ms |
| Fiche · ordinateur | 135 ms | **0 ms** | 0 ms |

LCP et CLS inchangés (CLS 0 partout). **Les fiches gagnent** — la scène y est cachée et ne calcule
aucune image ; **l'accueil double** par rapport au bureau.

### 6.3 ⛔ Ce que l'enquête a établi, et ce qu'elle a réfuté

1. ⛔ **Réfuté — la boucle continue.** Passer l'ambiance du palier `lite` en image fixe n'a rien
   changé (1 126 → 1 231 ms). L'image fixe est conservée pour la batterie, pas pour le TBT.
2. ✅ **Établi — le coût est à la PREMIÈRE IMAGE.** Repères posés dans la page : construire la scène
   coûte 18 ms, lancer la compilation 11 ms ; puis une tâche longue unique dans le chunk de three
   (433 ms sur ordinateur non bridé, ~1,2 s en mobile simulé). « Other » passe de 465 ms (bureau) à
   3 500 ms : c'est le travail du pilote graphique, pas du JavaScript.
3. ⛔ **Sans effet dans ce banc — `compileAsync`.** Le Chromium du banc n'offre **pas**
   `KHR_parallel_shader_compile` (vérifié), donc la compilation reste synchrone. Le code est gardé :
   il évite le blocage là où l'extension existe — la plupart des navigateurs avec un vrai GPU —, ce
   qui n'est **pas encore vérifié** sur matériel réel.
4. ⛔ **Réfuté — découper la vérification des programmes** en tâches séparées : la grande tâche
   reste au premier dessin. Abandonné, il touchait aux rouages internes de three sans gain.
5. ⚠️ **Hypothèse restante** : SwiftShader (rendu sur CPU, sans GPU) compile les shaders au premier
   dessin, et NEXUS en a ~10 contre 1 à 2 pour le bureau. Le chiffre de ce banc pourrait donc
   surestimer fortement le coût sur un appareil réel — à mesurer sur matériel réel (Phase 13).
6. ⚠️ Deux relevés ultérieurs sont **invalides** au sens du §6.3 (indice 2 253 puis 1 400–1 900,
   charge de l'hôte à 27) et ne sont pas cités.

### 6.4 ✅ Sur un appareil réel — mesuré le 2026-10-23

Panneau `?debug=scene` (première image chronométrée jusqu'à la fin de son rendu, tâches longues
imputées à la scène à partir de sa décision de montage), dans le Chrome de l'utilisateur.
Machine : **NVIDIA GeForce RTX 5050 Laptop** (ANGLE / Direct3D 11), **compilation parallèle : oui**.

| Relevé | Tâches longues | Blocage (TBT) | Première image | Draw calls |
|---|---|---|---|---|
| Normal | 0 | **0 ms** | 712 ms | 72 |
| Fenêtre privée neuve (cache de shaders vide) | 0 | **0 ms** | 738 ms | 72 |
| Processeur bridé ×4 | 5 (max 134 ms) | **154 ms** | 869 ms | 35 ¹ |
| *Banc, pour mémoire (SwiftShader, sans compilation parallèle)* | *21 (max 755 ms)* | *882 ms* | *1 239 ms* | *72* |

¹ fenêtre rétrécie par les outils de développement : la caméra cadre moins d'objets.

**Ce que cela établit :**

1. ✅ **L'hypothèse du §6.3 point 5 est confirmée** : le coût du banc venait du rendu logiciel et de
   l'absence de compilation parallèle. Sur un vrai GPU, `ShaderWarmup` (`compileAsync`) prépare les
   shaders en arrière-plan : **aucune tâche longue**, y compris sur une vraie première visite.
2. ✅ **Avec un processeur de téléphone simulé, 154 ms de blocage** — sous la cible de 200 ms. Le banc
   annonçait 1 231 ms en mobile : il surestime ce coût d'un facteur ~8.
3. ⭐ Les ~700 ms de « première image » ne bloquent rien : c'est le délai avant le fondu
   d'apparition (chunk 3D, compilation en arrière-plan), pendant lequel la page reste utilisable.

**Ce qui reste NON vérifié** : un GPU intégré, un vrai téléphone, et Safari (qui n'offre peut-être
pas `KHR_parallel_shader_compile` — sans elle, on retombe sur la compilation synchrone du banc).
⚠️ **Conséquence pour l'outillage** : `make perf-baseline` mesure le banc sans GPU. Il reste juste
pour comparer deux versions entre elles ; il ne dit pas ce que vit un visiteur équipé d'un GPU.

**Pistes non essayées, à garder pour les appareils sans compilation parallèle** : moins de variantes de matériaux (fusionner les matériaux de base et de
lignes), compiler par étapes en rendant les objets un à un pendant le fondu, et surtout **mesurer
sur un appareil réel** avant d'optimiser davantage.
