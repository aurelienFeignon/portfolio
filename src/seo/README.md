# `src/seo` — Métadonnées et données structurées

**Responsabilité** : `generateMetadata`, `hreflang`, JSON-LD, sitemap — dérivés du Content Layer, jamais écrits à la main.
**Peut importer** : `i18n`, `routing`. *(Contrainte **confirmée en P3-06** : c'est exactement ce dont ce module a besoin. Elle était posée par défaut depuis P1-05.)*

Il **ne lit aucun fichier** : les locales où une entité existe réellement lui sont données par l'appelant (`getContentLocales`, P2-05). C'est ce qui rend le `hreflang` testable sans disque — et ce qui interdit `seo → content`.
