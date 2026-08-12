/**
 * Séparation frontmatter / corps, et lecture du YAML (P2-03).
 *
 * **Pourquoi pas `gray-matter`**, que `architecture.md` §3.2 nommait : il
 * s'appuie sur `js-yaml` en schéma YAML 1.1, qui convertit `2024-01-15` en objet
 * `Date`. Vérifié plutôt que supposé — la sonde a renvoyé
 * `startedAt => "2024-01-15T00:00:00.000Z" ( Date )`. Nos schémas attendent une
 * chaîne ISO ; il faudrait donc reconvertir chaque date avant validation, en
 * traversant des types de fuseau horaire, pour revenir à ce que l'auteur avait
 * écrit. Le paquet `yaml` applique le schéma **core de YAML 1.2** : une date
 * reste une chaîne, et `yes` reste `"yes"` plutôt que de devenir `true`.
 *
 * S'y ajoute l'état des deux paquets : `yaml` 2.9.0 publié en 2026 et sans
 * aucune dépendance, `gray-matter` 4.0.3 publié en 2021 et tirant quatre paquets
 * dont `js-yaml` 3.
 */
import { parse as parseYaml } from 'yaml'

import { ContentError, messageOf } from './errors.ts'

const DELIMITER = '---'

export interface SplitFile {
  /** Le YAML brut, délimiteurs exclus. */
  readonly yaml: string
  /** Tout ce qui suit le frontmatter : le corps MDX, non compilé (ADR-0009). */
  readonly body: string
}

/**
 * Normalise ce qui vient du disque avant toute analyse : marque d'ordre des
 * octets et fins de ligne Windows. Sans cela, un fichier enregistré sur un autre
 * poste échoue sur le premier délimiteur, avec un message incompréhensible.
 */
function normalise(raw: string): string {
  return raw.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n')
}

/**
 * Découpe `---\n<yaml>\n---\n<corps>`.
 *
 * Le délimiteur de fermeture doit occuper sa ligne entière : sans cela, une
 * ligne de corps commençant par trois tirets — un séparateur Markdown, donc —
 * couperait le fichier en deux au mauvais endroit.
 */
export function splitFrontmatter(file: string, raw: string): SplitFile {
  const content = normalise(raw)

  if (!content.startsWith(`${DELIMITER}\n`)) {
    throw new ContentError(
      file,
      'le fichier ne commence pas par un frontmatter délimité par `---` sur sa propre ligne',
    )
  }

  const closing = content.indexOf(`\n${DELIMITER}`, DELIMITER.length)
  const afterClosing = closing === -1 ? -1 : closing + DELIMITER.length + 1
  const isWholeLine =
    afterClosing !== -1 && (afterClosing === content.length || content[afterClosing] === '\n')

  if (!isWholeLine) {
    throw new ContentError(file, 'le frontmatter n’est jamais refermé par une ligne `---`')
  }

  return {
    yaml: content.slice(DELIMITER.length + 1, closing),
    body: content.slice(afterClosing + 1),
  }
}

/**
 * Lit le YAML du frontmatter. Le résultat est `unknown` **à dessein** : la seule
 * chose garantie ici est qu'il s'agit d'une table de clés. Ce qu'elle contient
 * est l'affaire des schémas (P2-04).
 */
export function parseFrontmatter(file: string, yaml: string): Record<string, unknown> {
  let data: unknown
  try {
    data = parseYaml(yaml)
  } catch (cause) {
    throw new ContentError(file, `frontmatter YAML illisible — ${messageOf(cause)}`, { cause })
  }

  // Un frontmatter vide donne `null`, une liste donne un tableau : ni l'un ni
  // l'autre ne peut porter les champs attendus, et le dire ici produit un
  // message bien plus clair que « champ manquant » répété six fois.
  if (data === null || typeof data !== 'object' || Array.isArray(data)) {
    throw new ContentError(
      file,
      'le frontmatter doit être une table de champs `clé: valeur`, non vide',
    )
  }

  return data as Record<string, unknown>
}
