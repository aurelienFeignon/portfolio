# `src/i18n` — Internationalisation

**Responsabilité** : type `Locale`, locale par défaut, dictionnaires d'interface typés, négociation `Accept-Language` (ADR-0005).
**Peut importer** : rien.

`locales.ts` (vocabulaire seul) est écrit dès la Phase 2, la couche Content en dépendant. P3-01 le **complète**, ne le recrée pas.

**Complété en P3-01 et P3-03** : `LOCALE_NAMES` (endonymes, pour le sélecteur de langue), `negotiate.ts` (`Accept-Language`, fonction pure) et `messages/` (dictionnaires typés dont la complétude est tenue par le compilateur, jamais par un test).

Il n'y a pas de `parseLocale` : `isLocale` est une **garde de type**, ce dont les appelants ont besoin. Voir `phase-3-log.md` §8.
