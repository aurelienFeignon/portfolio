/**
 * Le cadrage quand l'écran n'est pas en 16:9 — P5-06.
 *
 * ⛔⛔ **Les quatre cadrages de `layout.ts` sont calculés pour un rapport 16:9**,
 * et leur `fov` est **vertical**. Sur un écran plus étroit, le champ horizontal
 * se referme mécaniquement : rendu sur un iPhone 14 en portrait, l'accueil ne
 * montrait **ni le bureau, ni la lampe, ni l'écran gauche** — un morceau d'écran
 * central et le portable. Mesuré et photographié le 2026-08-24
 * (`phase-5-log.md` §7.10).
 *
 * Le dossier de scène §6 prescrit la correction : *« si le format descend sous
 * 16:9, augmenter son `fov` plutôt que de reculer la caméra, pour ne pas
 * réintroduire le mur dans le champ »*. Ce module l'applique aux quatre
 * cadrages, là où le dossier ne la chiffrait que pour un seul.
 */

/** Le format pour lequel le dossier a calculé position, cible et `fov`. */
export const REFERENCE_ASPECT = 16 / 9

/**
 * Plafond du champ vertical, en degrés.
 *
 * ⛔⛔ **Sans lui, la règle produit un œil de poisson.** Préserver *tout* le champ
 * horizontal sur un iPhone 14 en portrait (rapport 0,462) demanderait **103°** de
 * champ vertical : la perspective se déforme violemment, et le décor que les
 * cadrages excluent — mur, sol, siège — revient dans l'image.
 *
 * ⚠️ **Ce plafond ne répare donc pas le portrait extrême, il le borne**, et il
 * faut le dire : à 50° sur un rapport de 0,462, le champ horizontal couvre
 * ~0,84 m à la distance de l'accueil, contre 1,40 m de plateau. Un téléphone
 * vertical continuera de ne pas voir tout le bureau. Le traiter vraiment
 * demanderait des cadrages portrait dédiés — donc des cotes, qui viennent du
 * dossier et ne s'inventent pas ici. C'est le sujet de la Phase 13.
 */
export const FOV_MAX_DEG = 50

const DEG = Math.PI / 180

/** Champ horizontal d'une caméra, à partir de son champ vertical et du format. */
export function horizontalFovDeg(verticalFovDeg: number, aspect: number): number {
  return (2 * Math.atan(Math.tan((verticalFovDeg * DEG) / 2) * aspect)) / DEG
}

/**
 * Le champ vertical à employer pour ce format.
 *
 * ⭐ **Elle n'agit que dans un sens.** Sur un écran plus large que 16:9, le champ
 * horizontal est déjà supérieur à celui pour lequel la scène est cadrée :
 * resserrer le `fov` vertical pour « compenser » retirerait de la hauteur — donc
 * le plateau et le mur — sans que rien ne le demande.
 */
export function fovForAspect(
  fovAt16by9: number,
  aspect: number,
  maxDeg: number = FOV_MAX_DEG,
): number {
  if (aspect >= REFERENCE_ASPECT) return fovAt16by9

  const elargi =
    (2 * Math.atan(Math.tan((fovAt16by9 * DEG) / 2) * (REFERENCE_ASPECT / aspect))) / DEG

  // ⭐ Le plafond ne peut pas RABAISSER un cadrage déjà plus ouvert que lui : une
  // règle qui n'existe que pour élargir ne doit jamais resserrer.
  return Math.min(elargi, Math.max(maxDeg, fovAt16by9))
}
