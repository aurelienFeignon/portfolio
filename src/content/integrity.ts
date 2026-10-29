/**
 * Cohérence référentielle `technologies` ↔ `Skill.slug` (P2-07).
 *
 * Le typage ne peut rien ici : `technologies: string[]` est satisfait par
 * `["typscript"]`. C'est le cas d'école où un schéma valide un fichier isolé,
 * alors que la faute n'existe qu'entre deux fichiers.
 *
 * Conséquence concrète d'une référence morte : une page de projet cite une
 * compétence dont la page n'existe pas — lien mort, filtre par technologie qui
 * ne rend rien, et une incohérence visible par un recruteur avant de l'être par
 * moi.
 */

export interface TechnologyReference {
  /** Chemin du fichier fautif : c'est lui qui sera cité dans l'erreur. */
  readonly file: string
  readonly technologies: readonly string[]
}

export interface UnknownTechnologies {
  readonly file: string
  readonly unknown: readonly string[]
}

/**
 * Fonction pure : elle ne lit rien et ne connaît ni locale ni système de
 * fichiers. L'appelant lui donne les références d'un côté, les compétences
 * existantes de l'autre.
 *
 * Elle rend **toutes** les références mortes, pas la première : corriger un
 * fichier, relancer, découvrir le suivant est une façon lente d'échouer.
 */
export function findUnknownTechnologies(
  references: readonly TechnologyReference[],
  knownSkillSlugs: ReadonlySet<string>,
): readonly UnknownTechnologies[] {
  return references
    .map((reference) => ({
      file: reference.file,
      unknown: reference.technologies.filter((slug) => !knownSkillSlugs.has(slug)),
    }))
    .filter((problem) => problem.unknown.length > 0)
}

/** Message destiné à l'auteur du contenu, dans la sortie d'un build rouge. */
export function describeUnknownTechnologies(problem: UnknownTechnologies): string {
  const list = problem.unknown.map((slug) => `« ${slug} »`).join(', ')
  return `cite ${problem.unknown.length > 1 ? 'des technologies inconnues' : 'une technologie inconnue'} des compétences de cette locale : ${list}`
}

/**
 * Cohérence référentielle `experience` ↔ `Experience.slug` — la carte mère
 * (`docs/carte-mere.md` §6).
 *
 * Même faute que pour les technologies : `experience: evae` passe le schéma,
 * et le projet se brancherait sur un tronçon du bus qui n'existe pas.
 */
export interface ExperienceReference {
  readonly file: string
  readonly experience: string
}

export type UnknownExperience = ExperienceReference

/** Pure, et rend **toutes** les références mortes, comme `findUnknownTechnologies`. */
export function findUnknownExperiences(
  references: readonly ExperienceReference[],
  knownExperienceSlugs: ReadonlySet<string>,
): readonly UnknownExperience[] {
  return references.filter((reference) => !knownExperienceSlugs.has(reference.experience))
}

export function describeUnknownExperience(problem: UnknownExperience): string {
  return `se rattache à une expérience inconnue de cette locale : « ${problem.experience} »`
}

/**
 * Le processeur central n'a qu'une place : deux projets `primary` dans une même
 * locale sont une erreur de contenu, pas un choix à arbitrer en silence.
 *
 * Rend `null` pour zéro ou un fichier — zéro est permis, la carte place alors le
 * plus récent au centre —, sinon un message qui nomme **tous** les fichiers.
 */
export function findPrimaryConflict(primaryFiles: readonly string[]): string | null {
  if (primaryFiles.length < 2) return null
  const list = primaryFiles.map((file) => `« ${file} »`).join(', ')
  return `${primaryFiles.length} projets se déclarent principaux (\`primary: true\`), un seul est permis par locale : ${list}`
}

/**
 * Le processeur central d'une locale à l'autre. Une personne qui change de
 * langue attend **la même carte** : un projet principal dans une locale qui
 * existe aussi, non principal, dans une autre est une divergence.
 *
 * Compatible avec R-07 (`tree.ts`) : une locale peut ne pas traduire une fiche,
 * et un principal **absent** de l'autre locale n'est pas jugé.
 */
export interface LocalePrimary {
  readonly locale: string
  /** Le slug du projet principal, `null` s'il n'y en a pas exactement un. */
  readonly primary: string | null
  readonly projectSlugs: ReadonlySet<string>
}

export interface PrimaryDivergence {
  /** La locale où la fiche existe sans être principale : c'est elle qu'on corrige. */
  readonly locale: string
  readonly message: string
}

export function findPrimaryDivergence(
  locales: readonly LocalePrimary[],
): readonly PrimaryDivergence[] {
  return locales.flatMap((source) =>
    source.primary === null
      ? []
      : locales
          .filter(
            (other) =>
              other !== source &&
              other.projectSlugs.has(source.primary as string) &&
              other.primary !== source.primary,
          )
          .map((other) => ({
            locale: other.locale,
            message: `« ${source.primary} » est principal en ${source.locale} mais pas en ${other.locale} : la carte aurait un autre centre selon la langue`,
          })),
  )
}
