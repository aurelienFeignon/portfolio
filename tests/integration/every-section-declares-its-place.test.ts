/**
 * Chaque endroit du site déclare où il se trouve (P4-02).
 *
 * **Ce que ce test garde, et qu'aucun autre ne garde.** L'en-tête n'est plus
 * rendu par le layout racine : ce sont les layouts d'endroit qui le posent, un
 * par dossier, chacun déclarant sa propre valeur (`place-layout.tsx` explique
 * pourquoi il ne peut pas en être autrement). Rien, dans le code de production,
 * ne relie cette arborescence de fichiers aux endroits qui existent.
 *
 * Une quatrième section ajoutée à `SECTIONS` recevrait donc son lien de
 * navigation, sa route et son entrée au sitemap — et, faute d'un `layout.tsx`
 * écrit à la main, **une page sans en-tête du tout**. Tous les gates resteraient
 * verts : les composants ne savent rien de l'arborescence, et le parcours E2E ne
 * visite que les sections qu'on a pensé à lui nommer.
 *
 * **L'exhaustivité est tenue par le compilateur, pas par ce fichier.** `LAYOUTS`
 * est un `Record<CurrentPlace, …>` : ajouter une section élargit `CurrentPlace`
 * — il dérive du dictionnaire d'interface — et `tsc` refuse alors le `Record`
 * incomplet, **avant** que cette suite ne démarre. Un test se contourne par un
 * `skip`, pas `tsc`.
 *
 * Ce qui reste à l'exécution est la seule chose que le typage ne voit pas : la
 * **valeur** que chaque layout transmet réellement. C'est le cas du
 * copier-coller — un layout qui compile, s'affiche, et déclare la section du
 * voisin.
 *
 * ⚠️ Ce test lit la valeur transmise, **jamais le texte source**. Une première
 * version cherchait `current="…"` par expression régulière : elle rougissait sur
 * un reflow de Prettier ou un `current={PLACE}` sans qu'il y ait de défaut, et
 * verdissait sur la même chaîne laissée dans un commentaire. Relevé en revue.
 */
import { readdir } from 'node:fs/promises'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { PlaceLayout } from '@/app/[locale]/place-layout'
import type { CurrentPlace } from '@/ui/site-header'

/** Le layout de chaque endroit — exhaustif par construction, voir l'en-tête. */
const LAYOUTS: Record<CurrentPlace, () => Promise<{ default: LayoutComponent }>> = {
  // L'accueil n'a pas de segment d'URL : son layout vit dans le groupe de
  // routes `(home)`, dont les parenthèses n'ajoutent rien à l'URL.
  home: () => import('@/app/[locale]/(home)/layout'),
  experiences: () => import('@/app/[locale]/experiences/layout'),
  projects: () => import('@/app/[locale]/projects/layout'),
  skills: () => import('@/app/[locale]/skills/layout'),
  // ⛔ Le cinquième endroit a d'abord été livré **sans layout**, donc servi sans
  // en-tête (P4-07) : c'est la panne que décrit l'en-tête de ce fichier, arrivée
  // par un chemin qu'il ne surveillait pas — la page introuvable n'est pas une
  // section. Un parcours E2E l'a trouvée. Elle est couverte ici depuis qu'elle
  // est un `CurrentPlace` : c'est l'élargissement du **type** qui a rendu cette
  // ligne obligatoire, avant même que la suite ne démarre.
  notFound: () => import('@/app/[locale]/404/layout'),
}

/**
 * Le **dossier** de chaque endroit, quand il ne porte pas son nom.
 *
 * ⭐ Une table et non deux ternaires : le nom d'un endroit et celui de son
 * dossier divergent déjà **deux fois**, et pour deux raisons différentes —
 * `(home)` est un groupe de routes, dont les parenthèses n'ajoutent aucun
 * segment d'URL ; `404` est un chiffre, que TypeScript ne peut pas porter comme
 * clé de `CurrentPlace`. Un `Record<CurrentPlace, …>` rend la table exhaustive
 * par construction : un sixième endroit ne compile pas tant qu'on n'a pas dit
 * **où** il vit.
 */
const DIRECTORY_OF = {
  home: '(home)',
  experiences: 'experiences',
  projects: 'projects',
  skills: 'skills',
  notFound: '404',
} as const satisfies Record<CurrentPlace, string>

type LayoutComponent = (props: {
  readonly params: Promise<{ locale: string }>
  readonly children: null
}) => unknown

const PLACES = Object.keys(LAYOUTS) as CurrentPlace[]

describe('déclaration de l’endroit courant', () => {
  it.each(PLACES)('le layout de « %s » déclare cet endroit, et pas un autre', async (place) => {
    const { default: Layout } = await LAYOUTS[place]()

    // Le layout n'est pas rendu : il est **appelé**. Ce qu'il renvoie est
    // l'élément `PlaceLayout` qu'il compose, dont on lit les props — donc la
    // valeur réellement transmise, quelle que soit la syntaxe qui l'a écrite.
    const element = Layout({ params: Promise.resolve({ locale: 'fr' }), children: null })

    expect(element).toMatchObject({ type: PlaceLayout, props: { current: place } })
  })

  it('couvre autant d’endroits que le site en possède', () => {
    // Sans cette ligne, un `LAYOUTS` vidé par mégarde rendrait `it.each` muet :
    // zéro cas exécuté, suite verte. C'est la panne classique d'un test piloté
    // par une collection.
    expect(PLACES.length).toBeGreaterThanOrEqual(5)
  })

  it('n’oublie aucun layout réellement présent dans l’arborescence', async () => {
    /*
     * ⛔⛔ **Le trou que P4-07 a nommé sans le fermer, et que P4-10 ferme.**
     * L'exhaustivité de `LAYOUTS` est tenue par `Record<CurrentPlace, …>`, donc
     * par le compilateur — mais **seulement dans un sens** : elle exige qu'un
     * endroit *du type* ait sa ligne. Elle ne dit rien d'un `layout.tsx` posé
     * dans l'arborescence sans que le type bouge.
     *
     * Le cas n'est pas théorique, la revue de P4-07 l'a écrit : *« si le layout
     * de la 404 avait déclaré `current="home"`, le type ne se serait jamais
     * élargi et rien n'aurait rougi »*. La page aurait alors un en-tête, et il
     * marquerait l'accueil — le `aria-current="page"` sur un lien qui mène
     * ailleurs, faute relevée en revue de P4-02.
     *
     * ⭐ Ce contrôle lit donc le **disque**, la seule source qui sache ce qui
     * existe vraiment, et le confronte à la table. Les deux sens sont désormais
     * tenus : le compilateur pour type → table, celui-ci pour disque → table.
     */
    const root = join(process.cwd(), 'src', 'app', '[locale]')
    const entries = await readdir(root, { recursive: true, withFileTypes: true })

    const onDisk = entries
      .filter((entry) => entry.isFile() && entry.name === 'layout.tsx')
      // Le layout **racine** de la locale n'est pas un endroit : il porte
      // l'enveloppe `<html>` et le pied de page, jamais l'en-tête d'un endroit.
      .filter((entry) => entry.parentPath !== root)
      .map((entry) => entry.parentPath.slice(root.length + 1))
      /*
       * ⚠️ **Un endroit est un enfant direct de `[locale]`, et rien de plus
       * profond.** Sans cette borne, un `projects/[slug]/layout.tsx` — parfaitement
       * légitime, pour envelopper les seules fiches — rendrait ce garde rouge
       * **sans qu'aucune déclaration ne puisse le satisfaire** : `DIRECTORY_OF`
       * associe un dossier à un `CurrentPlace`, et une fiche n'en est pas un.
       * Un garde qu'on ne peut pas satisfaire se contourne, il ne se répare pas.
       * Relevé en revue.
       *
       * ⛔ Ce que la borne laisse passer, et qu'il faut savoir : un layout
       * imbriqué qui rendrait `PlaceLayout` poserait un **second** en-tête sans
       * que ce garde le voie. Le contrôle qui l'attraperait est ailleurs et
       * existe déjà — les points de repère comptés sur chaque page servie, en
       * P4-10 : deux `banner` sur une fiche font rougir le parcours.
       */
      .filter((directory) => !directory.includes('/'))

    expect(onDisk.length, 'aucun layout d’endroit trouvé sur le disque').toBeGreaterThanOrEqual(5)

    const declared = new Set<string>(PLACES.map((place) => DIRECTORY_OF[place]))
    const missing = onDisk.filter((directory) => !declared.has(directory))

    expect(missing, 'des layouts existent sans être gardés par ce test').toEqual([])
  })
})
