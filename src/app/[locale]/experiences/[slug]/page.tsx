/**
 * Détail d'une expérience (P3-02, P3-07 ; mise en forme P4-04).
 *
 * Le corps MDX n'est **pas** rendu ici : P4-05 est la première page à le faire,
 * traitée seule parce qu'elle fait entrer ~7 Mo de runtime dans une image qui
 * n'a que 15 Mo de marge. Cette page-ci reste sur le frontmatter, et c'est un
 * choix d'ordonnancement, pas un oubli (`phase-4-log.md` §5).
 *
 * `getContentLocales` gouverne le `hreflang` (R-07) : une expérience non
 * traduite n'est ni annoncée ni listée, mais le sélecteur de langue propose
 * toujours une cible atteignable.
 */
import { notFound } from 'next/navigation'

import { contentRepository } from '@/content/repository'
import { getMessages } from '@/i18n/messages'
import type { PageLocation } from '@/routing/paths'
import { CompanyLine } from '@/ui/company-line'
import { DateRange } from '@/ui/date-range'
import { JsonLd } from '@/ui/json-ld'
import { LanguageSwitcher } from '@/ui/language-switcher'
import { TechnologySection } from '@/ui/technology-section'

import { languageOptions } from '../../language-options'
import { readEntityParams, staticSlugParams, type EntityParams } from '../../locale-param'
import { entityMetadata } from '../../page-metadata'
import { breadcrumbStructuredData } from '../../structured-data'

import page from '@/ui/page.module.css'

import styles from './page.module.css'

export function generateStaticParams({ params }: { params: { locale: string } }) {
  return staticSlugParams(params, (locale) => contentRepository.getAllExperiences(locale))
}

function locationOf(slug: string): PageLocation {
  return { kind: 'entity', section: 'experiences', slug }
}

export async function generateMetadata({ params }: EntityParams) {
  const { locale, slug } = await readEntityParams(params)
  const experience = await contentRepository.getExperienceBySlug(locale, slug)

  if (experience === null) return {}

  return entityMetadata(contentRepository, {
    locale,
    section: 'experiences',
    slug,
    title: `${experience.role} — ${experience.company}`,
    // Une expérience n'a pas de `summary` : la première réalisation en tient
    // lieu, plutôt qu'une description fabriquée à partir des champs.
    description: experience.highlights[0] ?? experience.company,
  })
}

export default async function ExperiencePage({ params }: EntityParams) {
  const { locale, slug } = await readEntityParams(params)
  const experience = await contentRepository.getExperienceBySlug(locale, slug)

  if (experience === null) notFound()

  const [available, technologies] = await Promise.all([
    contentRepository.getContentLocales('experiences', slug),
    contentRepository.getTechnologyLabels(locale, experience),
  ])
  const messages = getMessages(locale)

  return (
    <main id="main" className={page.page}>
      {/* Le fil d'Ariane seul (P4-09) : il n'existe pas de type schema.org
          honnête pour « un poste occupé ». Le nom du dernier niveau est le `h1`
          ci-dessous — la page ne peut pas s'intituler autrement qu'elle ne se
          nomme dans son propre fil. */}
      <JsonLd
        data={breadcrumbStructuredData(locale, 'experiences', { slug, name: experience.role })}
      />
      <h1 className={page.title}>{experience.role}</h1>
      <CompanyLine
        company={experience.company}
        location={experience.location}
        className={styles.where}
      />
      <DateRange locale={locale} startedAt={experience.startedAt} endedAt={experience.endedAt} />

      {/* `aria-labelledby` rattache chaque liste à son titre : un lecteur
          d'écran qui parcourt les listes annonce alors « Réalisations, liste de
          4 éléments » au lieu d'une liste anonyme. C'est aussi ce qui rend les
          deux listes **désignables** par un test — sans nom, la seule prise est
          leur position, qui a déjà fait passer un garde sur la mauvaise. */}
      <h2 className={styles.heading} id="highlights">
        {messages.experience.highlights}
      </h2>
      <ul className={styles.highlights} aria-labelledby="highlights">
        {experience.highlights.map((highlight) => (
          <li key={highlight}>{highlight}</li>
        ))}
      </ul>

      <TechnologySection locale={locale} labels={technologies} />

      <LanguageSwitcher current={locale} options={languageOptions(locationOf(slug), available)} />
    </main>
  )
}
