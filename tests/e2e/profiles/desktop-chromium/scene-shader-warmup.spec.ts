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
 * ⭐ Le témoin lit donc l'ORDRE, que le banc rend fidèlement : chaque `linkProgram` horodaté
 * contre le passage de `data-ready` à `true`, qui ouvre la boucle de rendu (`scene-canvas.tsx`).
 */
test('chaque programme de la première image est lié avant que la scène soit prête', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const liaisons: number[] = []
    let prete: number | null = null
    Object.assign(window, { __warmup: () => ({ liaisons, prete }) })
    for (const Contexte of [WebGLRenderingContext, WebGL2RenderingContext]) {
      const lier = Contexte.prototype.linkProgram
      Contexte.prototype.linkProgram = function (programme) {
        liaisons.push(performance.now())
        lier.call(this, programme)
      }
    }
    new MutationObserver(() => {
      prete ??= document.querySelector('[data-ready="true"]') ? performance.now() : null
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
  // La première image et celles qui suivent : un programme lié en retard aurait eu le temps de l'être.
  await page.waitForTimeout(1_000)

  const { liaisons, prete } = await page.evaluate(() =>
    (window as unknown as { __warmup: () => { liaisons: number[]; prete: number } }).__warmup(),
  )
  // Contrôle positif : sans programme lié du tout, « aucun en retard » serait vrai par vacuité.
  expect(liaisons.length).toBeGreaterThan(0)
  expect(liaisons.filter((instant) => instant > prete)).toEqual([])
})
