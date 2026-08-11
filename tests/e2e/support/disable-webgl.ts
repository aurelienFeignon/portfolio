/**
 * Neutralisation de WebGL, injectée **avant** tout script de la page.
 *
 * On intercepte `getContext` plutôt que de désactiver le GPU par un drapeau de
 * lancement : un drapeau laisse souvent SwiftShader répondre, et le test
 * prouverait alors le contraire de ce qu'il prétend.
 *
 * Cette fonction est sérialisée puis exécutée dans le navigateur : elle ne peut
 * capturer aucune variable de l'extérieur.
 */
export function disableWebGL(): void {
  const original = HTMLCanvasElement.prototype.getContext

  // `getContext` a cinq surcharges ; réécrire leur intersection ici n'apporterait
  // rien. On type l'implémentation simplement et on rétablit la signature
  // d'origine par une assertion unique, plutôt que de parsemer des `any`.
  const patched = function (
    this: HTMLCanvasElement,
    contextId: string,
    options?: unknown,
  ): RenderingContext | OffscreenRenderingContext | null {
    if (contextId === 'webgl' || contextId === 'webgl2' || contextId === 'experimental-webgl') {
      return null
    }
    return Reflect.apply(original, this, options === undefined ? [contextId] : [contextId, options])
  }

  HTMLCanvasElement.prototype.getContext = patched as typeof HTMLCanvasElement.prototype.getContext

  Object.defineProperty(window, 'WebGLRenderingContext', { value: undefined })
  Object.defineProperty(window, 'WebGL2RenderingContext', { value: undefined })
}
