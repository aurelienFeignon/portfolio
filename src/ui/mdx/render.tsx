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
import { describeIfForbidden, describeUnreadableBody, mdxOptions } from './inspect'

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
      { ...runtime, baseUrl: import.meta.url, ...mdxOptions(used) },
    ))
  } catch (cause) {
    throw new MdxRenderError(file, describeUnreadableBody(cause), { cause })
  }

  // Le contrôle a lieu **avant** le rendu, et c'est tout l'intérêt : laissé à
  // React, il surviendrait au milieu de la génération de la page, avec un
  // message qui nomme le composant mais pas le fichier.
  const refusal = describeIfForbidden(used, Object.keys(components))
  if (refusal !== null) throw new MdxRenderError(file, refusal)

  return <Compiled components={components} />
}
