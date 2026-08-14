# `src/content` — Content Layer

**Responsabilité** : lire, parser, valider (Zod) et normaliser le Markdown/MDX en objets typés — source de vérité unique du contenu (ADR-0001).
**Peut importer** : `i18n` (vocabulaire des locales, ajouté en P2-02 — voir `architecture.md` §1.2). **Ni React, ni Next, ni Three.js** (CT-09), vérifié par le lint.

Les imports relatifs y portent leur extension `.ts` : la couche doit rester exécutable par `node` seul, le gate de contenu de `pnpm build` l'important sans bundler (P2-04).
