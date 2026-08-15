/**
 * Lecture du segment de locale d'une route (P3-02).
 *
 * `dynamicParams = false` fait déjà répondre 404 à `/de/...` **avant** tout
 * rendu : Next ne sert que les paramètres énumérés par `generateStaticParams`.
 * Ce `notFound()` n'est donc pas la protection — il est le **filet**, pour le cas
 * où une route future oublierait cette déclaration.
 *
 * Ce que cette fonction apporte à chaque appel, en revanche, est le typage : une
 * page reçoit `{ locale: string }` de Next et a besoin d'une `Locale`. Le refaire
 * dans chacune des huit routes serait huit occasions d'oublier la garde.
 */
import { notFound } from 'next/navigation'

import { isLocale, type Locale } from '@/i18n/locales'

export async function readLocale(params: Promise<{ locale: string }>): Promise<Locale> {
  const { locale } = await params
  // Une locale inconnue est un 404, jamais une redirection vers la plus proche :
  // deviner pollue l'index avec des URL qui n'existent pas (`architecture.md` §10).
  if (!isLocale(locale)) notFound()
  return locale
}
