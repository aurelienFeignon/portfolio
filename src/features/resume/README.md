# `src/features/resume` — Envoi du CV

**Responsabilité** : parcours de la demande (`requestResume`) et son assemblage (`runtime.ts`), validation Zod, `ResumeSender` et `RateLimiter` (interfaces à un seul verbe), anti-abus (ADR-0006). La Server Action elle-même vit dans `app/[locale]/contact/` (P10-06).
**Peut importer** : `i18n`. Aucune dépendance ajoutée au projet : Mailjet est appelé par `fetch` natif.
