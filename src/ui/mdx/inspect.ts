/**
 * Inspection statique d'un corps MDX (P2-08, révisé après revue).
 *
 * **Pur TypeScript, sans JSX ni React**, et ce n'est pas un détail de style : le
 * gate de contenu (`scripts/check-content.mts`) tourne sous `node` seul, qui sait
 * effacer des types mais **pas compiler du JSX**. Tout ce que le gate doit
 * partager avec le rendu vit donc ici, et non dans `render.tsx`.
 */

/** Nom de balise commençant par une majuscule ⇒ composant ; sinon, élément HTML. */
const COMPONENT_NAME = /^[A-Z]/

/**
 * Greffon remark qui relève les composants appelés par le corps.
 *
 * **Le parcours est générique**, et la première version ne l'était pas : elle ne
 * descendait que dans `children`, ce qui laissait passer `{<Danger />}` — une
 * expression JavaScript, dont le contenu est un arbre ESTree accroché à
 * `data.estree` — et un composant placé dans la valeur d'un attribut. Les deux
 * échappaient au contrôle et n'échouaient qu'au rendu, avec un message qui ne
 * nomme pas le fichier. Trouvé en revue.
 *
 * On visite donc **toute** valeur atteignable, en reconnaissant les deux formes
 * de nœud qui portent un nom de composant : `mdxJsx*Element` côté mdast, et
 * `JSXIdentifier` côté ESTree.
 */
export function collectComponentNames(into: Set<string>) {
  const seen = new WeakSet<object>()

  const walk = (value: unknown): void => {
    if (value === null || typeof value !== 'object') return
    if (seen.has(value)) return
    seen.add(value)

    if (Array.isArray(value)) {
      for (const item of value) walk(item)
      return
    }

    const node = value as { type?: unknown; name?: unknown }
    const named =
      node.type === 'mdxJsxFlowElement' ||
      node.type === 'mdxJsxTextElement' ||
      node.type === 'JSXIdentifier'

    if (named && typeof node.name === 'string' && COMPONENT_NAME.test(node.name)) {
      into.add(node.name)
    }

    for (const [key, child] of Object.entries(value)) {
      // `position` ne porte que des numéros de ligne : le traverser double le
      // coût du parcours pour rien.
      if (key !== 'position') walk(child)
    }
  }

  return () => walk
}

/**
 * Options de compilation communes au rendu et au gate.
 *
 * Elles sont partagées, et pas seulement identiques : l'ADR-0009 prévoit qu'un
 * greffon (`remark-gfm`, par exemple) puisse être ajouté si le contenu réel
 * l'exige. Ajouté d'un seul côté, il ferait valider au gate un **dialecte MDX
 * différent** de celui qui sera rendu — un contenu vert au build et cassé à la
 * page. Trouvé en revue.
 */
export function mdxOptions(used: Set<string>): { remarkPlugins: [() => (tree: unknown) => void] } {
  return { remarkPlugins: [collectComponentNames(used)] }
}

/**
 * Le refus opposé à un corps, ou `null` s'il n'y a rien à refuser.
 *
 * Une seule fonction plutôt que « relever les interdits » puis « les décrire » :
 * les deux appelants écrivaient sinon la même séquence de quatre lignes, en
 * repassant `allowed` deux fois.
 */
export function describeIfForbidden(
  used: Iterable<string>,
  allowed: readonly string[],
): string | null {
  const forbidden = [...used].filter((name) => !allowed.includes(name))
  if (forbidden.length === 0) return null

  const cited = forbidden.map((name) => `« ${name} »`).join(', ')
  const list = allowed.length > 0 ? allowed.join(', ') : 'aucun composant autorisé'
  return `utilise ${cited}, hors de la liste blanche des composants MDX (${list})`
}

/**
 * Message d'un corps qui ne compile pas — **une seule formulation** pour le rendu
 * et pour le gate. Deux tests figent ce littéral ; l'écrire deux fois laisserait
 * l'un d'eux vert sur une chaîne qui n'existe plus.
 */
export function describeUnreadableBody(cause: unknown): string {
  return `corps MDX illisible — ${cause instanceof Error ? cause.message : String(cause)}`
}
