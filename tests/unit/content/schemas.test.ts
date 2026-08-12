/**
 * P2-02 — les schémas Zod du contenu.
 *
 * Chaque cas invalide vérifie **deux choses** : que la validation échoue, et
 * qu'elle désigne le bon champ. Un rejet dont on ne sait pas d'où il vient
 * n'aide pas l'auteur à corriger son fichier (CF-10).
 */
import { describe, expect, it } from 'vitest'

import { experienceFrontmatterSchema } from '@/content/schemas/experience'
import { projectFrontmatterSchema } from '@/content/schemas/project'
import { skillFrontmatterSchema } from '@/content/schemas/skill'
import { CONTENT_TYPES, FRONTMATTER_SCHEMAS, isContentType } from '@/content/content-type'
import {
  makeExperienceFrontmatter,
  makeProjectFrontmatter,
  makeSkillFrontmatter,
} from '../../fixtures/builders/frontmatter'

/** Chemins des erreurs, en notation pointée, pour asserter sans dépendre de l'ordre. */
function failurePaths(result: { success: boolean; error?: { issues: { path: PropertyKey[] }[] } }) {
  return (result.error?.issues ?? []).map((issue) => issue.path.join('.'))
}

describe('schéma de projet', () => {
  it('accepte un frontmatter complet et valide', () => {
    const result = projectFrontmatterSchema.safeParse(
      makeProjectFrontmatter({
        links: { repository: 'https://github.com/aurelienFeignon/augure' },
        cover: { src: '/images/augure.webp', alt: 'Capture d’écran', width: 1200, height: 630 },
      }),
    )

    expect(result.success).toBe(true)
  })

  it('considère un projet non marqué comme non mis en avant', () => {
    const frontmatter = makeProjectFrontmatter()
    delete frontmatter['featured']

    const result = projectFrontmatterSchema.parse(frontmatter)

    expect(result.featured).toBe(false)
  })

  it('accepte un projet toujours en cours, sans date de fin', () => {
    const frontmatter = makeProjectFrontmatter()
    delete frontmatter['endedAt']

    expect(projectFrontmatterSchema.safeParse(frontmatter).success).toBe(true)
  })

  it.each(['slug', 'title', 'summary', 'type', 'technologies', 'startedAt'])(
    'rejette un projet dont le champ « %s » est absent',
    (field) => {
      const frontmatter = makeProjectFrontmatter()
      delete frontmatter[field]

      const result = projectFrontmatterSchema.safeParse(frontmatter)

      expect(result.success).toBe(false)
      expect(failurePaths(result)).toContain(field)
    },
  )

  it('rejette une clé inconnue plutôt que de l’ignorer', () => {
    const result = projectFrontmatterSchema.safeParse(makeProjectFrontmatter({ feature: true }))

    expect(result.success).toBe(false)
    expect(JSON.stringify(result.error?.issues)).toContain('feature')
  })

  it('rejette un type de projet hors du domaine', () => {
    const result = projectFrontmatterSchema.safeParse(makeProjectFrontmatter({ type: 'client' }))

    expect(failurePaths(result)).toContain('type')
  })

  it.each([
    ['une majuscule', 'Augure'],
    ['un espace', 'mon projet'],
    ['un accent', 'créé'],
    ['un tiret de tête', '-augure'],
    ['deux tirets consécutifs', 'mon--projet'],
    ['une chaîne vide', ''],
  ])('rejette un slug contenant %s', (_label, slug) => {
    expect(
      failurePaths(projectFrontmatterSchema.safeParse(makeProjectFrontmatter({ slug }))),
    ).toContain('slug')
  })

  it.each([
    ['un mois seul', '2024-01'],
    ['un format francisé', '15/01/2024'],
    ['un jour qui n’existe pas', '2024-02-30'],
    ['un horodatage complet', '2024-01-15T10:00:00Z'],
  ])('rejette une date de début exprimée avec %s', (_label, startedAt) => {
    expect(
      failurePaths(projectFrontmatterSchema.safeParse(makeProjectFrontmatter({ startedAt }))),
    ).toContain('startedAt')
  })

  it('rejette une date de fin antérieure à la date de début', () => {
    const result = projectFrontmatterSchema.safeParse(
      makeProjectFrontmatter({ startedAt: '2025-01-01', endedAt: '2024-01-01' }),
    )

    expect(failurePaths(result)).toContain('endedAt')
  })

  it('accepte une période commencée et terminée le même jour', () => {
    const result = projectFrontmatterSchema.safeParse(
      makeProjectFrontmatter({ startedAt: '2024-01-15', endedAt: '2024-01-15' }),
    )

    expect(result.success).toBe(true)
  })

  it('rejette un projet sans aucune technologie', () => {
    expect(
      failurePaths(
        projectFrontmatterSchema.safeParse(makeProjectFrontmatter({ technologies: [] })),
      ),
    ).toContain('technologies')
  })

  it('rejette une technologie citée deux fois', () => {
    const result = projectFrontmatterSchema.safeParse(
      makeProjectFrontmatter({ technologies: ['typescript', 'typescript'] }),
    )

    expect(failurePaths(result)).toContain('technologies')
  })

  it('rejette un résumé trop court pour servir de description', () => {
    expect(
      failurePaths(
        projectFrontmatterSchema.safeParse(makeProjectFrontmatter({ summary: 'Court.' })),
      ),
    ).toContain('summary')
  })

  it('rejette un résumé au-delà de 300 caractères', () => {
    const result = projectFrontmatterSchema.safeParse(
      makeProjectFrontmatter({ summary: 'x'.repeat(301) }),
    )

    expect(failurePaths(result)).toContain('summary')
  })

  it('rejette un lien de dépôt qui n’est pas une URL absolue', () => {
    const result = projectFrontmatterSchema.safeParse(
      makeProjectFrontmatter({ links: { repository: '/github' } }),
    )

    expect(failurePaths(result)).toContain('links.repository')
  })

  it('rejette une couverture dont les dimensions manquent', () => {
    const result = projectFrontmatterSchema.safeParse(
      makeProjectFrontmatter({ cover: { src: '/a.webp', alt: 'Une capture' } }),
    )

    expect(failurePaths(result)).toEqual(expect.arrayContaining(['cover.width', 'cover.height']))
  })

  it('rejette une couverture dont le chemin n’est pas absolu', () => {
    const result = projectFrontmatterSchema.safeParse(
      makeProjectFrontmatter({
        cover: { src: 'images/a.webp', alt: 'Une capture', width: 10, height: 10 },
      }),
    )

    expect(failurePaths(result)).toContain('cover.src')
  })

  it('rejette une image de couverture sans texte alternatif', () => {
    const result = projectFrontmatterSchema.safeParse(
      makeProjectFrontmatter({
        cover: { src: '/a.webp', alt: '   ', width: 10, height: 10 },
      }),
    )

    expect(failurePaths(result)).toContain('cover.alt')
  })
})

describe('schéma d’expérience', () => {
  it('accepte un frontmatter complet et valide', () => {
    expect(experienceFrontmatterSchema.safeParse(makeExperienceFrontmatter()).success).toBe(true)
  })

  it('accepte un poste en cours, sans date de fin', () => {
    const frontmatter = makeExperienceFrontmatter()
    delete frontmatter['endedAt']

    expect(experienceFrontmatterSchema.safeParse(frontmatter).success).toBe(true)
  })

  it('accepte une expérience sans localisation', () => {
    const frontmatter = makeExperienceFrontmatter()
    delete frontmatter['location']

    expect(experienceFrontmatterSchema.safeParse(frontmatter).success).toBe(true)
  })

  it.each(['slug', 'company', 'role', 'startedAt', 'technologies', 'highlights'])(
    'rejette une expérience dont le champ « %s » est absent',
    (field) => {
      const frontmatter = makeExperienceFrontmatter()
      delete frontmatter[field]

      expect(failurePaths(experienceFrontmatterSchema.safeParse(frontmatter))).toContain(field)
    },
  )

  it('rejette une expérience sans aucune réalisation citée', () => {
    const result = experienceFrontmatterSchema.safeParse(
      makeExperienceFrontmatter({ highlights: [] }),
    )

    expect(failurePaths(result)).toContain('highlights')
  })

  it('rejette une réalisation vide au milieu de la liste', () => {
    const result = experienceFrontmatterSchema.safeParse(
      makeExperienceFrontmatter({ highlights: ['Une vraie réalisation', '  '] }),
    )

    expect(failurePaths(result)).toContain('highlights.1')
  })

  it('rejette une date de fin antérieure à la date de début', () => {
    const result = experienceFrontmatterSchema.safeParse(
      makeExperienceFrontmatter({ startedAt: '2022-03-01', endedAt: '2021-01-01' }),
    )

    expect(failurePaths(result)).toContain('endedAt')
  })
})

describe('schéma de compétence', () => {
  it('accepte un frontmatter complet et valide', () => {
    expect(skillFrontmatterSchema.safeParse(makeSkillFrontmatter()).success).toBe(true)
  })

  it.each([1, 2, 3, 4, 5])('accepte le niveau %i', (level) => {
    expect(skillFrontmatterSchema.safeParse(makeSkillFrontmatter({ level })).success).toBe(true)
  })

  it.each([0, 6, 2.5, '3', null])('rejette le niveau %s', (level) => {
    expect(
      failurePaths(skillFrontmatterSchema.safeParse(makeSkillFrontmatter({ level }))),
    ).toContain('level')
  })

  it.each(['language', 'framework', 'tooling', 'infrastructure', 'practice'])(
    'accepte la catégorie « %s »',
    (category) => {
      expect(skillFrontmatterSchema.safeParse(makeSkillFrontmatter({ category })).success).toBe(
        true,
      )
    },
  )

  it('rejette une catégorie hors du domaine', () => {
    expect(
      failurePaths(
        skillFrontmatterSchema.safeParse(makeSkillFrontmatter({ category: 'soft-skill' })),
      ),
    ).toContain('category')
  })

  it('considère une compétence non marquée comme non mise en avant', () => {
    const frontmatter = makeSkillFrontmatter()
    delete frontmatter['featured']

    expect(skillFrontmatterSchema.parse(frontmatter).featured).toBe(false)
  })
})

describe('types de contenu', () => {
  it('associe un schéma à chacun des trois types', () => {
    expect(Object.keys(FRONTMATTER_SCHEMAS).sort()).toEqual([...CONTENT_TYPES].sort())
  })

  it('reconnaît les types de contenu et rejette les autres', () => {
    expect(isContentType('projects')).toBe(true)
    expect(isContentType('articles')).toBe(false)
  })
})
