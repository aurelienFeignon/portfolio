# Décisions d'architecture (ADR)

Format : `Contexte / Décision / Alternatives / Conséquences`.
Une décision prise n'est **jamais** modifiée silencieusement : tout changement est signalé,
justifié, ses conséquences identifiées, et l'ADR mis à jour (§35 de la mission).

Statuts : `PROPOSÉ` · `ACCEPTÉ` · `REMPLACÉ PAR ADR-xxxx` · `ABANDONNÉ`

## Décisions actées (Phase 0)

| # | Titre | Statut | Phase d'application |
|---|---|---|---|
| [0001](./0001-content-architecture.md) | Le contenu Markdown/MDX est la source de vérité unique | ACCEPTÉ | 2 |
| [0002](./0002-routing-as-navigation-source-of-truth.md) | Le routeur Next.js est la source de vérité de la navigation | ACCEPTÉ | 6 |
| [0003](./0003-threejs-progressive-enhancement.md) | Three.js est un enrichissement progressif | ACCEPTÉ | 3–5 |
| [0004](./0004-screen-ui-overlay-strategy.md) | Contenu des écrans en DOM superposé, instance unique | ACCEPTÉ | 7 |
| [0005](./0005-i18n-strategy.md) | i18n sans bibliothèque, contenu localisé par fichier | ACCEPTÉ | 3 |
| [0006](./0006-resume-delivery.md) | CV : Server Action, transport Mailjet, rate limit en mémoire | ACCEPTÉ *(transport révisé deux fois le 2026-08-11)* | 10 |
| [0007](./0007-dockerized-development-environment.md) | Environnement de développement entièrement dockerisé | ACCEPTÉ | 1 |
| [0008](./0008-self-hosted-vps-deployment.md) | Auto-hébergement VPS, image Docker derrière Caddy | ACCEPTÉ | 1, 15 |

## Décisions identifiées, à instruire plus tard

Ces sujets sont structurants mais ne peuvent pas être tranchés honnêtement en Phase 0 : ils
dépendent d'une mesure, d'une vérification de compatibilité, ou d'un état du produit qui n'existe
pas encore. Les instruire maintenant produirait une décision inventée plutôt qu'informée.

| # prévu | Sujet | À trancher en | Ce qui manque aujourd'hui |
|---|---|---|---|
| 0009 | Bibliothèque de compilation MDX (`next-mdx-remote/rsc` vs `@next/mdx` vs maison) | Phase 2 | Vérification de compatibilité avec la version de Next retenue |
| 0010 | Stratégie de style (CSS Modules vs Tailwind vs vanilla-extract) | Phase 4 | Aucun besoin exprimé avant d'écrire des composants ; à trancher avant, pas pendant |
| 0011 | Provenance et pipeline des assets 3D (modélisation, licences, compression) | Phase 8 | Dépend de H-09 et du niveau de détail visé |
| 0012 | Stratégie d'animation de caméra (interpolation maison vs bibliothèque de ressorts) | Phase 6 | Dépend du ressenti réel, non prévisible sur le papier |
| 0013 | Régression visuelle : adopter ou non | Phase 12 | Dépend de la stabilité constatée de la scène |
| 0014 | Mesure d'audience sans cookie | après v1 | Dépend de H-08 et d'un besoin réel |
| 0015 | Politique de sécurité de contenu (CSP) définitive | Phase 14 | Dépend des ressources réellement chargées en fin de projet |

## Journal des révisions

| Date | ADR | Nature du changement | Origine |
|---|---|---|---|
| 2026-08-11 | 0007 | Amendement : **GNU Make ajouté aux prérequis d'hôte** (Docker, Git, Make). La rédaction initiale — « l'hôte n'a besoin que de Docker et de Git » — contredisait la règle 4 du même ADR, qui fait du `Makefile` l'interface de commandes. Aucune chaîne Node sur l'hôte : l'intention de l'ADR est inchangée. | Constat à l'ouverture de la Phase 1 |
| 2026-08-11 | 0006 | Transport : Resend (hypothèse) → **SMTP auto-hébergé**, pour s'aligner sur Augure. Risques R-19 et R-20 ajoutés. | Demande explicite |
| 2026-08-11 | 0006 | Transport : SMTP auto-hébergé → **Mailjet**, après vérification de ce qu'utilise réellement Augure. Annule la révision précédente. R-19 abaissé (délivrabilité déléguée), R-20 requalifié (quota et réputation d'un compte partagé), R-21 ajouté (adresse transmise à un tiers). Aucune dépendance ajoutée : API HTTP via `fetch` natif, ni SDK ni Nodemailer. Mailpit retiré de l'environnement de développement. | Correction de l'utilisateur |
| 2026-08-11 | 0008 | Création : l'hébergement Vercel (hypothèse H-01) est remplacé par l'auto-hébergement VPS. | Demande explicite |
| 2026-08-11 | 0007 | Création : environnement de développement entièrement dockerisé. | Demande explicite |

Un sujet de cette liste qui devient bloquant doit faire l'objet d'un ADR **avant** l'écriture du
code correspondant, jamais après.
</content>
