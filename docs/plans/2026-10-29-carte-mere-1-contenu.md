# Carte mère, plan 1/3 — le contenu — plan d'implémentation

> **Pour les agents qui exécutent :** SOUS-SKILL REQUIS : superpowers:subagent-driven-development
> (recommandé) ou superpowers:executing-plans, tâche par tâche. Les étapes se suivent par cases à
> cocher (`- [ ]`).

**But :** donner au contenu ce que la carte mère lira — un projet principal désigné, le
rattachement d'un projet à une expérience — et ajouter les fiches projet Augure et Askor.

**Architecture :** deux champs optionnels dans le schéma de projet (Zod, `strictObject`), deux
contrôles d'intégrité purs dans `integrity.ts` branchés dans le gate `check-content`, puis les
fiches dans les deux locales. Aucun code de scène dans ce plan.

**Pile :** TypeScript, Zod 4, Vitest, MDX ; tout passe par Docker (`make`), Node n'est pas
installé sur l'hôte.

**Conception :** [`docs/carte-mere.md`](../carte-mere.md), §6.

**Plans suivants :** 2/3 le module pur du plan de carte, 3/3 le rendu et les interactions. Ils
dépendent de celui-ci.

## Contraintes globales

- Documentation et messages d'erreur **en français** ; identifiants de code **en anglais**.
- ⛔ **Un test ne nomme jamais une entité de `content/`** : les tests passent par les fixtures
  (`tests/fixtures/builders/frontmatter.ts`).
- Les identifiants de tâche sont stables et jamais réutilisés ; la feuille de route se met à jour
  au fil du travail.
- Une seule copie de chaque chiffre ; après une modification, chercher l'identifiant modifié.
- Pas de `make perf-baseline` ni de mesure lourde en local (deux plantages de l'hôte le 2026-10-29).
- Commits locaux pendant 9 h-12 h 30 et 14 h-17 h 30 (heure de Paris), **demander avant de
  pousser** ; hors de ces heures, pousser et ouvrir la PR sans demander. La fusion se demande
  toujours. Avant chaque PR : /code-review → /security-review → /simplify.

## Points de vigilance (non couverts ailleurs)

1. **Deux projets `primary` dans deux locales différentes** : le contrôle est **par locale** ; un
   projet principal en `fr` et un autre en `en` ne sont pas une erreur de ce gate, mais la parité
   fr/en des fiches l'est déjà (vérifier qu'elle couvre les nouvelles fiches). → Tâche 2, test
   « deux principaux dans une même locale seulement ».
2. **Un rattachement vers une expérience qui n'existe que dans l'autre locale** : il doit être
   refusé dans la locale où il manque, comme une technologie inconnue. → Tâche 2.
3. **Un dossier d'expériences illisible** : le contrôle des rattachements ne doit pas inventer une
   erreur par projet (même règle que `skillsAreComplete`). → Tâche 2.
4. **Le slug d'un projet égal à celui d'une expérience** (`augure`, `askor`) : rien ne doit le
   refuser — les routes diffèrent. → Tâche 3, `make check-content` vert avec les nouvelles fiches.
5. **`primary: true` sur un projet non mis en avant** : autorisé, les deux drapeaux sont
   indépendants. → Tâche 1.

---

### Tâche 1 : les deux champs du schéma de projet (P8-13a)

**Fichiers :**
- Modifier : `src/content/schemas/project.ts` (objet `projectFrontmatterSchema`)
- Test : `tests/unit/content/schemas.test.ts` (bloc `describe('schéma de projet')`)

**Interfaces :**
- Produit : sur `Project` (dérivé du schéma, `src/content/types.ts`) — `primary: boolean`
  (défaut `false`) et `experience?: string` (un slug d'expérience).

- [ ] **Étape 1 : écrire les tests qui échouent**

```ts
it('considère un projet non marqué comme non principal', () => {
  expect(projectFrontmatterSchema.parse(makeProjectFrontmatter()).primary).toBe(false)
})
it('accepte un projet principal qui n’est pas mis en avant', () => {
  const r = projectFrontmatterSchema.parse(makeProjectFrontmatter({ primary: true, featured: false }))
  expect([r.primary, r.featured]).toEqual([true, false])
})
it('accepte un rattachement à une expérience', () => {
  expect(projectFrontmatterSchema.parse(makeProjectFrontmatter({ experience: 'evea' })).experience).toBe('evea')
})
it('rejette un rattachement qui n’est pas un slug, en désignant le champ', () => {
  expect(failurePaths(projectFrontmatterSchema.safeParse(makeProjectFrontmatter({ experience: 'Evea Conseil' })))).toEqual(['experience'])
})
it('rejette un principal qui n’est pas un booléen, en désignant le champ', () => {
  expect(failurePaths(projectFrontmatterSchema.safeParse(makeProjectFrontmatter({ primary: 'oui' })))).toEqual(['primary'])
})
```

- [ ] **Étape 2 : vérifier l'échec** — `make test` ; attendu : les cinq tests rouges (clé inconnue
  refusée par `strictObject`).
- [ ] **Étape 3 : ajouter les champs** — `primary: z.boolean().default(false)` et
  `experience: slugSchema.optional()`, chacun avec un commentaire qui dit son rôle (la carte mère,
  `docs/carte-mere.md` §6) et, pour `primary`, qu'il est **indépendant** de `featured`.
- [ ] **Étape 4 : vérifier** — `make test` et `make typecheck` verts.
- [ ] **Étape 5 : commit** — `feat(contenu) : projet principal et rattachement à une expérience (P8-13a)`

### Tâche 2 : les deux contrôles d'intégrité (P8-13b)

**Fichiers :**
- Modifier : `src/content/integrity.ts`
- Modifier : `scripts/check-content.mts` (boucle de `checkLocale`, après le contrôle des technologies)
- Test : `tests/unit/content/integrity.test.ts`

**Interfaces :**
- Consomme : `Project.primary`, `Project.experience` (tâche 1).
- Produit :
  - `findUnknownExperiences(references: readonly ExperienceReference[], knownExperienceSlugs: ReadonlySet<string>): readonly UnknownExperience[]`
    avec `ExperienceReference = { file: string; experience: string }` et
    `UnknownExperience = { file: string; experience: string }` ;
  - `describeUnknownExperience(problem: UnknownExperience): string` ;
  - `findPrimaryConflict(primaryFiles: readonly string[]): string | null` — `null` pour 0 ou 1
    fichier, sinon le message qui **nomme tous** les fichiers en cause.

- [ ] **Étape 1 : écrire les tests qui échouent**

```ts
describe('rattachement à une expérience', () => {
  it('ne signale rien quand l’expérience existe', () => {
    expect(findUnknownExperiences([{ file: 'p.mdx', experience: 'evea' }], new Set(['evea']))).toEqual([])
  })
  it('signale une expérience inconnue, en nommant le fichier', () => {
    expect(findUnknownExperiences([{ file: 'p.mdx', experience: 'evae' }], new Set(['evea'])))
      .toEqual([{ file: 'p.mdx', experience: 'evae' }])
  })
  it('décrit la faute avec le slug cité', () => {
    expect(describeUnknownExperience({ file: 'p.mdx', experience: 'evae' })).toContain('« evae »')
  })
})
describe('projet principal', () => {
  it('accepte zéro ou un principal', () => {
    expect(findPrimaryConflict([])).toBeNull()
    expect(findPrimaryConflict(['a.mdx'])).toBeNull()
  })
  it('refuse deux principaux et les nomme tous', () => {
    const message = findPrimaryConflict(['a.mdx', 'b.mdx'])
    expect(message).toContain('a.mdx')
    expect(message).toContain('b.mdx')
  })
})
```

- [ ] **Étape 2 : vérifier l'échec** — `make test` ; attendu : import introuvable.
- [ ] **Étape 3 : implémenter** les trois fonctions, pures, dans le style de
  `findUnknownTechnologies` (elles rendent **toutes** les fautes, pas la première).
- [ ] **Étape 4 : brancher dans `check-content.mts`** — dans `checkLocale` : collecter les slugs
  d'expérience (comme `skillSlugs`, avec un drapeau `experiencesAreComplete` posé à `false` si un
  fichier d'expérience échoue), les rattachements des projets, et les fichiers des projets
  `primary`. Après la boucle : rattachements vérifiés **seulement si** `experiencesAreComplete`
  (sinon un `console.warn` sur le modèle existant) ; conflit de principal signalé par `fail(...)`.
  Le contrôle est **par locale** (point de vigilance 1).
- [ ] **Étape 5 : vérifier le branchement par mutation** — ajouter temporairement
  `experience: inconnue` à une fiche projet locale, `make check-content` doit sortir **1** en
  nommant le fichier ; puis `primary: true` sur deux fiches de la même locale, sortie **1** ;
  retirer les deux mutations, `make check-content` vert. Ne rien commiter de la mutation.
- [ ] **Étape 6 : vérifier** — `make test`, `make typecheck`, `make lint` verts.
- [ ] **Étape 7 : commit** — `feat(contenu) : le gate vérifie rattachements et projet principal (P8-13b)`

### Tâche 3 : les fiches projet Augure et Askor (P8-13c)

⛔ **Bloquante, avec relecture humaine.** Le brouillon s'écrit ; il ne se fusionne pas avant que
l'utilisateur l'ait relu et ait donné les **dates de début exactes** (le schéma exige une date
ISO ; les fiches d'expérience ne portent que l'année).

**Fichiers :**
- Créer : `content/fr/projects/augure.mdx`, `content/en/projects/augure.mdx`
- Créer : `content/fr/projects/askor.mdx`, `content/en/projects/askor.mdx`

**Valeurs décidées** (`docs/carte-mere.md` §6) :

| | Augure | Askor |
|---|---|---|
| `primary` | `true` | absent |
| `experience` | `augure` | `askor` |
| `technologies` | exactement celles de `content/<locale>/experiences/augure.md` | exactement celles de `content/<locale>/experiences/askor.md` |
| `type` | `personal` (la société n'est pas constituée, fiche d'expérience) | `professional` |
| `featured` | à proposer dans le brouillon, l'utilisateur tranche | idem |
| `startedAt` | **date fournie par l'utilisateur** | **date fournie par l'utilisateur** |

- [ ] **Étape 1 : demander les deux dates de début** à l'utilisateur ; ne pas en inventer.
- [ ] **Étape 2 : rédiger le brouillon** des quatre fichiers. Le corps parle du **produit**, la
  fiche d'expérience parle du **poste** : ne pas recopier les `highlights`. `summary` entre 20 et
  300 caractères (il sert de meta description). Même ton que `content/fr/projects/portfolio.mdx`.
- [ ] **Étape 3 : vérifier** — `make check-content` vert (points de vigilance 4), `make test` vert.
- [ ] **Étape 4 : soumettre le brouillon** à l'utilisateur ; intégrer ses corrections.
- [ ] **Étape 5 : commit** — `content : fiches projet Augure et Askor (P8-13c)`

### Tâche 4 : décision et feuille de route (P8-13d)

**Fichiers :**
- Modifier : `docs/phase-0-questions.md` (tableau des décisions, ligne **D14** après D13)
- Modifier : `docs/roadmap.md` (Phase 8 : lignes P8-13 à P8-15 ; P8-05 et P8-08 renvoient à la carte)
- Modifier : `docs/next-session-prompt.md` (mission : la carte mère, plans 1 à 3)

- [ ] **Étape 1 : D14** — « la composition NEXUS de D11 est remplacée par la carte mère » ; ce que
  D11 garantissait est conservé (`carte-mere.md` §3) ; la scène lit désormais un extrait minimal du
  contenu (§6) ; décision de l'utilisateur, 2026-10-29 ; lien vers `docs/carte-mere.md`.
- [ ] **Étape 2 : feuille de route** — P8-13 *Contenu de la carte mère* (ce plan), P8-14 *Module pur
  du plan de carte*, P8-15 *Rendu et interactions de la carte mère* ; P8-05 et P8-08 pointent vers
  `carte-mere.md` ; P8-10 devient une contrainte de P8-15.
- [ ] **Étape 3 : vérifier** — `grep -n "D14\|P8-1[345]" docs/*.md` ne montre chaque chiffre
  qu'une fois à sa source ; `make lint` vert (Prettier sur le Markdown).
- [ ] **Étape 4 : commit** — `docs : D14 et tâches P8-13 à P8-15`
