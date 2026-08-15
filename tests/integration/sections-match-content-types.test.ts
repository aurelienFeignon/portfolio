/**
 * Les sections du routage et les types de contenu ne peuvent pas diverger.
 *
 * `src/routing` ne peut pas importer `src/content` (`architecture.md` §1.2), et
 * c'est voulu : le routage existe sans savoir lire un fichier. La contrepartie
 * est que deux listes portent les mêmes valeurs sans que le compilateur puisse le
 * constater.
 *
 * **Ce test est le seul module autorisé à importer les deux.** Sans lui, ajouter
 * un quatrième type de contenu produirait, en silence, soit une section sans
 * contenu, soit un contenu sans route — donc des pages absentes du sitemap ou des
 * routes en 404 permanent.
 *
 * Il est en `integration/` et non en `unit/` parce que ce qu'il vérifie est un
 * accord **entre deux couches**, pas le comportement de l'une d'elles.
 */
import { describe, expect, it } from 'vitest'

import { CONTENT_TYPES } from '@/content/content-type'
import { SECTIONS } from '@/routing/sections'

describe('sections ↔ types de contenu', () => {
  it('porte exactement les mêmes valeurs, dans le même ordre', () => {
    expect([...SECTIONS]).toEqual([...CONTENT_TYPES])
  })
})
