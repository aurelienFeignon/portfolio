# `src/routing` — Construction et analyse d'URL

**Responsabilité** : construire les URL localisées, et répondre à « où est cette page dans les autres langues ? ».
**Peut importer** : `i18n`.

Trois consommateurs posent cette dernière question — le `hreflang`, le sitemap et le sélecteur de langue — et `localeAlternates` est la **seule** réponse, pour qu'ils ne puissent pas se contredire (R-07).

`SECTIONS` porte les mêmes valeurs que `CONTENT_TYPES` sans pouvoir l'importer : l'accord est vérifié par `tests/integration/sections-match-content-types.test.ts`, seul module autorisé à importer les deux.
