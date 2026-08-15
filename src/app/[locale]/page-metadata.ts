/**
 * Composition des métadonnées d'une page (P3-06, P3-07).
 *
 * **Pourquoi ces deux fonctions existent.** Les trois pages de section
 * écrivaient chacune six lignes identiques, et y répétaient le nom de la
 * section **deux fois** sans que rien ne relie les deux : mettre `projects` dans
 * l'emplacement et lire `skills` dans les messages compilait, passait les tests
 * et n'était attrapé par aucun E2E. Dériver les deux d'un seul argument ferme
 * cette classe d'erreur au lieu de compter dessus.
 *
 * Les pages de détail, elles, portaient la seule décision que les routes
 * n'avaient pas encore laissée derrière elles : passer `getContentLocales` à
 * `pageMetadata`. C'est **la** décision dont R-07 dépend, et elle vivait dans un
 * fichier exclu de la couverture — le test d'intégration du critère de sortie en
 * était réduit à la réécrire pour la vérifier. Elle est ici, et il l'appelle.
 */
import type { Metadata } from 'next'

import type { ContentRepository } from '@/content/repository'
import { LOCALES, type Locale } from '@/i18n/locales'
import { getMessages } from '@/i18n/messages'
import { pageMetadata } from '@/seo/metadata'
import type { Section } from '@/routing/sections'

import { readLocale, type LocaleParams } from './locale-param'

/**
 * Fabrique le `generateMetadata` d'une page de section.
 *
 * `LOCALES` est passé explicitement : une section existe dans toutes les langues,
 * même vide (R-07). Le dire plutôt que de compter sur un défaut est ce qui rend
 * l'oubli impossible sur une page de détail, où la réponse est différente.
 */
export function sectionMetadata(section: Section) {
  return async ({ params }: LocaleParams): Promise<Metadata> => {
    const locale = await readLocale(params)
    const { name, description } = getMessages(locale).sections[section]

    return pageMetadata({
      locale,
      location: { kind: 'section', section },
      title: name,
      description,
      availableLocales: LOCALES,
    })
  }
}

/**
 * Métadonnées d'une page de détail.
 *
 * Le dépôt est un **paramètre** : c'est ce qui permet de vérifier sur fixtures
 * que les locales annoncées sont bien celles où l'entité existe, sans lire
 * `content/` (P2-09).
 */
export async function entityMetadata(
  repository: ContentRepository,
  entity: {
    readonly locale: Locale
    readonly section: Section
    readonly slug: string
    readonly title: string
    readonly description: string
  },
): Promise<Metadata> {
  const { locale, section, slug, title, description } = entity

  return pageMetadata({
    locale,
    location: { kind: 'entity', section, slug },
    title,
    description,
    // La liste des locales où l'entité existe **réellement** : c'est ce qui
    // interdit un `hreflang` vers une traduction absente (R-07).
    availableLocales: await repository.getContentLocales(section, slug),
  })
}
