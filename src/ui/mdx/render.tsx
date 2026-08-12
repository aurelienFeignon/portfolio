/**
 * Compilation d'un corps MDX en arbre React, côté serveur (P2-08, ADR-0009).
 *
 * **Où vit ce code, et pourquoi pas ailleurs.** La couche Content ne peut pas
 * produire de React (CT-09) : elle rend `body` sous forme de chaîne et s'arrête
 * là. La compilation appartient donc à la couche de rendu, qui ne reçoit qu'une
 * chaîne et ne sait rien du système de fichiers.
 *
 * **Ce qui est envoyé au client : rien.** Le module n'est pas marqué
 * `'use client'` et n'a aucun état ; le résultat est du HTML rendu par le
 * serveur. Le compilateur MDX ne franchit jamais la frontière client — c'est ce
 * que mesure le budget de bundle (`performance-budget.md` §4).
 */
import { evaluate } from '@mdx-js/mdx'
import type { ComponentType, ReactElement } from 'react'
import * as runtime from 'react/jsx-runtime'

import { MDX_COMPONENTS } from './components'

/**
 * Erreur de compilation ou de rendu d'un corps MDX.
 *
 * Elle nomme le fichier, comme `ContentError` le fait pour le frontmatter. Ce
 * n'est pas la même classe : `src/ui` ne peut pas importer `src/content`
 * (`architecture.md` §1.2), et ces deux erreurs ne surviennent pas au même
 * moment de la chaîne.
 */
export class MdxRenderError extends Error {
  override readonly name = 'MdxRenderError'

  readonly file: string

  constructor(file: string, reason: string, options?: { cause?: unknown }) {
    super(`${file} — ${reason}`, options)
    this.file = file
  }
}

/**
 * Une liste blanche est une table nom → composant. Les propriétés sont typées
 * `Record<string, unknown>` : c'est exactement ce qu'on sait ici, puisque les
 * attributs sont choisis par le contenu MDX et non par ce module.
 */
export type MdxWhitelist = Readonly<Record<string, ComponentType<Record<string, unknown>>>>

export interface RenderMdxOptions {
  /** Le corps brut, tel que rendu par la couche Content. */
  readonly source: string
  /** Le fichier d'origine, pour que l'erreur soit exploitable. */
  readonly file: string
  /**
   * Liste blanche. Le défaut est la liste du projet ; l'injection existe pour
   * les tests, qui doivent pouvoir prouver qu'un composant hors liste est
   * refusé sans dépendre du contenu de la liste réelle.
   */
  readonly components?: MdxWhitelist
}

export async function renderMdx({
  source,
  file,
  components = MDX_COMPONENTS,
}: RenderMdxOptions): Promise<ReactElement> {
  const used = new Set<string>()

  let Compiled
  try {
    // `baseUrl` est exigé par `evaluate` pour résoudre d'éventuels imports. Nos
    // corps n'en contiennent pas — un `import` dans un contenu contournerait la
    // liste blanche —, mais l'option n'est pas facultative.
    ;({ default: Compiled } = await evaluate(
      { path: file, value: source },
      { ...runtime, baseUrl: import.meta.url, remarkPlugins: [collectComponentNames(used)] },
    ))
  } catch (cause) {
    throw new MdxRenderError(file, `corps MDX illisible — ${messageOf(cause)}`, { cause })
  }

  // Le contrôle a lieu **avant** le rendu, et c'est tout l'intérêt : laissé à
  // React, il surviendrait au milieu de la génération de la page, avec un
  // message qui nomme le composant mais pas le fichier.
  const forbidden = [...used].filter((name) => !(name in components))
  if (forbidden.length > 0) {
    throw new MdxRenderError(
      file,
      `utilise ${forbidden.map((name) => `« ${name} »`).join(', ')}, hors de la liste blanche des composants MDX (${Object.keys(components).join(', ') || 'aucun composant autorisé'})`,
    )
  }

  return <Compiled components={components} />
}

/**
 * Relève les composants appelés par le corps, avant compilation.
 *
 * Un nom de balise commençant par une majuscule est un composant ; en
 * minuscules, c'est un élément HTML, que MDX rend nativement et qui n'a rien à
 * faire dans une liste blanche.
 */
function collectComponentNames(into: Set<string>) {
  interface MdxNode {
    type?: string
    name?: string | null
    children?: MdxNode[]
  }

  const walk = (node: MdxNode): void => {
    if (
      (node.type === 'mdxJsxFlowElement' || node.type === 'mdxJsxTextElement') &&
      typeof node.name === 'string' &&
      /^[A-Z]/.test(node.name)
    ) {
      into.add(node.name)
    }
    for (const child of node.children ?? []) walk(child)
  }

  return () => walk
}

/**
 * Jumeau de `messageOf` de la couche Content, et non son import : `src/ui` ne
 * peut pas importer `src/content` (`architecture.md` §1.2). Deux lignes
 * dupliquées sont le prix du cloisonnement, et un prix qu'on préfère payer
 * plutôt que d'ouvrir une dépendance pour si peu.
 */
export function messageOf(cause: unknown): string {
  return cause instanceof Error ? cause.message : String(cause)
}
