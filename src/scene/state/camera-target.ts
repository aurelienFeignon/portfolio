/**
 * Le cadrage que vise un état de scène — P6-02, deuxième maillon d'ADR-0002.
 *
 * ```text
 * URL ──▶ resolveSceneState(pathname) ──▶ SceneState ──▶ getCameraTarget ──▶ caméra
 * ```
 *
 * ⭐⭐ **C'est le seul endroit où les deux vocabulaires se rencontrent.**
 * `SceneFocus` parle la langue de l'URL (`overview`, `projects`, `skills`), `ViewId`
 * celle du plan coté (`accueil`, `projets`, `competences`), et les dalles physiques
 * sont déjà attachées aux cadrages par `CAMERAS[ViewId].focusNodeId`. Aucun
 * quatrième vocabulaire — pas de `Screen`, pas de position d'écran recopiée.
 *
 * ⛔ **Ce module ne vit pas dans `scene-state.ts`, et c'est mesuré** : il importe
 * `layout.ts`, le plan coté du bureau entier, alors que `resolveSceneState` sera
 * lue depuis le chunk de **première visite** (P6-07). *Un module est indivisible
 * du point de vue d'un bundler* (P5-08). L'import de `scene-state.ts` ci-dessous
 * est un import de **type**, effacé à la compilation : le sens inverse ne tire rien.
 */
import { CAMERAS, type CameraSpec, type ViewId } from './layout.ts'
import type { SceneFocus, SceneState } from './scene-state.ts'

/**
 * ⭐⭐ **L'exhaustivité est tenue par le TYPE** : une section ajoutée à `routing`
 * devient un `SceneFocus`, et ce `Record` cesse de compiler tant qu'elle n'a pas
 * de cadrage. Aucune liste à l'exécution, aucun `if`.
 */
const VIEW_FOR_FOCUS: Readonly<Record<SceneFocus, ViewId>> = {
  overview: 'accueil',
  experiences: 'experiences',
  projects: 'projets',
  skills: 'competences',
}

/**
 * Le cadrage — position, cible, `fov` à 16:9 et dalle mise en avant — que la
 * caméra doit atteindre pour cet état.
 *
 * ⭐ **Rend l'instance de `CAMERAS` elle-même**, jamais une copie : P6-04 pourra
 * dire « même cible » par identité, comme il le fait déjà d'`OVERVIEW`.
 *
 * ⛔ **`detail` ne change rien**, et c'est voulu : le dossier cadre des écrans, pas
 * des fiches, et une fiche s'affiche sur l'écran de sa section (Phase 7).
 *
 * ⚠️ **Le `fov` rendu est celui de 16:9.** La correction de format
 * (`fovForAspect`, P5-06) s'applique au moment du rendu, sur la valeur
 * **interpolée** — c'est P6-04. L'appliquer ici la ferait jouer avant
 * l'interpolation, donc sur les deux bornes seulement.
 */
export function getCameraTarget(state: SceneState): CameraSpec {
  return CAMERAS[VIEW_FOR_FOCUS[state.focus]]
}
