import { PREMIERE_IMAGE_MS, RACINE } from '../../support/scene'
import { expect, test } from '../../support/test'

/**
 * La précompilation des shaders (`ShaderWarmup`) compile bien ce que la première image dessine.
 *
 * ⛔⛔ **Mesuré le 2026-11-02, sur le build de production** : 0 programme lié sur 11 avant que la
 * scène se déclare prête. `ShaderWarmup` était monté à côté de la carte, qui n'entre au graphe
 * qu'au rendu suivant sa construction : `compileAsync` compilait une scène vide, et la première
 * image liait les 11 programmes en synchrone — une tâche longue de 185 ms sur une RTX 5050.
 * Rien d'autre ne le voyait : la scène s'affichait, juste plus tard que prévu, et le banc n'offre
 * pas `KHR_parallel_shader_compile`, donc ne mesure pas le gain lui-même.
 *
 * ⛔⛔ **Puis, le placement corrigé** : la première image portait encore 130 ms, la PREMIÈRE
 * LECTURE de chaque programme (`onFirstUse` de three : journaux, uniforms, attributs), que three
 * ne fait qu'au premier dessin. `ShaderWarmup` la provoque désormais, un programme par tâche.
 *
 * ⭐ Le témoin lit donc l'ORDRE, que le banc rend fidèlement : chaque `linkProgram` et chaque
 * lecture des uniforms (`ACTIVE_UNIFORMS`, que seule cette première lecture demande) horodatés
 * contre le passage de `data-ready` à `true`, qui ouvre la boucle de rendu (`scene-canvas.tsx`).
 */
test('chaque programme de la première image est lié et lu avant que la scène soit prête', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const liaisons: number[] = []
    const lectures: number[] = []
    let prete: number | null = null
    Object.assign(window, { __warmup: () => ({ liaisons, lectures, prete }) })
    for (const Contexte of [WebGLRenderingContext, WebGL2RenderingContext]) {
      const lier = Contexte.prototype.linkProgram
      Contexte.prototype.linkProgram = function (programme) {
        liaisons.push(performance.now())
        lier.call(this, programme)
      }
      const parametre = Contexte.prototype.getProgramParameter
      Contexte.prototype.getProgramParameter = function (programme, nom) {
        if (nom === this.ACTIVE_UNIFORMS) lectures.push(performance.now())
        return parametre.call(this, programme, nom)
      }
    }
    new MutationObserver((_, observateur) => {
      if (!document.querySelector('[data-ready="true"]')) return
      prete = performance.now()
      observateur.disconnect()
    }).observe(document, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['data-ready'],
    })
  })

  await page.goto('/fr')
  // `data-ready` est posé sur l'enveloppe du canvas de R3F, pas sur le canvas lui-même.
  await expect(page.locator(`${RACINE} [data-ready="true"]`)).toBeAttached({
    timeout: PREMIERE_IMAGE_MS,
  })
  // Dix images après le passage : un programme lié en retard l'aurait été à la première.
  await page.evaluate(
    () =>
      new Promise<void>((fin) => {
        let images = 0
        const image = () => (++images >= 10 ? fin() : requestAnimationFrame(image))
        requestAnimationFrame(image)
      }),
  )

  const { liaisons, lectures, prete } = await page.evaluate(() =>
    (
      window as unknown as {
        __warmup: () => { liaisons: number[]; lectures: number[]; prete: number | null }
      }
    ).__warmup(),
  )
  // Un passage jamais vu compterait toutes les liaisons « en retard » (`> null` lit 0) : le dire.
  expect(prete, 'passage de data-ready à true jamais observé').not.toBeNull()
  // Contrôle positif : sans programme lié du tout, « aucun en retard » serait vrai par vacuité.
  expect(liaisons.length).toBeGreaterThan(0)
  expect(lectures.length).toBeGreaterThan(0)
  expect(
    liaisons.filter((instant) => instant > prete!),
    'liés en retard',
  ).toEqual([])
  expect(
    lectures.filter((instant) => instant > prete!),
    'lus en retard',
  ).toEqual([])
})
