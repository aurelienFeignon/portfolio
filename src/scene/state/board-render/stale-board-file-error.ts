/**
 * Un plan relu qui n'est pas celui qu'attend ce code : autre version du format, autre locale,
 * ou réponse qui n'est pas un plan (P8-15c).
 *
 * ⭐ **La même cause qu'un chunk introuvable** : un JSON d'une autre version est un chunk d'un
 * autre déploiement, servi à une page restée ouverte. `SceneBoundary` la range donc en `chunk`
 * — le visiteur voit la page sans scène, comme pour un chunk que Turbopack ne trouve pas.
 *
 * ⭐ **Son propre nom, et un module à elle.** Elle a d'abord emprunté le nom `ChunkLoadError` de
 * Turbopack, ce qui faisait de la frontière un critère à deux producteurs dont un seul était
 * écrit (P8-15h). La frontière la reconnaît désormais par `instanceof` ; et ce module ne tire
 * rien, pour que la frontière — sur le chemin de première visite — n'emporte ni le chargeur ni
 * le format du plan.
 */
export class StaleBoardFileError extends Error {
  override readonly name = 'StaleBoardFileError'
}
