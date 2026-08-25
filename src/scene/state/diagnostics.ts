/**
 * Le panneau de diagnostic, côté décision — P5-08.
 *
 * Aucun import de `three`, aucun accès au navigateur : ce module dit **quoi
 * afficher**, jamais comment le mesurer. La lecture de `renderer.info` vit dans
 * `scene/components`, qui est hors couverture ; ce qui est ici est éprouvable.
 *
 * ⭐ **Le panneau existe à cause d'un manque nommé par P5-07** : rien ne
 * distingue à l'écran une scène qui n'a jamais monté d'une scène tombée. Il est
 * le premier endroit où l'état réel de la scène peut se lire.
 */

/**
 * Les relevés bruts d'une image. `null` signifie **mesure indisponible**, jamais
 * « zéro » — la distinction est la même qu'en P5-03 pour `deviceMemory`, et pour
 * la même raison : `performance.memory` n'existe que sur Chromium, et afficher
 * 0 Mo ailleurs annoncerait une machine sans mémoire au lieu d'un navigateur
 * sans l'API.
 */
export interface SceneReadings {
  readonly drawCalls: number
  readonly triangles: number
  readonly geometries: number
  readonly textures: number
  /** `WebGLRenderer.info.programs` peut ne pas être renseigné. */
  readonly programs: number | null
  readonly framesRendered: number
  /** Coût de la dernière image en millisecondes ; `null` avant la première. */
  readonly lastFrameMs: number | null
  /** Tas JavaScript en Mo — Chromium seulement. */
  readonly jsHeapMb: number | null
}

/**
 * Intervalle minimal entre deux remontées de relevés, en millisecondes.
 *
 * ⭐ Sans lui, rien ne se voit aujourd'hui : en `frameloop="demand"` la scène rend
 * une image puis se tait. Mais P6-04 animera à 60 images par seconde, et remonter
 * chaque image ferait re-rendre React soixante fois par seconde **pour afficher
 * un panneau de debug** — l'instrument coûterait plus cher que ce qu'il mesure.
 */
export const SAMPLE_INTERVAL_MS = 250

/** Faut-il remonter un relevé maintenant ? `null` = aucun relevé encore fait. */
export function shouldSample(previousMs: number | null, nowMs: number): boolean {
  return previousMs === null || nowMs - previousMs >= SAMPLE_INTERVAL_MS
}

export interface DiagnosticLine {
  readonly label: string
  readonly value: string
}

/** Ce qui s'affiche quand la mesure n'existe pas. Jamais un chiffre. */
const INDISPONIBLE = '—'

/**
 * Séparateur de milliers : `4114` et `41140` se ressemblent beaucoup trop sur un
 * panneau qu'on lit du coin de l'œil.
 *
 * ⛔ **Écrit à la main, PAS avec `toLocaleString`** : son résultat dépend de l'ICU
 * compilé dans Node. Un binaire `small-icu` rend `4,114` là où le nôtre rend
 * `4\u202f114` — le banc passerait ici et rougirait en CI, pour une raison sans
 * rapport avec ce qu'il vérifie.
 *
 * ⚠️ Et l'espace fine s'écrit **en échappement** : ESLint refuse le caractère
 * U+202F littéral (`no-irregular-whitespace`), à juste titre — un séparateur
 * invisible dans le source est indistinguable d'une espace ordinaire.
 */
const entier = (valeur: number): string => String(valeur).replace(/\B(?=(\d{3})+(?!\d))/g, '\u202f')

const nombre = (valeur: number | null): string => (valeur === null ? INDISPONIBLE : entier(valeur))

export function diagnosticLines(readings: SceneReadings): readonly DiagnosticLine[] {
  return [
    /*
     * ⛔⛔ **« toutes passes » n'est pas une précision de confort.** `renderer.info`
     * cumule la passe d'ombre et la passe principale : la scène desktop y rend
     * **52 draw calls et 8 182 triangles** là où le banc en certifie 30 et 4 114.
     * Sans ces deux mots, le panneau fait conclure à une régression de la scène —
     * alors qu'il mesure autre chose que le banc, et que les deux ont raison.
     *
     * ⭐ Mesuré, pas supposé : au palier `lite`, où les ombres sont coupées, le
     * panneau rend **exactement** les 20 et 1 966 du banc. L'écart est donc
     * entièrement la passe d'ombre — ce que le dossier de scène annonçait sans
     * l'avoir jamais chiffré (`phase-5-log.md` §9.4).
     */
    { label: 'draw calls (toutes passes)', value: entier(readings.drawCalls) },
    { label: 'triangles (toutes passes)', value: entier(readings.triangles) },
    { label: 'géométries', value: entier(readings.geometries) },
    { label: 'textures', value: entier(readings.textures) },
    { label: 'programmes', value: nombre(readings.programs) },
    { label: 'images rendues', value: entier(readings.framesRendered) },
    {
      label: 'dernière image',
      /*
       * ⭐ « aucune » et non « 0,0 ms » : en `frameloop="demand"`, n'avoir rendu
       * aucune image est l'état NORMAL d'une scène immobile. Un zéro y
       * ressemblerait à une image gratuite, ce qui est le contraire de ce qui se
       * passe.
       */
      value:
        readings.lastFrameMs === null
          ? 'aucune'
          : `${readings.lastFrameMs.toFixed(1).replace('.', ',')} ms`,
    },
    {
      label: 'tas JS',
      value: readings.jsHeapMb === null ? INDISPONIBLE : `${readings.jsHeapMb} Mo`,
    },
  ]
}
