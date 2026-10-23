/**
 * Ce que tout audit Lighthouse de ce dépôt mesure : quelles pages, sous quels
 * profils — partagé par le gate (`check-lighthouse.mts`) et par la mesure de
 * référence (`measure-performance.mts`).
 *
 * ⭐⭐ **Extrait au troisième lecteur, comme `check-lighthouse.mts` l'annonçait.**
 * Deux scripts qui choisiraient leurs pages et leur bridage chacun de leur côté
 * produiraient deux séries de chiffres incomparables, et rien ne le dirait : un
 * TBT mesuré à `cpuSlowdownMultiplier: 1` ne se compare pas à un TBT mesuré à 4.
 *
 * ⚠️ `tests/e2e/support/sitemap.ts` reste à part, pour la raison écrite à
 * l'origine : il lit par l'`APIRequestContext` de Playwright, ces scripts par
 * `fetch`.
 */

/**
 * Les deux pages que `performance-budget.md` §2 désigne comme profil de
 * référence : l'accueil et une page de détail.
 *
 * ⚠️ **La fiche est déduite du sitemap**, jamais nommée : `content/` appartient à
 * l'auteur du site et change. C'est la règle que les parcours E2E appliquent
 * depuis P2-11, et la raison en est la même — un audit qui nomme une entité
 * mesure le contenu du jour.
 */
export async function pagesToAudit(baseUrl: string): Promise<string[]> {
  const xml = await (await fetch(`${baseUrl}/sitemap.xml`)).text()
  const paths = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(
    (match) => new URL(match[1] as string).pathname,
  )

  if (paths.length === 0) throw new Error('sitemap vide : rien à auditer')

  const detail = paths.find((path) => path.startsWith('/fr/') && path.split('/').length === 4)
  if (detail === undefined) throw new Error('aucune page de détail au sitemap')

  return ['/fr', detail]
}

/** Le profil mobile de `performance-budget.md` §2, et le profil desktop. */
export const FORM_FACTORS = [
  // Rien d'autre que le facteur de forme : le profil mobile de Lighthouse porte
  // déjà son émulation d'écran et son bridage. Passer `screenEmulation:
  // undefined` revenait à écrire explicitement ce que l'absence de clé dit mieux.
  { name: 'mobile', settings: { formFactor: 'mobile' as const } },
  {
    name: 'desktop',
    settings: {
      formFactor: 'desktop' as const,
      screenEmulation: {
        mobile: false,
        width: 1350,
        height: 940,
        deviceScaleFactor: 1,
        disabled: false,
      },
      throttling: { rttMs: 40, throughputKbps: 10_240, cpuSlowdownMultiplier: 1 },
    },
  },
]
