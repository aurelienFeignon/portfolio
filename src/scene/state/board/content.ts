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
