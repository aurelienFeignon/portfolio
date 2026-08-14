/**
 * Fabriques de frontmatter pour les tests (P2-09).
 *
 * Elles produisent un objet **valide** par défaut ; un test ne décrit alors que
 * ce qu'il fait varier, et l'intention se lit sans deviner quel champ compte.
 *
 * Le type de retour est volontairement `Record<string, unknown>` : ces objets
 * représentent du YAML lu sur disque, c'est-à-dire de l'inconnu. Les typer avec
 * les types dérivés des schémas interdirait d'écrire les cas invalides, qui sont
 * la moitié de l'intérêt de ces tests.
 */
type Overrides = Record<string, unknown>

export function makeProjectFrontmatter(overrides: Overrides = {}): Record<string, unknown> {
  return {
    slug: 'augure',
    title: 'Augure',
    summary: 'Une plateforme de gestion documentaire, écrite en TypeScript de bout en bout.',
    type: 'professional',
    featured: true,
    technologies: ['typescript', 'next-js'],
    startedAt: '2024-01-15',
    endedAt: '2025-06-30',
    ...overrides,
  }
}

export function makeExperienceFrontmatter(overrides: Overrides = {}): Record<string, unknown> {
  return {
    slug: 'evea',
    company: 'Evea',
    role: 'Développeur Full-Stack',
    location: 'Nantes',
    startedAt: '2022-03-01',
    technologies: ['typescript', 'postgresql'],
    highlights: ['Refonte du moteur de recherche interne'],
    ...overrides,
  }
}

export function makeSkillFrontmatter(overrides: Overrides = {}): Record<string, unknown> {
  return {
    slug: 'typescript',
    name: 'TypeScript',
    category: 'language',
    level: 5,
    featured: true,
    ...overrides,
  }
}
