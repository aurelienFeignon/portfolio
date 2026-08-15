/**
 * Les paramètres de route, lus une fois pour toutes (P3-02).
 *
 * `dynamicParams = false` fait déjà répondre 404 à `/de/...` **avant** tout
 * rendu : Next ne sert que les paramètres énumérés par `generateStaticParams`.
 * Le `notFound()` de `readLocale` n'est donc pas la protection — il est le
 * **filet**, pour le cas où une route future oublierait cette déclaration.
 *
 * Ce que ce module apporte à chaque appel, en revanche, est le typage : une page
 * reçoit `{ locale: string }` de Next et a besoin d'une `Locale`. Le refaire dans
 * chacune des huit routes serait huit occasions d'oublier la garde — et les
 * **types** qui vont avec étaient, eux, recopiés sept fois avant la revue.
 */
import { notFound } from 'next/navigation'

import { isLocale, type Locale } from '@/i18n/locales'

/**
 * La forme que Next donne aux paramètres d'une route sous `[locale]`.
 *
 * Le contrat change de forme environ une fois par version majeure de Next — il
 * est devenu une promesse en 15. Le porter ici en fait une modification d'un
 * fichier plutôt que de sept.
 */
export interface LocaleParams {
  readonly params: Promise<{ locale: string }>
}

export interface EntityParams {
  readonly params: Promise<{ locale: string; slug: string }>
}

export async function readLocale(params: Promise<{ locale: string }>): Promise<Locale> {
  const { locale } = await params
  // Une locale inconnue est un 404, jamais une redirection vers la plus proche :
  // deviner pollue l'index avec des URL qui n'existent pas (`architecture.md` §10).
  if (!isLocale(locale)) notFound()
  return locale
}

/** Locale **et** slug d'une page de détail, en une seule attente de la promesse. */
export async function readEntityParams(
  params: Promise<{ locale: string; slug: string }>,
): Promise<{ locale: Locale; slug: string }> {
  const { locale, slug } = await params
  if (!isLocale(locale)) notFound()
  return { locale, slug }
}

/**
 * Les slugs à prégénérer pour la locale que le segment parent a énumérée.
 *
 * Le paramètre `locale` est typé `string` et non `Locale` : c'est la signature
 * que le validateur de routes de Next impose, et la refuser fait échouer le
 * build (vu échouer à l'écriture). La garde qui suit n'est donc pas décorative —
 * elle est la seule chose qui rende ce `string` utilisable.
 *
 * Écrite ici et non dans chaque route de détail : les deux copies existantes se
 * renvoyaient l'une à l'autre en commentaire, ce qui est le symptôme.
 */
export async function staticSlugParams(
  params: { locale: string },
  listEntities: (locale: Locale) => Promise<readonly { readonly slug: string }[]>,
): Promise<{ slug: string }[]> {
  if (!isLocale(params.locale)) return []
  return (await listEntities(params.locale)).map(({ slug }) => ({ slug }))
}
