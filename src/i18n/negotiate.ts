/**
 * Négociation `Accept-Language` (P3-03) — hypothèse H-04, question Q13.
 *
 * Une **fonction pure** : elle reçoit la valeur de l'en-tête, elle rend une
 * locale. Elle ne connaît ni requête, ni cookie, ni framework, et c'est ce qui
 * permet de la couvrir entièrement en test sans démarrer de serveur. `proxy.ts`
 * se contente de lui passer l'en-tête et de rediriger.
 *
 * Elle ne peut pas échouer : sans en-tête, avec un en-tête vide, illisible, ou ne
 * citant que des langues inconnues, elle rend la locale par défaut. Un visiteur
 * doit toujours atterrir quelque part.
 *
 * **Le raisonnement se fait par locale disponible, pas par préférence.** C'est le
 * sens de la RFC 9110 §12.5.4, et la nuance n'est pas théorique : le joker `*`
 * y est défini comme « toute étiquette que les autres domaines ne couvrent pas ».
 * Parcourir les préférences dans l'ordre et rendre la locale par défaut au premier
 * `*` rencontré donne une réponse fausse dès que la locale par défaut est, elle,
 * citée explicitement plus bas — `fr;q=0.1,*;q=0.9` doit rendre `en`. Le premier
 * jet faisait exactement cette erreur ; un test l'a trouvée.
 *
 * Aucune bibliothèque (ADR-0005) : le format tient en trois règles, et une
 * dépendance coûterait plus que ces quarante lignes.
 */
import { DEFAULT_LOCALE, LOCALES, type Locale } from './locales.ts'

interface Preference {
  readonly tag: string
  readonly quality: number
  /** Position dans l'en-tête : elle départage les qualités égales. */
  readonly index: number
}

/** `fr-FR,fr;q=0.9,en;q=0.8` → les préférences, dans l'ordre d'écriture. */
function parsePreferences(header: string): readonly Preference[] {
  return header
    .split(',')
    .map((entry, index): Preference | null => {
      // Découpage par position et non par `split(';')` déstructuré : ce dernier
      // oblige à traiter un « premier élément absent » que `split` ne produit
      // jamais, donc à écrire une branche que rien ne peut couvrir.
      const separator = entry.indexOf(';')
      const tag = (separator === -1 ? entry : entry.slice(0, separator)).trim().toLowerCase()
      if (tag === '') return null

      // Le **nom** du paramètre est insensible à la casse (RFC 9110 §5.6.6) :
      // `;Q=0.9` est une pondération valide. La comparer telle quelle la ferait
      // manquer, et l'entrée hériterait alors de la pondération maximale — un
      // en-tête `fr;Q=0.1, en;Q=0.9` rendrait `fr`. Constaté en revue.
      const qualityParameter = (separator === -1 ? [] : entry.slice(separator + 1).split(';'))
        .map((parameter) => parameter.trim().toLowerCase())
        .find((parameter) => parameter.startsWith('q='))

      if (qualityParameter === undefined) return { tag, quality: 1, index }

      const rawQuality = qualityParameter.slice(2)
      // `Number('')` vaut **0**, pas `NaN` : sans ce contrôle, un `;q=` tronqué
      // passerait le garde-fou suivant et signifierait « surtout pas cette
      // langue » — une interdiction déduite d'une faute de frappe.
      if (rawQuality === '') return null

      const quality = Number(rawQuality)
      // Une pondération illisible ou hors domaine rend l'entrée inexploitable.
      // La traiter comme « souhaitée au maximum » ferait gagner une valeur
      // erronée contre des préférences correctement écrites.
      if (!Number.isFinite(quality) || quality < 0 || quality > 1) return null

      return { tag, quality, index }
    })
    .filter((preference): preference is Preference => preference !== null)
}

/**
 * La préférence qui gouverne cette locale.
 *
 * Une mention explicite l'emporte toujours sur le joker, quelle que soit sa
 * pondération : `fr;q=0.1` dit quelque chose de `fr`, `*;q=0.9` ne dit rien de
 * plus que « à défaut ». Entre plusieurs mentions explicites (`en` et `en-GB`),
 * la mieux pondérée gagne.
 */
function governing(locale: Locale, preferences: readonly Preference[]): Preference | null {
  const explicit = preferences.filter(
    (preference) => preference.tag === locale || preference.tag.startsWith(`${locale}-`),
  )
  const candidates = explicit.length > 0 ? explicit : preferences.filter(({ tag }) => tag === '*')

  return candidates.reduce<Preference | null>(
    (best, preference) => (best === null || preference.quality > best.quality ? preference : best),
    null,
  )
}

export function negotiateLocale(header: string | null | undefined): Locale {
  if (header === null || header === undefined) return DEFAULT_LOCALE

  const preferences = parsePreferences(header)
  let best: { locale: Locale; preference: Preference } | null = null

  // Parcours dans l'ordre de `LOCALES` : à égalité parfaite, la locale par
  // défaut est en tête et gagne.
  for (const locale of LOCALES) {
    const preference = governing(locale, preferences)
    // `q=0` ne signifie pas « en dernier recours » mais « surtout pas
    // celle-ci ». La locale est donc écartée, et non simplement mal classée.
    if (preference === null || preference.quality === 0) continue

    const better =
      best === null ||
      preference.quality > best.preference.quality ||
      // À qualité égale, l'ordre d'écriture de l'en-tête fait foi.
      (preference.quality === best.preference.quality && preference.index < best.preference.index)

    if (better) best = { locale, preference }
  }

  return best?.locale ?? DEFAULT_LOCALE
}
