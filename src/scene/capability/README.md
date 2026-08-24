# `src/scene/capability` — Paliers de capacité

**Responsabilité** : `resolveCapabilityTier` (fonction pure) et son adaptateur navigateur — quatre paliers `full`/`reduced`/`lite`/`none` (ADR-0003) — plus `mount-state.ts`, qui dit ce qu'une défaillance fait au montage : bascule en `none`, **sans retour** (P5-07).
**Peut importer** : rien de métier ; la lecture des API navigateur est isolée dans l'adaptateur.
