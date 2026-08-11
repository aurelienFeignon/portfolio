# `src/features/resume` — Envoi du CV

**Responsabilité** : Server Action, validation Zod, `ResumeSender` et `RateLimiter` (interfaces à un seul verbe), anti-abus (ADR-0006).
**Peut importer** : `i18n`. Aucune dépendance ajoutée au projet : Mailjet est appelé par `fetch` natif.
