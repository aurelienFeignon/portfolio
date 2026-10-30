/**
 * L'extrait de contenu que lit la carte mère.
 *
 * ⭐ `scene/state` n'importe pas `content` (cloisonnement) : les types source de
 * `toBoardContent` sont **structurels**, `Skill`, `Experience` et `Project` du
 * dépôt y entrent tels quels. La conversion **copie champ par champ** — l'extrait
 * est ce qui sera sérialisé vers la scène différée (P8-15) ; un `title` ou un
 * `body` qui s'y glisserait alourdirait la charge utile.
 */

/**
 * ⚠️ Dupliqué de `skillFrontmatterSchema.shape.category` (même ordre) : le
 * cloisonnement interdit de l'importer ; un banc épingle l'égalité.
 */
export const SKILL_FAMILIES = [
  'language',
  'framework',
  'tooling',
  'infrastructure',
  'practice',
] as const
export type SkillFamily = (typeof SKILL_FAMILIES)[number]

export interface BoardSkill {
  readonly slug: string
  readonly family: SkillFamily
  readonly level: 1 | 2 | 3 | 4 | 5
}

export interface BoardExperience {
  readonly slug: string
  readonly startYear: number
  /** `null` : l'expérience est en cours. */
  readonly endYear: number | null
}

export interface BoardProject {
  readonly slug: string
  /** Date ISO à toute précision (`2025`, `2025-01`, `2025-01-02`). */
  readonly startedAt: string
  readonly technologies: readonly string[]
  readonly primary: boolean
  /** Slug de l'expérience de rattachement, `null` sinon. */
  readonly experience: string | null
}

export interface BoardContent {
  readonly skills: readonly BoardSkill[]
  readonly experiences: readonly BoardExperience[]
  readonly projects: readonly BoardProject[]
}

/**
 * L'ordre des slugs, par unités de code (jamais `localeCompare`, qui dépend de
 * l'environnement) : le seul comparateur de chaînes du plan de carte.
 */
export const compareSlugs = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0)

/** L'ordre des slugs d'entités (`compareSlugs` sur leur champ `slug`). */
export const bySlug = (a: { readonly slug: string }, b: { readonly slug: string }): number =>
  compareSlugs(a.slug, b.slug)

/**
 * Compare deux dates ISO **sur ce qu'elles affirment toutes les deux** : la
 * comparaison est tronquée à la précision commune, et deux valeurs qui ne
 * disent pas la même chose (`2024`, `2024-06`) sont **égales**.
 *
 * ⚠️ Recopié de `compareAtCommonPrecision` (`src/content/schemas/common.ts`) :
 * le cloisonnement interdit de l'importer, et la carte doit ordonner les
 * projets comme la couche Content les publie (`byMostRecent`).
 */
export function compareAtCommonPrecision(a: string, b: string): number {
  const common = Math.min(a.length, b.length)
  return compareSlugs(a.slice(0, common), b.slice(0, common))
}

/** L'année d'une date ISO, à toute précision. */
export const yearOf = (isoDate: string): number => Number.parseInt(isoDate.slice(0, 4), 10)

export function toBoardContent(source: {
  skills: readonly { slug: string; category: SkillFamily; level: 1 | 2 | 3 | 4 | 5 }[]
  experiences: readonly { slug: string; startedAt: string; endedAt?: string | undefined }[]
  projects: readonly {
    slug: string
    startedAt: string
    technologies: readonly string[]
    primary: boolean
    experience?: string | undefined
  }[]
}): BoardContent {
  return {
    skills: source.skills.map((s) => ({ slug: s.slug, family: s.category, level: s.level })),
    experiences: source.experiences.map((e) => ({
      slug: e.slug,
      startYear: yearOf(e.startedAt),
      endYear: e.endedAt === undefined ? null : yearOf(e.endedAt),
    })),
    projects: source.projects.map((p) => ({
      slug: p.slug,
      startedAt: p.startedAt,
      technologies: [...p.technologies],
      primary: p.primary,
      experience: p.experience ?? null,
    })),
  }
}
