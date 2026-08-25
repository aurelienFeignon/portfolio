/**
 * L'aiguillage du panneau de diagnostic — et **rien d'autre** (P5-08).
 *
 * ⛔⛔ **Ce fichier existe pour une raison mesurée, pas par goût du découpage.**
 * `shouldShowDiagnostics` doit être lue par le montage de la scène, qui vit dans
 * le chunk de **première visite**. Tant qu'elle habitait `diagnostics.ts`, cet
 * import statique y tirait le module entier — le formatage des relevés compris,
 * qui ne sert qu'au panneau. Vérifié dans les source maps des chunks servis :
 * `state/diagnostics.ts` y figurait, et le JS par route était passé de 10,8 à
 * 11,3 Ko.
 *
 * ⭐ *Un module est indivisible du point de vue d'un bundler : importer une
 * fonction, c'est embarquer ses voisines.* La frontière du chunk est donc la
 * frontière du fichier, et pas celle de l'import.
 */

/**
 * ⛔ Comparaison stricte, pas une inclusion. `search.includes('debug=scene')`
 * satisfait tous les cas nominaux et ouvre le panneau sur
 * `?debug=scenes-de-menage` : un test qui passe pour la mauvaise raison, et une
 * porte dérobée par accident.
 */
export function shouldShowDiagnostics(search: string): boolean {
  return new URLSearchParams(search).get('debug') === 'scene'
}
