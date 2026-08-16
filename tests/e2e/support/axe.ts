/**
 * L'audit d'accessibilité, écrit une fois (P4-04).
 *
 * **Ce que l'extraction protège n'est pas la longueur du bloc, c'est la liste de
 * tags.** Elle décide de ce qui est mesuré ; recopiée, elle diverge — et le jour
 * où P4-10 en ajoute un à un seul endroit, deux audits mesurent des choses
 * différentes sans que rien ne le dise. C'était son deuxième exemplaire, et la
 * passe complète de P4-10 en aurait fait un troisième.
 *
 * Seules les violations `serious` et `critical` bloquent : c'est le critère de
 * sortie de la phase, écrit dans `roadmap.md`, et non un choix de ce fichier.
 */
import AxeBuilder from '@axe-core/playwright'
import { expect, type Page } from '@playwright/test'

/** Les règles auditées — WCAG 2.2 AA et ses niveaux inférieurs. */
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

/**
 * Échoue si la page présente une violation bloquante.
 *
 * `label` n'est pas décoratif : quand la même assertion couvre plusieurs pages
 * dans une boucle, le message d'échec doit dire **laquelle**.
 */
export async function expectNoBlockingAxeViolations(page: Page, label: string): Promise<void> {
  const { violations } = await new AxeBuilder({ page }).withTags(TAGS).analyze()

  const blocking = violations.filter(
    (violation) => violation.impact === 'serious' || violation.impact === 'critical',
  )

  expect(blocking.map((violation) => `${label} — ${violation.id}: ${violation.help}`)).toEqual([])
}
