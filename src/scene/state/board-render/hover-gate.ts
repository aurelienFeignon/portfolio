/**
 * Le **filtre du survol** de la carte mère (P8-15f, `carte-mere.md` §8) : `onHover` n'est appelé
 * que lorsque la cible change.
 *
 * ⛔ La comparaison porte sur la **dernière valeur envoyée**, jamais sur la prop `hovered` : un
 * même événement de pointeur peut déclencher `onPointerOut` (→ `null`) puis `onPointerMove`
 * (→ la cible) sans rendu entre les deux — du corps d'un processeur à son capot, d'une puce à sa
 * diode. Comparée à la prop, encore égale à la cible, la seconde valeur était jetée et le survol
 * restait éteint sous le pointeur.
 *
 * `last` est la boîte (un `useRef` côté scène) qui garde la clé envoyée ; la scène la réaligne sur
 * la prop quand celle-ci change d'ailleurs (une route qui efface le survol).
 *
 * Module pur : ni Three.js, ni React.
 */
import { type BoardTarget, targetKey } from './targets.ts'

/** Vrai si `target` doit être envoyée ; `last` retient alors sa clé. */
export function offerHover(last: { current: string }, target: BoardTarget | null): boolean {
  const key = targetKey(target)
  if (key === last.current) return false
  last.current = key
  return true
}
