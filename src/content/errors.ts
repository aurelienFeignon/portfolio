/**
 * L'erreur de la couche Content (P2-03, P2-04).
 *
 * Exigence CF-10 : un contenu invalide fait échouer le build. Un build qui
 * échoue sans dire **quel fichier** est fautif transforme une correction d'une
 * minute en fouille de tout le dossier `content/`. Le chemin est donc porté par
 * le type d'erreur lui-même, jamais laissé à la bonne volonté de l'appelant.
 */
/**
 * Message lisible d'une cause quelconque. Une bibliothèque tierce peut très bien
 * lever une chaîne ou un objet : `error.message` vaudrait alors `undefined`, et
 * le message final se terminerait par le mot « undefined » au lieu de la cause.
 */
export function messageOf(cause: unknown): string {
  return cause instanceof Error ? cause.message : String(cause)
}

export class ContentError extends Error {
  override readonly name = 'ContentError'

  constructor(
    /** Chemin **relatif à la racine du dépôt** : c'est ce qu'on ouvre dans l'éditeur. */
    readonly file: string,
    reason: string,
    options?: { cause?: unknown },
  ) {
    super(`${file} — ${reason}`, options)
  }
}
