/**
 * Résumés d'expérience pour les tests de composants (P4-04).
 *
 * Ce que `ExperienceList` consomme n'est pas une `Experience` du Content Layer :
 * `src/ui` ne peut pas importer `src/content` (`architecture.md` §1.2), et la
 * vue reçoit donc une **forme aplatie**, construite par la route. C'est cette
 * forme-là que la fabrique produit.
 *
 * Les valeurs par défaut ne ressemblent à aucune entité réelle, délibérément :
 * un test qui reconnaîtrait « EVEA Conseil » dans un défaut finirait par
 * dépendre du contenu, ce que le dépôt interdit.
 *
 * ⚠️ Le `href` par défaut est **unique à chaque appel**. `ExperienceList` clé par
 * `href` : un défaut constant donnait à React deux clés égales dès qu'un test
 * construisait deux éléments — un enfant omis ou dupliqué, sans erreur. Le faire
 * porter par la fabrique évite que chaque appelant ait à y penser, ce qu'un test
 * avait dû faire, commentaire compris.
 */
import type { ExperienceSummary } from '@/ui/experience-list'

let counter = 0

export function makeExperienceSummary(
  overrides: Partial<ExperienceSummary> = {},
): ExperienceSummary {
  counter += 1

  return {
    href: `/fr/experiences/exemple-${counter}`,
    role: 'Poste',
    company: 'Société',
    startedAt: '2020-01-01',
    endedAt: '2022-12-31',
    ...overrides,
  }
}
