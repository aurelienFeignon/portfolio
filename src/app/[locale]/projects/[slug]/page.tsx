/**
 * Détail d'un projet (P3-02, P3-07).
 *
 * C'est **cette route** que le critère de sortie de la phase vise :
 * `/fr/projects/augure` et `/en/projects/augure` doivent résoudre chacune leur
 * contenu, indépendamment, sans fuite de l'une vers l'autre.
 *
 * Le **corps MDX n'est pas rendu ici** : il arrive en P4-05, avec l'ADR-0010 qui
 * décide comment ses composants sont mis en forme. C'est aussi ce qui explique
 * que l'image de production reste à 381 Mo — le runtime MDX n'y entrera qu'avec
 * la première page qui compile un corps (`phase-2-log.md` §13.3).
 */
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { contentRepository } from '@/content/repository'
import { isLocale } from '@/i18n/locales'
import { getMessages } from '@/i18n/messages'
import type { PageLocation } from '@/routing/paths'
import { pageMetadata } from '@/seo/metadata'
import { DateRange } from '@/ui/date-range'
import { LanguageSwitcher } from '@/ui/language-switcher'

import { languageOptions } from '../../language-options'
import { readLocale } from '../../locale-param'

export const dynamicParams = false

/**
 * Les slugs à prégénérer pour la locale que le segment parent a énumérée.
 *
 * Le paramètre est typé `string` et non `Locale` : c'est la signature que le
 * validateur de routes de Next impose, et la refuser fait échouer le build (vu
 * échouer à l'écriture). La garde qui suit n'est donc pas décorative — elle est
 * la seule chose qui rende ce `string` utilisable.
 */
export async function generateStaticParams({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) return []
  const projects = await contentRepository.getAllProjects(params.locale)
  return projects.map((project) => ({ slug: project.slug }))
}

type Params = { readonly params: Promise<{ locale: string; slug: string }> }

function locationOf(slug: string): PageLocation {
  return { kind: 'entity', section: 'projects', slug }
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const locale = await readLocale(params)
  const { slug } = await params
  const project = await contentRepository.getProjectBySlug(locale, slug)

  // Le rendu appellera `notFound()` : inutile de dupliquer la décision ici, et
  // surtout pas de fabriquer des métadonnées pour une page qui n'existe pas.
  if (project === null) return {}

  return pageMetadata({
    locale,
    location: locationOf(slug),
    title: project.title,
    description: project.summary,
    // La liste des locales où l'entité existe **réellement** : c'est ce qui
    // interdit un `hreflang` vers une traduction absente (R-07).
    availableLocales: await contentRepository.getContentLocales('projects', slug),
  })
}

export default async function ProjectPage({ params }: Params) {
  const locale = await readLocale(params)
  const { slug } = await params
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
      <DateRange
        locale={locale}
        startedAt={project.startedAt}
        endedAt={project.endedAt}
        isOngoing={project.isOngoing}
      />
      <h2>{messages.sections.skills.name}</h2>
      <ul>
        {project.technologies.map((technology) => (
          <li key={technology}>{technology}</li>
        ))}
      </ul>
    </main>
  )
}
