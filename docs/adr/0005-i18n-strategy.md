# ADR-0005 — Internationalisation sans bibliothèque, contenu localisé par fichier

- **Statut** : ACCEPTÉ (Phase 0, 2026-08-11)
- **Décide** : routage localisé, contenu par locale, chaînes d'interface, hreflang
- **Lié à** : ADR-0001, ADR-0002

## Contexte

Le portfolio doit être disponible en français et en anglais dès le départ, et l'ajout d'une
troisième langue doit rester simple. L'App Router de Next.js ne fournit pas de routage i18n
intégré (contrairement au Pages Router) : le segment de locale doit être explicite.

La mission impose une contrainte forte : **les contenus principaux ne doivent pas vivre dans de
gros fichiers JSON de traduction**. Seules les petites chaînes d'interface peuvent être gérées à
part.

## Décision

1. **Routage** : segment `app/[locale]/...`, avec `generateStaticParams` sur les locales
   supportées. Une locale inconnue produit un **404**, pas une redirection devinée (une redirection
   silencieuse pollue l'index et masque les liens cassés).
2. **Contenu éditorial** : un fichier par locale (`content/fr/...`, `content/en/...`), conformément
   à ADR-0001. Aucun contenu éditorial en JSON.
3. **Chaînes d'interface** : dictionnaires TypeScript, `src/i18n/messages/{fr,en}.ts`. Le type est
   dérivé du dictionnaire français ; toute clé manquante ou en trop dans une autre locale est une
   **erreur de compilation**. Pas de clé dynamique, pas de recherche par chaîne libre.
4. **Aucune bibliothèque i18n en v1.** Le formatage des dates et des nombres utilise `Intl`, la
   pluralisation `Intl.PluralRules`. Ces API sont natives, sans coût de bundle.
5. **Repli inter-locales** : si une entité n'existe pas dans une locale, elle n'est ni listée, ni
   référencée en `hreflang`, ni présente au sitemap pour cette locale. Pas de contenu français
   affiché sous une URL anglaise (risque R-07).
6. **Métadonnées** : `canonical` sur l'URL de la locale courante ; `hreflang` uniquement vers les
   locales **réellement disponibles pour cette entité**, plus `x-default` pointant la locale par
   défaut.
7. **Segments d'URL non traduits** en v1 (`/fr/projects`). Une table
   `routeSegments[locale][section]` existe dès la Phase 3, en identité, afin que leur traduction
   soit un changement localisé et non une refonte.
8. `/` négocie via `Accept-Language` et redirige, avec repli sur `fr` (H-04).

## Alternatives considérées

| Alternative | Pourquoi écartée |
|---|---|
| **next-intl** | Excellente bibliothèque, bien intégrée à l'App Router. Mais elle résout des problèmes que je n'ai pas : messages ICU complexes, chargement de catalogues, workflow de traducteurs externes. Pour ~80 chaînes d'interface écrites par une seule personne, elle ajoute une dépendance structurante et un poids de bundle contre une complétude que TypeScript me donne déjà gratuitement (CT-08). **Repli désigné** si le déclencheur ci-dessous survient. |
| **next-i18next / i18next** | Conçu à l'origine pour le Pages Router, écosystème lourd, orienté catalogues JSON — précisément ce que la mission écarte. |
| **Contenu bilingue dans un même fichier** (frontmatter multi-langues) | Fichiers illisibles, difficulté à ajouter une langue, désynchronisation des corps de texte. |
| **Sous-domaines par langue** (`fr.` / `en.`) | Complexifie l'auto-hébergement (certificats, configuration proxy) sans bénéfice pour un site de cette taille. Les sous-répertoires sont recommandés pour ce cas. |
| **Détection automatique sans segment d'URL** | Casse le partage d'URL, l'indexation par langue et le hreflang. Non conforme à CF-04. |

## Conséquences

**Positives**

- Zéro dépendance, zéro poids de bundle pour l'i18n.
- La complétude des traductions d'interface est garantie **à la compilation**, ce qu'aucune
  bibliothèque à catalogues JSON ne fait aussi bien.
- Ajouter une langue = ajouter une valeur au type `Locale`, un dictionnaire (dont TypeScript
  exigera l'exhaustivité) et un dossier de contenu. Le compilateur guide le travail restant.
- Le `hreflang` est dérivé de la réalité du contenu, donc jamais mensonger.

**Négatives, assumées**

- Interpolation et pluralisation sont à écrire à la main (quelques fonctions utilitaires,
  testées). Volume attendu : faible.
- Pas de gestion de traducteur externe, pas de format d'échange standard. Non pertinent
  aujourd'hui (H-10).
- Le risque existe de réimplémenter progressivement une bibliothèque. Le déclencheur ci-dessous
  sert de garde-fou explicite.

**Déclencheur de réexamen (adopter next-intl)**

L'un de ces trois signaux suffit : (a) besoin de messages ICU réels — genre, sélection, pluriels
imbriqués ; (b) troisième locale confiée à un traducteur externe ; (c) le module i18n maison dépasse
~300 lignes ou requiert son propre modèle mental.
</content>
