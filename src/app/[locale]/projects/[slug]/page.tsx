/**
 * Détail d'un projet (P3-02, P3-07).
 *
 * C'est **cette route** que le critère de sortie de la phase vise :
 * `/fr/projects/augure` et `/en/projects/augure` doivent résoudre chacune leur
 * contenu, indépendamment, sans fuite de l'une vers l'autre.
 *
 * ⭐⭐ **C'est la première page du site à rendre un corps MDX** (P4-05), donc celle
 * qui fait entrer le compilateur dans l'image de production. Rien n'en part vers
 * le client : `renderMdx` s'exécute au build, et le budget de bundle le mesure.
 *
 * Le corps est rendu dans un conteneur `prose` — le seul endroit du dépôt où des
 * sélecteurs d'éléments sont légitimes, puisque le balisage vient du contenu et
 * ne peut porter aucune classe (ADR-0010, règle 1 : l'exception est bornée à ce
 * conteneur).
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
import { Prose } from '@/ui/mdx/prose'
import page from '@/ui/page.module.css'
import { TechnologySection } from '@/ui/technology-section'

import { languageOptions } from '../../language-options'
import { readEntityParams, staticSlugParams, type EntityParams } from '../../locale-param'
import { entityMetadata } from '../../page-metadata'

import styles from './page.module.css'

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
  const [available, technologies] = await Promise.all([
    contentRepository.getContentLocales('projects', slug),
    contentRepository.getTechnologyLabels(locale, project),
  ])

  return (
    <main id="main" className={page.page}>
      <h1 className={page.title}>{project.title}</h1>
      <p className={styles.summary}>{project.summary}</p>
      <DateRange locale={locale} startedAt={project.startedAt} endedAt={project.endedAt} />

      <Prose source={project.body} file={project.file} />

      <TechnologySection locale={locale} labels={technologies} />

      <LanguageSwitcher current={locale} options={languageOptions(locationOf(slug), available)} />
    </main>
  )
}
