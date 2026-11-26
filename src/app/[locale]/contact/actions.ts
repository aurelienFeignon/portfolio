'use server'

/**
 * La Server Action du formulaire de CV (P10-06) : assembler, puis rediriger.
 *
 * ⭐ **Post-Redirect-Get, sans JavaScript.** Le formulaire est un composant serveur ; soumis sans
 * JS, le navigateur poste, l'action répond par une redirection 303 vers la page, et l'issue voyage
 * dans l'URL (`?envoi=…`). Rien d'autre n'y voyage — ⛔ jamais l'adresse saisie, qui finirait
 * dans l'historique et les journaux d'accès.
 *
 * L'IP vient de `CF-Connecting-IP` : l'origine n'accepte que Cloudflare (pare-feu d'origine,
 * `deploy/README.md`), l'en-tête ne peut donc pas être posé par le visiteur. Absente en local.
 */
import { headers } from 'next/headers'
import { notFound, redirect } from 'next/navigation'

import { OUTCOME_PARAM, requestResume } from '@/features/resume/request-resume'
import { resumeDeps } from '@/features/resume/runtime'
import { isLocale } from '@/i18n/locales'
import { contactPath } from '@/routing/paths'

export async function submitResumeRequest(locale: string, form: FormData): Promise<never> {
  // Liée par `.bind` au rendu, mais un argument lié voyage dans le formulaire : il se vérifie.
  if (!isLocale(locale)) notFound()

  const outcome = await requestResume(
    {
      form: Object.fromEntries(form),
      locale,
      ip: (await headers()).get('cf-connecting-ip'),
    },
    resumeDeps(),
  )

  redirect(`${contactPath(locale)}?${OUTCOME_PARAM}=${outcome}`)
}
