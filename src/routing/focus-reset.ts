/**
 * Remet le focus là où le poserait un chargement de page (P7-05).
 *
 * ⛔ **Le défaut qu'il répare** : quand la scène est montée, un lien ne recharge
 * plus la page (`router.push`), et le lien activé disparaît avec le layout de
 * son endroit. Le focus tombait sur `<body>` en gardant un point de départ qui
 * dépendait de l'endroit où était ce lien : le Tab suivant sautait le lien
 * d'évitement après un lien d'en-tête, l'en-tête entier après une fiche.
 *
 * ⭐ **La règle : une navigation client se comporte comme un chargement.** C'est
 * le parcours d'un visiteur sans scène, pour qui chaque lien en est un
 * (ADR-0003) : le point de départ est le début du document — ou la cible du
 * fragment, si l'URL en porte un —, et le nom de la page est dit par
 * l'annonceur de route de Next. Le focus ne le répète pas, d'où `<body>` plutôt
 * que le `h1`.
 *
 * Même geste que SvelteKit (`reset_focus`) :
 *
 * - `tabindex` posé le temps du `focus()`, puis **rendu** tel qu'il était —
 *   `<body>` ne doit pas devenir un arrêt de tabulation, et une valeur posée par
 *   quelqu'un d'autre ne doit pas disparaître ;
 * - `focusVisible: false` : sans lui, WebKit dessine l'anneau autour de la page
 *   entière (mesuré, 2 cas sur 4) ; Chromium ne le dessine pas de toute façon ;
 * - la sélection vidée : certains moteurs partent d'elle, et non du focus, pour
 *   le Tab suivant — elle désignerait un contenu qui n'existe plus.
 */
export function resetFocusToDocumentStart(document: Document): void {
  const cible = fragmentTarget(document) ?? document.body
  const tabindex = cible.getAttribute('tabindex')

  cible.tabIndex = -1
  cible.focus({ preventScroll: true, focusVisible: false })
  if (tabindex === null) cible.removeAttribute('tabindex')
  else cible.setAttribute('tabindex', tabindex)

  document.getSelection()?.removeAllRanges()
}

function fragmentTarget(document: Document): HTMLElement | null {
  const fragment = document.location.hash.slice(1)
  return fragment === '' ? null : document.getElementById(decodeURIComponent(fragment))
}
