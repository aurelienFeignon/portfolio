/**
 * Les couleurs de marque, **en TypeScript**, pour ce qui rend hors du navigateur
 * (P4-08).
 *
 * `ImageResponse` n'a ni feuille de style ni variables CSS : l'image de partage
 * et l'icône doivent porter leurs valeurs en clair. La question n'est donc pas
 * *s'il* faut recopier `globals.css` — il le faut —, mais **combien de fois**.
 *
 * ⛔ La réponse était « deux », et le garde ne pouvait pas le voir : il vérifie
 * que chaque littéral **est** un token, jamais que deux fichiers désignent le
 * **même** token. Changer l'accent d'une image et laisser celui de l'autre
 * gardait la suite verte pendant que les deux se contredisaient sur la marque.
 * Relevé en revue.
 *
 * Il n'y a donc qu'une copie, et `share-image-follows-the-tokens.test.ts` la
 * confronte aux tokens.
 */
export const BRAND = {
  /** `--color-accent` */
  accent: '#0b57d0',
  /** `--color-background` */
  background: '#ffffff',
  /** `--color-text` */
  text: '#1a1a1a',
  /** `--color-text-muted` */
  textMuted: '#55575c',
}
