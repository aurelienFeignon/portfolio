/**
 * Limitation de débit de l'envoi du CV — le contrat (P10-01, ADR-0006).
 *
 * Une interface à **un seul verbe**, comme `ResumeSender`. La même sert aux trois
 * limites de l'ADR (par IP, par adresse e-mail hachée, plafond global
 * journalier) : seules la clé et la règle changent. L'implémentation en mémoire
 * (P10-04) et la persistance du plafond global (P10-05) restent derrière elle,
 * et un passage à plusieurs répliques ne changerait qu'elle.
 *
 * **`RateResult` ne dit que oui ou non.** Ni compteur, ni délai avant nouvel
 * essai : sur la clé d'une adresse e-mail, l'un ou l'autre révélerait que
 * quelqu'un a déjà demandé le CV pour cette adresse — `architecture.md` §6
 * l'interdit. Si une limite par IP doit un jour annoncer un délai, ce sera un
 * ajout délibéré, pas une information déjà disponible que l'on oublie de taire.
 */

/** Au plus `limit` consommations par fenêtre de `windowMs` millisecondes. */
export interface RateRule {
  readonly limit: number
  readonly windowMs: number
}

export interface RateResult {
  readonly allowed: boolean
}

export interface RateLimiter {
  /**
   * Compte une consommation pour `key` sous `rule`, et dit si elle est admise.
   * Une consommation refusée n'est **pas** comptée : un abus bloqué ne prolonge
   * pas son propre blocage.
   *
   * `key` est opaque pour le limiteur ; c'est à l'appelant de la hacher quand
   * elle dérive d'une donnée personnelle (adresse e-mail, IP).
   */
  consume(key: string, rule: RateRule): Promise<RateResult>

  /**
   * Rend la **dernière** consommation admise de `key` (P10-07) : une demande comptée puis
   * abandonnée — l'envoi a échoué — ne doit pas occuper un créneau. Ne rend rien, comme `consume`
   * ne dit que oui ou non, et **ne rejette jamais** : en cas de doute, le créneau reste consommé,
   * ce qui est le côté sûr pour le quota d'Augure.
   */
  release(key: string): Promise<void>
}
