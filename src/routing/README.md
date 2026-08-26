# `src/routing` — Construction et analyse d'URL

**Responsabilité** : construire les URL localisées, et répondre à « où est cette page dans les autres langues ? ».
**Peut importer** : `i18n`.

Trois consommateurs posent cette dernière question — le `hreflang`, le sitemap et le sélecteur de langue — et `localeAlternates` est la **seule** réponse, pour qu'ils ne puissent pas se contredire (R-07).

`SECTIONS` porte les mêmes valeurs que `CONTENT_TYPES` sans pouvoir l'importer : l'accord est vérifié par `tests/integration/sections-match-content-types.test.ts`, seul module autorisé à importer les deux.

## Les deux sens, côte à côte

Chaque construction a son inverse **dans le même fichier que l'aller**, sans quoi le jour où l'un change, l'autre continue de répondre à l'ancienne question.

| Aller | Retour | Ajouté en |
|---|---|---|
| `homePath(locale)` | `localeFromPathname(pathname)` | P3-05 |
| `segmentFor(locale, section)` | `sectionForSegment(locale, segment)` | **P6-01** |
| `pathFor(locale, location)` | `parsePagePath(pathname)` | **P6-01** |

⭐⭐ `parsePagePath` **lit la forme, jamais l'existence** : elle rend une entité sans savoir si elle existe — `routing` ne lit pas le contenu (`architecture.md` §1.2). Elle rend `null` pour ce qu'**aucune route ne sert dans aucune langue** : locale inconnue, segment de section inconnu, fiche sous une section qui n'en a pas (`isSectionWithDetail`), chemin plus profond qu'une entité.

⭐ `withoutTrailingSlash` est **partagée avec `src/proxy.ts`**, qui décide si une adresse est servable : deux copies de cette équivalence ne vaudraient qu'à un endroit sur deux.
