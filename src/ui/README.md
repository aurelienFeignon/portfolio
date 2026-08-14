# `src/ui` — Composants documentaires réutilisables

**Responsabilité** : composants de présentation sans logique métier ni accès au contenu.
**Peut importer** : `i18n`.

`mdx/` compile un corps MDX en arbre React côté serveur, avec liste blanche de composants (P2-08, ADR-0009). Il reçoit une chaîne : il ne lit jamais le système de fichiers.
