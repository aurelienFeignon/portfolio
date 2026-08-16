/**
 * Détail d'un projet (P3-02, P3-07).
 *
 * C'est **cette route** que le critère de sortie de la phase vise :
 * `/fr/projects/augure` et `/en/projects/augure` doivent résoudre chacune leur
 * contenu, indépendamment, sans fuite de l'une vers l'autre.
 *
 * Le **corps MDX n'est pas rendu ici** : il arrive en P4-05, avec l'ADR-0010 qui
 * décide comment ses composants sont mis en forme. C'est aussi ce qui explique
 * que l'image de production reste à 385 Mo — le runtime MDX n'y entrera qu'avec
 * la première page qui compile un corps (`phase-2-log.md` §13.3).
 *
 * Pas de `dynamicParams = false` ici : la valeur est **héritée** du segment
 * parent, et une sonde a montré que la redéclarer ne change rien (voir
 * `phase-3-log.md` §10.2). Ce qui protège réellement cette route est le gate
 * `scripts/check-static-rendering.mts`.
 */
import { notFound } from 'next/navigation'

import { contentRepository } from '@/content/repository'
import { getMessages } from '@/i18n/messages'
import type { PageLocation } from '@/routing/paths'
import { DateRange } from '@/ui/date-range'
import { LanguageSwitcher } from '@/ui/language-switcher'

import { languageOptions } from '../../language-options'
import { readEntityParams, staticSlugParams, type EntityParams } from '../../locale-param'
import { entityMetadata } from '../../page-metadata'

export function generateStaticParams({ params }: { params: { locale: string } }) {
  return staticSlugParams(params, (locale) => contentRepository.getAllProjects(locale))
}

function locationOf(slug: string): PageLocation {
  return { kind: 'entity', section: 'projects', slug }
}

export async function generateMetadata({ params }: EntityParams) {
  const { locale, slug } = await readEntityParams(params)
  const project = await contentRepository.getProjectBySlug(locale, slug)

  // Le rendu appellera `notFound()` : inutile de dupliquer la décision ici, et
  // surtout pas de fabriquer des métadonnées pour une page qui n'existe pas.
  if (project === null) return {}

  return entityMetadata(contentRepository, {
    locale,
    section: 'projects',
    slug,
    title: project.title,
    description: project.summary,
  })
}

export default async function ProjectPage({ params }: EntityParams) {
  const { locale, slug } = await readEntityParams(params)
  const project = await contentRepository.getProjectBySlug(locale, slug)

  // Un slug inconnu est une route inconnue, pas une erreur (`architecture.md` §10).
  if (project === null) notFound()

  const messages = getMessages(locale)
  const available = await contentRepository.getContentLocales('projects', slug)

  return (
    <main id="main">
      <h1>{project.title}</h1>
      <p>{project.summary}</p>
      <LanguageSwitcher current={locale} options={languageOptions(locationOf(slug), available)} />
      <DateRange locale={locale} startedAt={project.startedAt} endedAt={project.endedAt} />
      <h2>{messages.sections.skills.name}</h2>
      <ul>
        {project.technologies.map((technology) => (
          <li key={technology}>{technology}</li>
        ))}
      </ul>
    </main>
  )
}
