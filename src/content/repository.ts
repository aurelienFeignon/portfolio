/**
 * L'API de lecture du contenu (P2-05) — `architecture.md` §3.3.
 *
 * C'est la seule surface que connaissent les couches au-dessus. Elles ne voient
 * ni chemin, ni frontmatter, ni schéma : uniquement des entités typées.
 *
 * Comme la source et le chargeur, le dépôt est une **fabrique**. Le
 * `contentRepository` exporté en bas de fichier est l'instance de l'application ;
 * les tests construisent la leur sur des fixtures, et ne lisent jamais le contenu
 * réel.
 */
import type { Locale } from '../i18n/locales.ts'
import { LOCALES } from '../i18n/locales.ts'

import type { ContentType } from './content-type.ts'
import { createContentLoader, type ContentLoader } from './loader.ts'
import { byMostRecent, bySkillOrder, sorted, withOngoing } from './normalise.ts'
import { createContentSource, defaultContentRoot } from './source.ts'
import type { Experience, Project, Skill } from './types.ts'

export interface ContentRepository {
  /** Du plus récent au plus ancien, un projet en cours en tête. */
  getAllProjects(locale: Locale): Promise<readonly Project[]>
  getProjectBySlug(locale: Locale, slug: string): Promise<Project | null>
  getFeaturedProjects(locale: Locale): Promise<readonly Project[]>

  /** Même ordre que les projets : c'est l'ordre attendu d'un CV. */
  getAllExperiences(locale: Locale): Promise<readonly Experience[]>
  getExperienceBySlug(locale: Locale, slug: string): Promise<Experience | null>

  /** Par catégorie, puis niveau décroissant, puis nom selon la locale. */
  getAllSkills(locale: Locale): Promise<readonly Skill[]>
  getSkillBySlug(locale: Locale, slug: string): Promise<Skill | null>
  getFeaturedSkills(locale: Locale): Promise<readonly Skill[]>

  /**
   * Les locales où cette entité **existe réellement**.
   *
   * C'est ce qui permet de n'émettre un `hreflang` que vers des pages qui
   * existent (risque R-07) : un lien alternatif vers une traduction absente est
   * une promesse fausse faite à un moteur de recherche.
   */
  getContentLocales(type: ContentType, slug: string): Promise<readonly Locale[]>
}

export function createContentRepository(loader: ContentLoader): ContentRepository {
  async function bySlug<T extends { slug: string }>(
    entries: Promise<readonly T[]>,
    slug: string,
  ): Promise<T | null> {
    // `null` et non une exception : un slug inconnu est une **route** inconnue,
    // que l'appelant traduit en 404 localisée (`architecture.md` §10). Un
    // contenu présent mais invalide, lui, lève toujours.
    return (await entries).find((entry) => entry.slug === slug) ?? null
  }

  /**
   * Les normalisations sont appliquées **ici**, une fois, pour tout le monde
   * (P2-06). Une vue qui trierait elle-même finirait par trier autrement qu'une
   * autre, et le sitemap autrement que les deux.
   */
  async function projects(locale: Locale): Promise<readonly Project[]> {
    const entries = await loader.load(locale, 'projects')
    return sorted(entries.map(withOngoing), byMostRecent)
  }

  async function experiences(locale: Locale): Promise<readonly Experience[]> {
    const entries = await loader.load(locale, 'experiences')
    return sorted(entries.map(withOngoing), byMostRecent)
  }

  async function skills(locale: Locale): Promise<readonly Skill[]> {
    return sorted(await loader.load(locale, 'skills'), bySkillOrder(locale))
  }

  return {
    getAllProjects: projects,
    getProjectBySlug: (locale, slug) => bySlug(projects(locale), slug),
    getFeaturedProjects: async (locale) =>
      (await projects(locale)).filter((project) => project.featured),

    getAllExperiences: experiences,
    getExperienceBySlug: (locale, slug) => bySlug(experiences(locale), slug),

    getAllSkills: skills,
    getSkillBySlug: (locale, slug) => bySlug(skills(locale), slug),
    getFeaturedSkills: async (locale) => (await skills(locale)).filter((skill) => skill.featured),

    async getContentLocales(type, slug) {
      const found = await Promise.all(
        LOCALES.map(async (locale) => {
          const entries = await loader.load(locale, type)
          return entries.some((entry) => entry.slug === slug) ? locale : null
        }),
      )
      // L'ordre est celui de `LOCALES`, donc stable : un sitemap ou une balise
      // `hreflang` ne doit pas changer d'ordre d'un build à l'autre.
      return found.filter((locale): locale is Locale => locale !== null)
    },
  }
}

/**
 * L'instance de l'application, sur `content/` à la racine du dépôt. Sa
 * construction ne lit rien : la première lecture a lieu au premier appel.
 *
 * C'est **ici**, à la composition, que se décide la mémoïsation — la couche
 * Content, elle, ne consulte jamais l'environnement. En développement, elle est
 * désactivée pour qu'une édition de contenu se voie au rafraîchissement suivant.
 */
export const contentRepository: ContentRepository = createContentRepository(
  createContentLoader(
    createContentSource(defaultContentRoot(), {
      memoise: process.env['NODE_ENV'] !== 'development',
    }),
  ),
)
