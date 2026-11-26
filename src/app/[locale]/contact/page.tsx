/**
 * Demande du CV par e-mail (P10-06) — la **seule page rendue à la demande** du site.
 *
 * ⛔ **Elle doit l'être.** Le time-trap de P10-03 pose l'instant du rendu en champ caché ;
 * prérendue, la page porterait l'instant du build, toujours vieux de plus de 3 s, et le piège
 * laisserait tout passer. L'exception est nommée dans `src/routing/on-demand.ts` et confrontée au
 * build par `scripts/check-static-rendering.mts`. Elle n'est admissible que parce que rien ici ne
 * lit `content/` — ni la page, ni les layouts qu'elle traverse : l'invariant « aucune requête ne
 * lit le contenu » tient pour elle aussi.
 *
 * **Sans JavaScript.** Composant serveur, formulaire natif, Server Action qui redirige (PRG) :
 * aucun octet de JS applicatif n'est ajouté, et le parcours est le même avec ou sans.
 *
 * ⚠️ **Hors navigation, hors sitemap, `noindex`** tant que P10-07 et la réception réelle du CV ne
 * sont pas validées (décision du 2026-11-25).
 */
import type { Metadata } from 'next'

import { OUTCOME_PARAM, parseResumeOutcome } from '@/features/resume/request-resume'
import { HONEYPOT_FIELD, RENDERED_AT_FIELD } from '@/features/resume/schema'
import { LOCALES } from '@/i18n/locales'
import { getMessages } from '@/i18n/messages'
import { contactPath } from '@/routing/paths'
import { LanguageSwitcher } from '@/ui/language-switcher'
import lead from '@/ui/lead.module.css'
import page from '@/ui/page.module.css'
import { ReadingPanel } from '@/ui/reading-panel'

import { readLocale, type LocaleParams } from '../locale-param'

import { submitResumeRequest } from './actions'
import styles from './contact.module.css'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: LocaleParams): Promise<Metadata> {
  const { contact } = getMessages(await readLocale(params))

  return {
    title: contact.title,
    description: contact.description,
    // Aucun `canonical`, aucun `hreflang` : la page n'est pas encore une destination.
    robots: { index: false, follow: false },
  }
}

export default async function ContactPage({
  params,
  searchParams,
}: LocaleParams & {
  readonly searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const locale = await readLocale(params)
  const { contact } = getMessages(locale)
  const outcome = parseResumeOutcome((await searchParams)[OUTCOME_PARAM])

  return (
    <ReadingPanel variant="aside">
      <h1 className={page.title}>{contact.title}</h1>
      <p className={lead.lead}>{contact.intro}</p>

      {outcome !== null && (
        // `role="status"` : annoncé par un lecteur d'écran au chargement qui suit la redirection.
        <p className={styles.outcome} role="status" data-outcome={outcome}>
          {contact.outcomes[outcome]}
        </p>
      )}

      <form className={styles.form} action={submitResumeRequest.bind(null, locale)}>
        <label className={styles.field}>
          <span>{contact.emailLabel}</span>
          <input
            type="email"
            name="email"
            required
            maxLength={254}
            autoComplete="email"
            inputMode="email"
          />
        </label>

        {/* Le honeypot (P10-03) : invisible, hors de l'arbre d'accessibilité, hors du parcours
            au clavier, et ignoré du remplissage automatique. */}
        <div className={styles.trap} aria-hidden="true">
          <label>
            {contact.honeypotLabel}
            <input type="text" name={HONEYPOT_FIELD} tabIndex={-1} autoComplete="off" />
          </label>
        </div>
        {/* Écrit à CHAQUE requête : c'est toute la raison du rendu à la demande. */}
        <input
          type="hidden"
          name={RENDERED_AT_FIELD}
          // eslint-disable-next-line react-hooks/purity -- voulu : composant serveur rendu une fois par requête (force-dynamic), l'instant du rendu EST la donnée du time-trap (P10-03).
          value={String(Date.now())}
        />

        <button className={styles.submit} type="submit">
          {contact.submit}
        </button>
      </form>

      {/* La page existe dans chaque langue, au même segment : chaque option y mène. */}
      <LanguageSwitcher
        current={locale}
        options={LOCALES.map((other) => ({
          locale: other,
          href: contactPath(other),
          translated: true,
        }))}
      />
    </ReadingPanel>
  )
}
