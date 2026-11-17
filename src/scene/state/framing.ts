/**
 * Le format de référence des cadrages — P5-06, réduit par P8-05.
 *
 * Les cadrages du plan versionné (`BoardFile.cameras`) sont calculés pour un canvas 16:9
 * entièrement libre. Au rendu, le rig les recalcule pour la zone que le panneau laisse
 * (`boardCameras(plan, zone)`).
 *
 * ⛔⛔ **Ce module portait la correction de format `fitFov`** : élargir le champ vertical pour
 * garder le champ HORIZONTAL du 16:9, plafonné à 50°, puis reculer de ce que le plafond
 * retirait. Elle préservait un champ, pas le sujet : sur un téléphone en portrait, la vue
 * gardait les marges latérales du 16:9 — la carte d'accueil occupait ~65 % de la largeur, et
 * la vue des expériences montrait la carte entière, petite, au-dessus d'une bande vide
 * (capture du 2026-11-17, Xiaomi 14T Pro). Chaque vue cadre désormais SON rectangle dans la
 * zone réelle, au champ fixe de `BOARD_FOV` : plus de plafond, donc plus d'œil de poisson à
 * borner.
 */

/** Le format pour lequel le plan versionné calcule ses cadrages de référence. */
export const REFERENCE_ASPECT = 16 / 9

/** Un degré, en radians. */
export const DEG = Math.PI / 180
