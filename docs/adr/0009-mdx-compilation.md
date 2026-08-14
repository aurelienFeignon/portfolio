# ADR-0009 — Compilation MDX : `@mdx-js/mdx` appelé directement

- **Statut** : ACCEPTÉ (Phase 2, 2026-08-12)
- **Décide** : par quel moyen le corps MDX d'un contenu devient un arbre React rendu par le serveur
- **Lié à** : ADR-0001 (le contenu est la source de vérité), CT-08 (aucune dépendance structurante
  sans justification), CT-09 (la couche Content ne dépend ni de React ni de Next)

## Contexte

L'ADR-0001 fige déjà le contrat : la couche Content expose `body: string`, du **MDX brut**, et la
compilation a lieu **au rendu**, côté serveur, avec une liste blanche de composants. Ce qui restait
ouvert — et volontairement différé en Phase 0 — est l'outil de compilation, parce que la question ne
se tranche pas sur un domaine de versions annoncé mais sur une exécution réelle avec
**Next 16.3.0 / React 19.2.8**.

Trois contraintes encadrent le choix :

1. Le corps est une **chaîne lue au moment du rendu**, pas un module importé : il vient du système de
   fichiers via un repository (ADR-0001 §6), et son chemin n'est pas connu du graphe de modules.
2. Le compilateur ne peut pas vivre dans `src/content/**`, qui n'a le droit d'importer ni React ni
   Next (CT-09). Il vit dans la couche de rendu et ne reçoit qu'une chaîne.
3. Un contenu fautif doit produire une erreur qui **nomme le fichier** (CF-10, P2-04). Le message
   par défaut d'un compilateur ne connaît que la position dans une chaîne.

## Ce qui a été vérifié, et comment

Aucune ligne de ce qui suit ne vient d'un README. Une sonde temporaire
(`src/app/mdx-probe/page.tsx`, supprimée après mesure) a rendu **la même source MDX** par les deux
candidats applicables, puis une seconde sonde a comparé leurs erreurs.

| Vérification | `@mdx-js/mdx` 3.1.1 | `next-mdx-remote` 6.0.0 |
|---|---|---|
| `next build` (Turbopack, production) | ✅ | ✅ |
| Route **prérendue statiquement** | ✅ | ✅ |
| HTML produit | identique, à la balise près | identique |
| JavaScript client ajouté à la route | **0,0 Ko** | **0,0 Ko** |
| Rendu depuis l'**image de production** (`portfolio:local`, non-root) | ✅ | ✅ |
| Tracé dans `.next/standalone` | ✅ `node_modules/@mdx-js/mdx` | ✅ |
| Composant hors liste blanche | lève `Expected component \`Danger\` to be defined` | même message, plus la position |
| Erreur de syntaxe MDX | `3:1-3:21: Expected a closing tag for \`<div>\`` | même message, encadré par `@babel/code-frame` |
| Nom du fichier dans le message | avec `development: true` **oui**, sinon à ajouter par nous | à ajouter par nous également |
| Paquets ajoutés au verrou | **+106** (530 → 636) | +113, soit **7 de plus** |
| Image de production | 388 Mo avec les deux candidats installés et utilisés, contre 381 Mo en fin de Phase 1 (seuil bloquant : 400 Mo) | |

Deux constats qui ne s'anticipent pas :

- **Le corps MDX est compilé au build, pas à l'exécution.** Toutes les pages de contenu sont SSG
  (`architecture.md` §4.2) : le coût de compilation est payé une fois, à la construction de l'image,
  et le conteneur de production ne fait que servir du HTML. Le choix n'a donc **aucun effet sur le
  TTFB** ni sur le budget d'exécution du VPS.
- **MDX exécute du JavaScript.** La sonde a rendu `{process.env.SECRET_TOKEN ?? 'rien'}` depuis un
  corps MDX : l'expression a été évaluée. Le dossier `content/` est donc du **code**, au même niveau
  de confiance que `src/`. C'est acceptable ici — je suis seul auteur et tout est versionné — mais
  cela interdit définitivement d'accepter du MDX d'origine tierce. Conséquence inscrite en §P2-08.

## Décision

**Appeler `@mdx-js/mdx` directement**, via `evaluate()` avec `react/jsx-runtime`, derrière une
fonction maison d'une trentaine de lignes qui :

1. reçoit la chaîne **et le chemin du fichier**, et enrichit toute erreur de ce chemin ;
2. passe la **liste blanche de composants** explicitement, jamais par contexte React ;
3. n'active aucun greffon par défaut — un greffon (`remark-gfm` par exemple) sera ajouté seulement
   si le contenu réel l'exige, et justifié à ce moment-là.

Cette fonction vit dans la couche de rendu (P2-08), jamais dans `src/content/**`.

## Alternatives considérées

| Alternative | Pourquoi écartée |
|---|---|
| **`next-mdx-remote/rsc`** | Fonctionne, produit le même HTML, et c'est le choix le plus courant de l'écosystème. C'est une enveloppe d'une quarantaine de lignes autour de `@mdx-js/mdx`, et ce qu'elle ajoute ne nous sert pas : la lecture du frontmatter (c'est le travail de la couche Content, P2-03), `MDXProvider` via `@mdx-js/react` (nous passons les composants explicitement, c'est plus simple à tester et impossible à contourner) et un encadré d'erreur — alors que **nous devons de toute façon écrire notre propre enrobage** pour nommer le fichier. Restent 7 paquets et une indirection de plus entre notre code et le compilateur qui fait réellement le travail. Son verrou de développement est par ailleurs figé sur Next 13 / React 18, et son pair déclaré (`react >= 16`) ne prouve rien : la compatibilité constatée ici l'a été par exécution, pas par ce champ. **Repli désigné** si l'enrobage maison se révélait coûteux. |
| **`@next/mdx`** | Écarté par l'architecture, pas par la compatibilité. Il traite le MDX comme un **module importé par le bundler** : chaque fichier de contenu deviendrait un composant React résolu à la compilation. Cela contredit l'ADR-0001 §6 (le contenu est lu par un repository, pas par le graphe de modules), ferait entrer React dans la couche Content (CT-09), et déplacerait la validation du frontmatter dans un greffon de bundler, où elle est bien plus difficile à tester que dans du TypeScript pur. Le mode de chargement dynamique par chemin construit existe, mais il rendrait le contenu dépendant d'un comportement de bundler — exactement le couplage reproché à Contentlayer dans l'ADR-0001. |
| **Rendu Markdown → HTML (sans React)** | `remark` + `rehype-stringify` produirait une chaîne HTML injectée par `dangerouslySetInnerHTML`, sans dépendance React dans la chaîne. Écarté : on perd les composants de la liste blanche (encadrés, images légendées), donc l'intérêt même de MDX ; et injecter du HTML brut se heurtera à la politique CSP de P14-04. |
| **Compiler à la volée avec `compile()` puis `import()` d'un fichier temporaire** | Écrire du code généré sur le disque au build pour le réimporter ajoute un artefact, un cache à invalider et un mode de panne, pour un gain nul : `evaluate()` fait déjà les deux étapes en mémoire. |

## Conséquences

**Positives**

- Une seule dépendance ajoutée, qui est le compilateur MDX de référence, et aucune enveloppe entre
  lui et nous.
- L'erreur affichée au build est **la nôtre** : elle nomme le fichier, ce que ni l'un ni l'autre des
  candidats ne fait spontanément. C'est l'exigence CF-10, pas un confort.
- La liste blanche de composants est un simple argument : impossible d'ajouter un composant par
  effet de bord de contexte, et trivial à tester.
- Aucun JavaScript client, aucune régression de bundle : mesuré à 0,0 Ko sur la route.

**Négatives, assumées**

- Une trentaine de lignes d'enrobage à maintenir (compilation, cache, formatage d'erreur).
- `@mdx-js/mdx` apporte **106 paquets transitifs** (unified, remark, micromark, hast…). C'est le
  coût incompressible de MDX : `next-mdx-remote` en apporte 113. Il n'existe pas d'option à faible
  empreinte qui conserve les composants.
- L'image de production gagne quelques mégaoctets et se rapproche du seuil bloquant de 400 Mo. À
  remesurer en P2-08 avec le code réel, et à traiter comme un signal si le seuil est approché.

**Déclencheur de réexamen**

Si l'enrobage maison dépasse la centaine de lignes, ou si `@mdx-js/mdx` cesse d'être maintenu :
`next-mdx-remote` est le repli, et le contrat de la couche (`body: string`, compilation au rendu)
rend la bascule locale.
