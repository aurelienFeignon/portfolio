/**
 * Un corps MDX, compilé **et** rendu dans son conteneur (P4-05).
 *
 * ⭐⭐ **Pourquoi les trois morceaux ne sont pas dans la route.** Compiler,
 * nommer le fichier et envelopper le résultat dans `.prose` forment un seul
 * invariant : *un corps compilé est toujours rendu dans ce conteneur*. Éclaté
 * entre une route et son module CSS, cet invariant n'était porté par rien — un
 * second appelant qui oublie l'enveloppe obtient un mur de texte, sans erreur.
 * second appelant : les expériences portent déjà des corps que leur fiche ne
 * rend pas.
 *
 * `src/ui` ne reçoit qu'une **chaîne** : la frontière avec `src/content` est
 * intacte (`architecture.md` §1.2), et c'est déjà ce que fait `renderMdx`.
 *
 * `article` plutôt que `div` : le corps est un contenu autonome. C'est aussi ce
 * qui le rend désignable par son rôle — un test qui viserait `main p` serait
 * satisfait par le seul résumé de la page.
 */
import { renderMdx } from './render'
import styles from './prose.module.css'

export async function Prose({ source, file }: { readonly source: string; readonly file: string }) {
  return <article className={styles.prose}>{await renderMdx({ source, file })}</article>
}
