/**
 * Le repère de performance qui dit quel palier a été décidé.
 *
 * ⛔⛔ **Le palier monté pendant un audit n'était consigné nulle part.** La dette
 * de TBT de la Phase 5 (`performance-budget.md` §6.2) a été chiffrée sans savoir
 * si la scène mesurée portait ses ombres (`full`) ou non (`lite`) — or
 * l'émulation mobile de Lighthouse peut rendre `(pointer: fine)` faux, et donc
 * faire tomber le palier sans que rien ne le dise.
 *
 * ⭐ Un `performance.mark` plutôt qu'un attribut du DOM : Lighthouse le rapporte
 * de lui-même (audit `user-timings`), **avec son instant**, et il existe aussi au
 * palier `none`, où aucune enveloppe n'est rendue.
 *
 * ⚠️ **Le nom est relu, et non importé, par `scripts/measure-performance.mts`** :
 * `scripts/` n'a pas le droit d'importer `scene` (`eslint.config.mjs`,
 * `COMPOSITION_ROOTS`). La copie échoue bruyamment — un nom qui changerait
 * ferait arrêter la mesure sur « aucun palier décidé » —, et les deux bancs E2E
 * du montage citent le littéral, donc rougiraient avant elle.
 */
import type { CapabilityTier } from './resolve'

export function tierMark(tier: CapabilityTier): string {
  return `scene:tier:${tier}`
}
