/**
 * Fabriques de contenu pour les bancs de la carte mère (P8-14).
 *
 * ⛔ Un banc ne nomme jamais une entité de `content/` : les slugs sont inventés
 * (`skill-03`, `proj-a`…), et seules les **dimensions** du contenu réel sont
 * reproduites.
 */
import {
  type BoardContent,
  type BoardExperience,
  type BoardProject,
  type BoardSkill,
  SKILL_FAMILIES,
  type SkillFamily,
} from '@/scene/state/board/content'

export function makeBoardSkill(over: Partial<BoardSkill> = {}): BoardSkill {
  return { slug: 'skill-a', family: 'language', level: 3, ...over }
}

export function makeBoardExperience(over: Partial<BoardExperience> = {}): BoardExperience {
  return { slug: 'exp-a', startYear: 2021, endYear: null, ...over }
}

export function makeBoardProject(over: Partial<BoardProject> = {}): BoardProject {
  return {
    slug: 'proj-a',
    startedAt: '2022-01',
    technologies: [],
    primary: false,
    experience: null,
    ...over,
  }
}

/** Un petit contenu : 6 compétences sur 3 familles, 2 expériences, 2 projets. */
export function makeBoardContent(over: Partial<BoardContent> = {}): BoardContent {
  const skills: BoardSkill[] = [
    makeBoardSkill({ slug: 'skill-1', family: 'language', level: 5 }),
    makeBoardSkill({ slug: 'skill-2', family: 'language', level: 3 }),
    makeBoardSkill({ slug: 'skill-3', family: 'framework', level: 4 }),
    makeBoardSkill({ slug: 'skill-4', family: 'framework', level: 3 }),
    makeBoardSkill({ slug: 'skill-5', family: 'tooling', level: 4 }),
    makeBoardSkill({ slug: 'skill-6', family: 'tooling', level: 3 }),
  ]
  return {
    skills,
    experiences: [
      makeBoardExperience({ slug: 'exp-a', startYear: 2021 }),
      makeBoardExperience({ slug: 'exp-b', startYear: 2024, endYear: 2025 }),
    ],
    projects: [
      makeBoardProject({
        slug: 'proj-a',
        startedAt: '2022-03',
        technologies: ['skill-1', 'skill-3'],
        primary: true,
        experience: 'exp-a',
      }),
      makeBoardProject({
        slug: 'proj-b',
        startedAt: '2024-06',
        technologies: ['skill-2', 'skill-5'],
        experience: 'exp-b',
      }),
    ],
    ...over,
  }
}

/** `count` compétences réparties selon `counts` (une valeur par famille), niveaux 3 à 5. */
function skillsByFamily(counts: readonly number[]): BoardSkill[] {
  const out: BoardSkill[] = []
  SKILL_FAMILIES.forEach((family, f) => {
    for (let i = 0; i < (counts[f] ?? 0); i += 1) {
      out.push({
        slug: `${family}-${String(i + 1).padStart(2, '0')}`,
        family,
        level: (3 + ((out.length + i) % 3)) as 3 | 4 | 5,
      })
    }
  })
  return out
}

/**
 * Aux dimensions du contenu réel, slugs inventés : 40 compétences (familles
 * 2/13/3/11/11), 2 expériences en cours (2021, 2025), 3 projets dont un
 * principal, qui citent 31, 10 et 7 technologies parmi les 40.
 */
export function makeRealSizeBoard(): BoardContent {
  const skills = skillsByFamily([2, 13, 3, 11, 11])
  const slugs = skills.map((s) => s.slug)
  return {
    skills,
    experiences: [
      makeBoardExperience({ slug: 'exp-a', startYear: 2021 }),
      makeBoardExperience({ slug: 'exp-b', startYear: 2025 }),
    ],
    projects: [
      makeBoardProject({
        slug: 'proj-main',
        startedAt: '2025-02',
        technologies: slugs.slice(0, 31),
        primary: true,
        experience: 'exp-b',
      }),
      makeBoardProject({
        slug: 'proj-b',
        startedAt: '2023-05',
        technologies: slugs.slice(15, 25),
        experience: 'exp-a',
      }),
      makeBoardProject({ slug: 'proj-c', startedAt: '2021-09', technologies: slugs.slice(33, 40) }),
    ],
  }
}

/** 20 années, 20 projets, 80 compétences ; 3 voies simultanées au plus. */
export function makeLargeBoard(): BoardContent {
  const skills = skillsByFamily([8, 24, 8, 20, 20])
  const experiences: BoardExperience[] = Array.from({ length: 20 }, (_, i) =>
    makeBoardExperience({
      slug: `exp-${String(i + 1).padStart(2, '0')}`,
      startYear: 2006 + i,
      // Chaque expérience dure 3 ans : au plus 3 se chevauchent.
      endYear: 2008 + i,
    }),
  )
  const projects: BoardProject[] = Array.from({ length: 20 }, (_, i) =>
    makeBoardProject({
      slug: `proj-${String(i + 1).padStart(2, '0')}`,
      startedAt: `${2006 + i}-06`,
      technologies: [0, 1, 2, 3].map((k) => skills[(i * 4 + k) % skills.length]!.slug),
      primary: i === 19,
      experience: experiences[i]!.slug,
    }),
  )
  return { skills, experiences, projects }
}

/** Un seul projet qui cite 200 compétences d'une même famille. */
export function makeSaturatedBoard(family: SkillFamily = 'tooling'): BoardContent {
  const skills: BoardSkill[] = Array.from({ length: 200 }, (_, i) =>
    makeBoardSkill({ slug: `sat-${String(i + 1).padStart(3, '0')}`, family, level: 3 }),
  )
  return {
    skills,
    experiences: [],
    projects: [
      makeBoardProject({
        slug: 'proj-sat',
        primary: true,
        technologies: skills.map((s) => s.slug),
      }),
    ],
  }
}
