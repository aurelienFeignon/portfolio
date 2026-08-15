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
}

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
    expect(PLACES.length).toBeGreaterThanOrEqual(4)
  })
})
