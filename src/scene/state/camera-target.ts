/**
 * Le cadrage que vise un état de scène — P6-02, deuxième maillon d'ADR-0002.
 *
 * ```text
 * URL ──▶ resolveSceneState(pathname) ──▶ SceneState ──▶ getCameraTarget ──▶ caméra
 * ```
 *
 * ⭐⭐ **C'est le seul endroit où les deux vocabulaires se rencontrent.**
 * `SceneFocus` parle la langue de l'URL (`overview`, `projects`, `skills`), `ViewId`
 * celle du plan coté (`accueil`, `projets`, `competences`). Aucun quatrième
 * vocabulaire — pas de `Screen`, pas de position d'écran recopiée.
 *
 * ⭐ **Depuis P8-15c, les cadrages sont un PARAMÈTRE** : ils viennent du plan de
 * carte versionné (`BoardFile.cameras`, précalculé par `make board`), chargé par
 * la scène pour sa locale. Ce module n'importe plus que des types — il ne tire
 * plus `layout.ts`.
 */
import type { CameraSpec, ViewId } from './layout.ts'
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
 * Le cadrage — position, cible, `fov` et dalle mise en avant — que la caméra
 * doit atteindre pour cet état, pris dans `cameras` : ceux que le rig calcule
 * pour la zone libre (`boardCameras(plan, zone)`, P8-05).
 *
 * ⭐ **Rend l'instance de `cameras` elle-même**, jamais une copie : le rig dit
 * « même cible » par identité.
 *
 * ⛔ **`detail` ne change rien**, et c'est voulu : le dossier cadre des écrans, pas
 * des fiches, et une fiche s'affiche sur l'écran de sa section (Phase 7).
 */
export function getCameraTarget(
  state: SceneState,
  cameras: Readonly<Record<ViewId, CameraSpec>>,
): CameraSpec {
  return cameras[VIEW_FOR_FOCUS[state.focus]]
}
