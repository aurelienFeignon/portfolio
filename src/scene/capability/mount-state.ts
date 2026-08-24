/**
 * L'état de montage de la scène, et ce qu'une défaillance en fait — P5-07.
 *
 * ADR-0003 point 5 : *« toute défaillance — échec d'import, perte de contexte
 * WebGL, erreur d'asset — fait basculer en `none` via une error boundary. Le
 * contenu reste intact et aucun message anxiogène n'est affiché. »* Ce module
 * porte la bascule ; les composants ne font que la projeter.
 *
 * ⭐ **Pourquoi la décision est ici et non dans `SceneMount`** : la même raison
 * que pour `shouldMountScene`. `src/scene/components/**` est exclu de la mesure
 * de couverture et n'est tenu que par le banc E2E — or la propriété centrale de
 * ce module, la non-résurrection, protège d'un cycle qu'aucun banc ne produit
 * sur commande.
 */
import type { Capability } from './resolve'

/**
 * Ce qui peut faire tomber la scène. Trois causes, et elles ne s'observent pas
 * au même endroit :
 *
 * - `chunk` — l'import dynamique du canvas échoue (réseau coupé, chunk absent
 *   après un déploiement). Le composant paresseux **jette au rendu**, donc la
 *   frontière d'erreur le voit.
 * - `render` — une exception pendant le rendu de la scène elle-même. Même
 *   frontière, autre origine ; les distinguer n'a d'intérêt qu'au diagnostic.
 * - `context-lost` — le navigateur retire le contexte WebGL (GPU réinitialisé,
 *   trop de contextes ouverts). ⛔ **Aucune frontière d'erreur ne peut le voir**
 *   : c'est un événement du DOM, pas une exception de rendu. Il se surveille.
 */
export type SceneFailure = 'chunk' | 'render' | 'context-lost'

/**
 * ⚠️ `mounted` dit « on monte », pas « ça fonctionne » : c'est l'état dans lequel
 * le canvas est rendu, donc **aussi** celui d'où partent toutes les défaillances
 * connues. Savoir qu'une scène rend correctement demanderait un signal du moteur
 * que rien ne fournit.
 */
export type SceneMountState =
  | { readonly phase: 'waiting' }
  | { readonly phase: 'mounted'; readonly capability: Capability }
  | { readonly phase: 'abandoned'; readonly failure: SceneFailure }

/** L'état initial : la capacité n'est pas encore lue, la scène n'existe pas. */
export const SCENE_WAITING: SceneMountState = { phase: 'waiting' }

/**
 * La capacité est lue et la scène peut être montée.
 *
 * ⛔⛔ **Une scène abandonnée ne remonte jamais dans la session**, et c'est la
 * seule règle que cette fonction porte. Sans elle, l'appareil dont le contexte
 * se perd en boucle — celui-là même qu'ADR-0003 veut protéger — reçoit un cycle
 * montage / perte / montage sans fin : la lecture de capacité est différée par
 * `requestIdleCallback`, et React rejoue l'effet à chaque remontage, StrictMode
 * compris.
 *
 * ⚠️ Ce n'est pas une renonciation définitive : un rechargement de page repart
 * d'un état neuf. Ce qui est refusé, c'est de réessayer **tout seul**, sans que
 * rien n'ait changé.
 */
export function sceneReady(state: SceneMountState, capability: Capability): SceneMountState {
  if (state.phase === 'abandoned') return state
  return { phase: 'mounted', capability }
}

/**
 * La scène a échoué, quel que soit l'endroit.
 *
 * ⛔ **La PREMIÈRE cause est conservée.** Une perte de contexte suit souvent
 * l'erreur qui l'a provoquée ; c'est la première qui explique quelque chose, et
 * l'écraser rendrait le diagnostic faux au moment précis où il servirait.
 */
export function sceneFailed(state: SceneMountState, failure: SceneFailure): SceneMountState {
  if (state.phase === 'abandoned') return state
  return { phase: 'abandoned', failure }
}
