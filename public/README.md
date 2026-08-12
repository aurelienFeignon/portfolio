# `public` — Ressources servies telles quelles

`models/` (.glb) et `textures/` (.ktx2/.webp) en Phase 8 · `resume/` le CV PDF par locale.
Les assets sont versionnés par nom de fichier pour permettre un cache immuable.

`resume/cv-fr.pdf` et `resume/cv-en.pdf` sont **présents depuis le 2026-08-12** (H-03 confirmée).
Ils sont servis à une URL stable mais portent `X-Robots-Tag: noindex` (`next.config.ts`) : un CV
reste accessible par lien et par e-mail, il ne devient pas un résultat de recherche autonome.
L'en-tête est vérifié en E2E **contre l'image de production**.
