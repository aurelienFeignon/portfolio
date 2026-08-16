/**
 * Rien de ce que sert `public/` ne doit être réécrit en 404 (P4-07).
 *
 * **La panne que ce test ferme.** Depuis que le proxy couvre tout le site, une
 * URL qu'il ne reconnaît pas est réécrite vers la page introuvable, avec un
 * statut 404. Un fichier de `public/` n'est pas une page : s'il n'est pas dans
 * le manifeste, il **disparaît**. C'est arrivé — la première version du matcher
 * énumérait ses exceptions à la main et ignorait `resume/`, ce qui a rendu les
 * deux CV inaccessibles alors qu'ils sont en ligne depuis la Phase 2.
 *
 * ⚠️ Le mode de panne est silencieux et **de la pire espèce** : la réponse est
 * une page correcte, avec le bon statut pour une adresse qui n'existe pas. Rien
 * n'échoue, rien n'est journalisé comme une erreur, et le fichier est
 * simplement introuvable.
 *
 * **Ce test confronte le disque au manifeste**, et ne nomme aucun fichier : un
 * CV renommé, une image ajoutée, un dossier créé sont couverts le jour où ils
 * arrivent. Une liste écrite ici serait la faute même qu'il existe pour
 * empêcher.
 *
 * ⚠️ Il **partage** le parcours du disque avec le générateur, au lieu d'en
 * écrire un second. Les deux copies initiales n'étaient d'ailleurs pas
 * équivalentes — l'une percent-encodait ses chemins : voir
 * `scripts/public-paths.mts`. Ce que ce test vérifie n'est pas le parcours, mais
 * la **fraîcheur** du fichier committé.
 */
import { describe, expect, it } from 'vitest'

import { publicUrlPaths } from '../../scripts/public-paths.mts'
import { PASSTHROUGH_PATHS } from '@/routing/route-manifest'

describe('ressources servies depuis public/', () => {
  it('en trouve à inspecter', async () => {
    // Un parcours qui ne trouve rien rendrait l'assertion suivante verte pour la
    // pire des raisons — la panne de `phase-2-log.md` §10.5, rejouée ici.
    expect((await publicUrlPaths()).length).toBeGreaterThan(0)
  })

  it('figurent toutes au manifeste, donc aucune ne peut être réécrite en 404', async () => {
    const passthrough = new Set(PASSTHROUGH_PATHS)
    const missing = (await publicUrlPaths()).filter((path) => !passthrough.has(path))

    expect(missing, 'régénérez le manifeste : node scripts/generate-route-manifest.mts').toEqual([])
  })
})
