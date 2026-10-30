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
| [0004](./0004-screen-ui-overlay-strategy.md) | Contenu des écrans en DOM superposé, instance unique | ACCEPTÉ *(amendé par D11 le 2026-10-23, révisé le 2026-10-28, amendé par D14 le 2026-10-30)* | 7 |
| [0005](./0005-i18n-strategy.md) | i18n sans bibliothèque, contenu localisé par fichier | ACCEPTÉ | 3 |
| [0006](./0006-resume-delivery.md) | CV : Server Action, transport Mailjet, rate limit en mémoire | ACCEPTÉ *(transport révisé deux fois le 2026-08-11)* | 10 |
| [0007](./0007-dockerized-development-environment.md) | Environnement de développement entièrement dockerisé | ACCEPTÉ | 1 |
| [0008](./0008-self-hosted-vps-deployment.md) | Auto-hébergement VPS, image Docker derrière Caddy | ACCEPTÉ | 1, 15 |

## Décisions actées (Phase 2)

| # | Titre | Statut | Phase d'application |
|---|---|---|---|
| [0009](./0009-mdx-compilation.md) | Compilation MDX : `@mdx-js/mdx` appelé directement | ACCEPTÉ | 2 |

## Décisions actées (Phase 4)

| # | Titre | Statut | Phase d'application |
|---|---|---|---|
| [0010](./0010-styling-strategy.md) | Style : CSS Modules et tokens en variables CSS | ACCEPTÉ | 4 |

## Décisions actées (Phase 5)

| # | Titre | Statut | Phase d'application |
|---|---|---|---|
| [0016](./0016-3d-runtime-dependencies.md) | `three` + React Three Fiber + drei, drei importé composant par composant | ACCEPTÉ | 5–8 |

## Décisions actées (Phase 6)

| # | Titre | Statut | Phase d'application |
|---|---|---|---|
| [0012](./0012-camera-animation-strategy.md) | Animation de caméra : interpolation maison à durée fixe, sans bibliothèque | ACCEPTÉ | 6 |

⭐ **Le saut de 0010 à 0016 est délibéré** : 0011 à 0015 ont été réservés dès la Phase 0 aux
décisions planifiées ci-dessous, dont l'une est nommée par la tâche P8-01. Un numéro réservé ne se
reprend pas. 0011 et 0013 à 0015 restent réservés.

## Décisions identifiées, à instruire plus tard

Ces sujets sont structurants mais ne peuvent pas être tranchés honnêtement en Phase 0 : ils
dépendent d'une mesure, d'une vérification de compatibilité, ou d'un état du produit qui n'existe
pas encore. Les instruire maintenant produirait une décision inventée plutôt qu'informée.

| # prévu | Sujet | À trancher en | Ce qui manque aujourd'hui |
|---|---|---|---|
| ~~0009~~ | ~~Bibliothèque de compilation MDX~~ — **tranché le 2026-08-12**, voir [ADR-0009](./0009-mdx-compilation.md) | — | — |
| ~~0010~~ | ~~Stratégie de style~~ — **tranché le 2026-08-15**, voir [ADR-0010](./0010-styling-strategy.md) | — | — |
| 0011 | Provenance et pipeline des assets 3D (modélisation, licences, compression) | Phase 8 | Dépend de H-09 et du niveau de détail visé |
| ~~0012~~ | ~~Stratégie d'animation de caméra~~ — **tranché par #58 le 2026-10-23, écrit le 2026-10-27**, voir [ADR-0012](./0012-camera-animation-strategy.md) | — | — |
| 0013 | Régression visuelle : adopter ou non | Phase 12 | Dépend de la stabilité constatée de la scène |
| 0014 | Mesure d'audience sans cookie | après v1 | Dépend de H-08 et d'un besoin réel |
| 0015 | Politique de sécurité de contenu (CSP) définitive | Phase 14 | Dépend des ressources réellement chargées en fin de projet |

## Journal des révisions

| Date | ADR | Nature du changement | Origine |
|---|---|---|---|
| 2026-10-30 | 0004 | Amendement (D14, carte mère, P8-15h) : **une sérigraphie peinte est autorisée pour la seule décoration sans langue** — années, repères de composants (`U1`, `IC12`, `R3`), référence de la carte. Elle double une information présente dans le DOM ou n'en porte aucune ; tout nom (compétence, famille, employeur, projet) reste une étiquette HTML `aria-hidden`. Point 6 de la décision ; `carte-mere.md` §9. La composition NEXUS de D11 (univers, noyau, gros plans calculés autour du noyau) est retirée du code avec ses composants. | Décision de l'utilisateur (D14) |
| 2026-10-28 | 0004 | Révision (P7-06) : ⛔ **le panneau n'est plus masqué pendant une transition de caméra.** Le masquage de §Conséquences cachait le décalage d'un panneau **projeté** sur un écran 3D ; depuis D11 le panneau est fixe, indépendant de la caméra, et le cacher 1,6 s ne ferait que retarder le contenu — au moment même où le focus revient au début du document (P7-05). Pendant le mouvement, le panneau porte **déjà** la page d'arrivée, seul, entièrement lisible : c'est le point 4 de la décision, tenu par E2E-17. Écartés : un fondu court (contenu à opacité nulle pendant l'annonce de route) et le masquage de 1,6 s (contraire à l'ordre d'arbitrage). | Décision de l'utilisateur |
| 2026-10-27 | 0012 | Révision (P6-11, P6-12) : ⛔ **le temps de transition ne se lit plus sur l'horloge de R3F**, que `setFrameloop` remet à zéro — au retour d'une fiche, une transition finie se rejouait, en production. Il s'accumule image par image. L'approche de l'orbite prend la forme exacte `1 − e^(−5δ)`, avec une image de réveil courte (le saut latent en `demand` est fermé) ; la remise à zéro passe en `useLayoutEffect`. Tout le calcul d'une image est pur (`rigFrame`) et épinglé par un banc. Les règles d'origine restent écrites dans l'ADR. | Suites de l'ADR-0012 |
| 2026-10-27 | 0012 | Création **après coup** : constate la décision livrée par #58 (interpolation maison à durée fixe) ; alternatives chiffrées par mesure, voir l'ADR §Alternatives. Suites ouvertes : P6-11, P6-12. | Dette P6-09 |
| 2026-10-26 | 0003, 0004 | Précision (reprise des idées d'une maquette Stitch) : **chaque univers porte une étiquette permanente** — nom et accroche —, là où seul l'univers survolé était nommé. Elles restent du **HTML hors de la racine de scène**, `aria-hidden` (elles doublent la navigation), posées à la projection d'un point d'accroche à chaque image ; jamais un texte peint dans une texture, que la maquette employait et que l'ADR-0004 écarte. Cachées hors de la zone libre et, en gros plan, sauf celle de l'univers cadré. | Décision de l'utilisateur |
| 2026-10-23 | 0010 | Amendement (D11, prototype NEXUS) : **le thème devient sombre, et unique** — §Décision 5 tranchée par redéfinition des mêmes variables, jamais par une seconde feuille. Contrastes recalculés sur les trois fonds où du texte se pose (`background`, `panel`, `surface`) : texte ≥ 13,6:1, texte secondaire ≥ 6,7:1, cyan ≥ 8,8:1 ; le violet de la palette (4,1:1 sur `surface`) est **décoratif**, une variante claire sert au texte. Aucune dépendance : Tailwind reste écarté. | Décision de l'utilisateur (D11) |
| 2026-10-23 | 0004 | Amendement (D11) : **le contenu n'est plus projeté sur des écrans 3D** — il vit dans un `ReadingPanel` HTML, sur sa propre surface opaque, dans une zone réservée ; la caméra se cadre dans l'espace restant par décalage du point principal (`setViewOffset`), jamais en redimensionnant le canvas. Le « panneau fixe indépendant de la scène », repli désigné de l'ADR, **devient la cible**. Aucun texte ne se pose plus sur le WebGL. | Décision de l'utilisateur (D11) |
| 2026-10-23 | 0003 | Amendement (D11) : **la couche de scène reçoit le pointeur**. `pointer-events: none` et `z-index: -1` de la Phase 5 sont remplacés par un empilement — scène à 0, panneau, en-tête et pied de page au-dessus. L'enrichissement progressif est inchangé : `aria-hidden`, montage après `idle`, rien de chargé au palier `none`, aucune information dans le canvas (le nom d'un univers survolé est un élément HTML hors de la racine de scène). | Décision de l'utilisateur (D11) |
| 2026-10-23 | 0002 | Amendement (D11) : **l'orbite bornée est un état de PRÉSENTATION**, jamais de navigation — elle n'entre pas dans l'URL et revient à zéro à chaque changement de route. Les liens du DOM et le clic sur un univers empruntent la même navigation client (`router.push`) quand la scène est montée ; sans scène, les liens restent des `<a>` ordinaires. | Décision de l'utilisateur (D11) |
| 2026-08-26 | 0002 | Amendement : **`getRouteForScreen` prend un `SceneFocus`**, les quatre états et non les trois écrans. La lecture restreinte obligeait « revenir au bureau » (Échap, clic hors écran) à appeler `homePath` à côté — c'est-à-dire à ouvrir une **seconde porte** dans le sens que l'ADR n'en veut qu'une. Gain vérifiable : l'aller-retour cesse d'être vacant et se prouve sur 4 focus × 2 locales, doublé d'une seconde propriété — **`parsePagePath(route)?.locale === locale`** —, sans quoi une route d'accueil inventée passerait, et un `homePath('fr')` en dur ferait changer de langue un visiteur anglophone. | Écriture de P6-03 |
| 2026-08-15 | 0010 | Création : **CSS Modules + tokens en variables CSS**. Vérifié par exécution avant d'être décidé — une sonde construite par `make bundle` mesure 0,0 Ko de JavaScript ajouté, un socle inchangé à 129,5 Ko, des classes réellement cloisonnées et **aucun paquet ajouté au verrou**. Tailwind écarté pour la conjonction dépendance structurante / lisibilité du balisage à l'audit d'accessibilité, avec déclencheur de réexamen en Phase 8 ; vanilla-extract écarté sur le risque d'intégration Turbopack. | Ouverture de la Phase 4 (P4-01) |
| 2026-08-14 | 0008 | Amendement : **`SITE_URL` devient un argument de construction**. Les pages de contenu étant statiques, `canonical`, `hreflang` et sitemap sont gravés au build ; l'image cesse d'être neutre vis-à-vis du domaine et un changement de domaine impose une reconstruction. Trois options pesées, aucune ne permettant de rester agnostique. | Écriture des métadonnées (P3-06) |
| 2026-08-12 | 0009 | Création : compilation MDX par `@mdx-js/mdx` appelé directement, après vérification par exécution des deux candidats applicables (build de production, prérendu, image de production, qualité des erreurs, empreinte). `next-mdx-remote` devient le repli désigné. | Ouverture de la Phase 2 (P2-01) |
| 2026-08-11 | 0007 | Amendement : **GNU Make ajouté aux prérequis d'hôte** (Docker, Git, Make). La rédaction initiale — « l'hôte n'a besoin que de Docker et de Git » — contredisait la règle 4 du même ADR, qui fait du `Makefile` l'interface de commandes. Aucune chaîne Node sur l'hôte : l'intention de l'ADR est inchangée. | Constat à l'ouverture de la Phase 1 |
| 2026-08-11 | 0006 | Transport : Resend (hypothèse) → **SMTP auto-hébergé**, pour s'aligner sur Augure. Risques R-19 et R-20 ajoutés. | Demande explicite |
| 2026-08-11 | 0006 | Transport : SMTP auto-hébergé → **Mailjet**, après vérification de ce qu'utilise réellement Augure. Annule la révision précédente. R-19 abaissé (délivrabilité déléguée), R-20 requalifié (quota et réputation d'un compte partagé), R-21 ajouté (adresse transmise à un tiers). Aucune dépendance ajoutée : API HTTP via `fetch` natif, ni SDK ni Nodemailer. Mailpit retiré de l'environnement de développement. | Correction de l'utilisateur |
| 2026-08-11 | 0008 | Création : l'hébergement Vercel (hypothèse H-01) est remplacé par l'auto-hébergement VPS. | Demande explicite |
| 2026-08-11 | 0007 | Création : environnement de développement entièrement dockerisé. | Demande explicite |

Un sujet de cette liste qui devient bloquant doit faire l'objet d'un ADR **avant** l'écriture du
code correspondant, jamais après.
</content>
