'use client'

/**
 * Le montage de la scène — ADR-0003, points 2 et 3.
 *
 * Trois propriétés, et chacune est une exigence écrite ailleurs :
 *
 * 1. **Import dynamique, `ssr: false`.** Three.js ne doit pas entrer dans le
 *    chunk initial ; le serveur n'a rien à rendre d'un canvas.
 * 2. **Après `idle`.** Le canvas n'entre jamais dans le chemin critique du LCP :
 *    il attend que le navigateur n'ait plus rien d'utile à faire.
 * 3. **`aria-hidden`, non focusable, aucun texte.** Rien n'y est écrit qui
 *    n'existe pas dans le DOM.
 *
 * ⭐ `data-scene-root` n'est pas décoratif : le banc E2E doit pouvoir désigner
 * CETTE couche et aucune autre. Un sélecteur `[aria-hidden="true"]` en attrape
 * d'autres dans la page — mesuré, il a fait passer au vert un contrôle qui ne
 * regardait pas la scène.
 *
 * ⛔ Et une quatrième propriété, qui ne se voit qu'à l'usage : au palier `none`, **rien
 * n'est importé du tout**. Ni canvas, ni contexte, ni octet de three. C'est la
 * décision de `shouldMountScene`, prise dans `capability/` pour être éprouvée
 * par assertion — ce fichier-ci est hors couverture, tenu par le banc E2E.
 */
import dynamic from 'next/dynamic'
import { usePathname, useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'

import { resetFocusToDocumentStart } from '@/routing/focus-reset'
import { homePath, localeFromPathname, parsePagePath } from '@/routing/paths'
import type { Section } from '@/routing/sections'

import { readCapability } from '@/scene/capability/adapter'
import {
  SCENE_WAITING,
  type SceneFailure,
  type SceneMountState,
  sceneFailed,
  sceneReady,
} from '@/scene/capability/mount-state'
import { resolveCapability, shouldMountScene } from '@/scene/capability/resolve'
import { tierMark } from '@/scene/capability/tier-mark'
import type { Rect } from '@/scene/state/camera-motion'
import { shouldShowDiagnostics } from '@/scene/state/debug-flag'
import { getRouteForScreen, resolveSceneState } from '@/scene/state/scene-state'
import type { SceneReadings } from '@/scene/state/diagnostics'

import { SceneBoundary } from './scene-boundary'
import styles from './scene-mount.module.css'

const SceneCanvas = dynamic(() => import('./scene-canvas'), { ssr: false })

/*
 * ⭐ Le panneau de diagnostic est chargé **à la demande** (P5-08). Sans
 * `?debug=scene`, ces deux imports ne sont jamais résolus : un visiteur ordinaire
 * ne paie pas un octet pour un outil qui ne s'adresse qu'à l'auteur du site.
 */
const DiagnosticsPanel = dynamic(
  () => import('./scene-diagnostics').then((module) => module.DiagnosticsPanel),
  { ssr: false },
)
const DiagnosticsProbe = dynamic(
  () => import('./scene-diagnostics').then((module) => module.DiagnosticsProbe),
  { ssr: false },
)

/**
 * `requestIdleCallback` n'existe pas sur Safari avant la version 18.2. Le repli
 * n'est pas cosmétique : sans lui, la scène ne se monterait **jamais** sur ces
 * navigateurs, et rien ne le dirait — la page resterait simplement documentaire.
 *
 * ⛔ **Le repli attend aussi longtemps que l'échéance de `requestIdleCallback`,
 * et pas moins.** Une première écriture le posait à 200 ms : dix fois plus tôt,
 * sans le moindre signal d'inactivité, et précisément sur les navigateurs et les
 * appareils les plus lents — c'est-à-dire ceux dont la fenêtre de LCP est la plus
 * longue. Un repli plus pressé que ce qu'il remplace n'est pas un repli.
 */
const ECHEANCE_MS = 2_000

function auRepos(callback: () => void): () => void {
  if (typeof window.requestIdleCallback === 'function') {
    const id = window.requestIdleCallback(callback, { timeout: ECHEANCE_MS })
    return () => window.cancelIdleCallback(id)
  }
  const id = window.setTimeout(callback, ECHEANCE_MS)
  return () => window.clearTimeout(id)
}

/**
 * La zone de l'écran que le panneau de lecture laisse à la scène — lue dans le
 * DOM, jamais recopiée de la feuille de style : un panneau élargi en CSS déplace
 * le cadrage sans qu'aucun nombre soit à tenir à jour ici.
 *
 * - panneau **fixe** (ordinateur) : tout ce qui est à sa droite, sous l'en-tête ;
 * - panneau **dans le flux** (mobile) : la bande entre l'en-tête et son bord haut.
 */
function zoneLibre(): Rect | null {
  const panneau = document.querySelector<HTMLElement>('[data-reading-panel]')
  if (panneau === null) return null
  const entete = document.querySelector('header')?.getBoundingClientRect().height ?? 0
  const cadre = panneau.getBoundingClientRect()
  if (getComputedStyle(panneau).position === 'fixed') {
    return {
      x: cadre.right,
      y: entete,
      width: window.innerWidth - cadre.right,
      height: window.innerHeight - entete,
    }
  }
  const haut = cadre.top + window.scrollY
  return { x: 0, y: entete, width: window.innerWidth, height: Math.max(0, haut - entete) }
}

/**
 * Un clic sur un lien du site, à transformer en navigation **client** quand la
 * scène est montée — c'est ce qui donne aux liens du DOM (en-tête, panneau,
 * clavier) la même transition de caméra qu'un clic dans la scène.
 *
 * ⛔ Seuls les clics ordinaires sur une page **servie** du même site : un clic
 * du milieu, avec modificateur, vers une autre origine ou un fichier, garde son
 * comportement natif. Et sans scène, rien n'est intercepté — le balisage reste
 * un `<a>` qui marche sans JavaScript (`site-nav.tsx`).
 */
function lienInterne(event: MouseEvent): string | null {
  if (event.defaultPrevented || event.button !== 0) return null
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return null
  const lien = (event.target as Element | null)?.closest?.('a[href]')
  if (!(lien instanceof HTMLAnchorElement) || lien.target || lien.hasAttribute('download'))
    return null
  const url = new URL(lien.href)
  if (url.origin !== window.location.origin || url.hash !== '') return null
  return parsePagePath(url.pathname) === null ? null : url.pathname
}

export function SceneMount({ labels }: { readonly labels: Readonly<Record<Section, string>> }) {
  const [etat, setEtat] = useState<SceneMountState>(SCENE_WAITING)
  const [diagnostics, setDiagnostics] = useState(false)
  const [releves, setReleves] = useState<SceneReadings | null>(null)
  // Le survol est rattaché au chemin où il a eu lieu : il ne survit pas à une navigation.
  const [survolAt, setSurvolAt] = useState<{ section: Section; chemin: string } | null>(null)
  const [libre, setLibre] = useState<Rect | null>(null)

  /*
   * ⭐ **La route est la seule source de vérité** (ADR-0002) : l'état de scène
   * est DÉRIVÉ du chemin à chaque rendu, jamais détenu. Un clic dans la scène
   * ne change pas la caméra — il change l'URL, et la caméra suit.
   */
  const chemin = usePathname()
  const routeur = useRouter()
  const scene = resolveSceneState(chemin)
  const locale = localeFromPathname(chemin)
  const monte = etat.phase === 'mounted'
  const survol = survolAt !== null && survolAt.chemin === chemin ? survolAt.section : null
  const survoler = useCallback(
    (section: Section | null) => setSurvolAt(section === null ? null : { section, chemin }),
    [chemin],
  )
  // Une fiche se lit sans scène : elle reste montée, cachée, et ne calcule rien.
  const visible = scene.detail === null

  const choisir = useCallback(
    (section: Section) => {
      if (locale !== null) routeur.push(getRouteForScreen(section, locale))
    },
    [locale, routeur],
  )

  /*
   * ⭐ La bascule est **une seule fonction pour les trois causes**, parce que le
   * palier d'arrivée est le même (ADR-0003 point 5). Ce qui diffère est
   * l'endroit où la défaillance se voit : la frontière d'erreur pour ce qui
   * jette au rendu, un écouteur du DOM pour la perte de contexte.
   */
  const abandonner = useCallback((cause: SceneFailure) => {
    setEtat((precedent) => sceneFailed(precedent, cause))
  }, [])

  const surPerteDeContexte = useCallback(() => {
    abandonner('context-lost')
  }, [abandonner])

  useEffect(
    () =>
      /*
       * ⛔⛔ **La LECTURE elle-même attend, pas seulement le montage.** Une
       * première écriture appelait `readCapability` tout de suite et ne différait
       * que le `setState` — or cette lecture **crée un vrai contexte WebGL** et le
       * relâche, ce qui coûte des dizaines de millisecondes d'initialisation
       * pilote sur un appareil modeste, en pleine hydratation. Elle le faisait
       * même pour qui a demandé `save-data` et ne verra jamais la scène : les deux
       * promesses de cette tâche — « jamais dans le chemin critique » et « le
       * palier `none` ne paie rien » — n'étaient donc vraies qu'à moitié.
       */
      auRepos(() => {
        const lu = resolveCapability(readCapability(window))
        // ⭐ Posé à TOUS les paliers, `none` compris : c'est ce qui permet à une
        // mesure de dire quelle scène elle a vue (`tier-mark.ts`).
        performance.mark(tierMark(lu.tier))
        if (shouldMountScene(lu)) setEtat((precedent) => sceneReady(precedent, lu))
        /*
         * ⭐ L'URL est lue ici, à la main, et non par `useSearchParams` : ce hook
         * force une frontière de suspense au prérendu, et **toutes** les pages de
         * ce site sont statiques — un gate le vérifie. Un panneau de debug n'a
         * pas à peser sur le mode de rendu du site entier.
         */
        setDiagnostics(shouldShowDiagnostics(window.location.search))
      }),
    [],
  )

  // La zone libre se remesure à chaque route et à chaque redimensionnement.
  useEffect(() => {
    if (!monte) return
    const mesurer = () => setLibre(zoneLibre())
    const image = requestAnimationFrame(mesurer)
    window.addEventListener('resize', mesurer)
    return () => {
      cancelAnimationFrame(image)
      window.removeEventListener('resize', mesurer)
    }
  }, [monte, chemin])

  /*
   * Chaque changement de chemin est une navigation client — un chargement ne
   * rend pas ce composant une seconde fois —, et elle repart du début comme un
   * chargement (P7-05, `focus-reset.ts`). Pas de garde sur `monte` : un retour
   * arrière reste une navigation client même après la chute de la scène.
   */
  const cheminPrecedent = useRef(chemin)
  useEffect(() => {
    if (cheminPrecedent.current === chemin) return
    cheminPrecedent.current = chemin
    resetFocusToDocumentStart(document)
  }, [chemin])

  // Les liens du DOM empruntent la même transition qu'un clic dans la scène.
  useEffect(() => {
    if (!monte) return
    const intercepter = (event: MouseEvent) => {
      const cible = lienInterne(event)
      if (cible === null) return
      event.preventDefault()
      // ⛔ Vers la page affichée, le chemin ne change pas et l'effet ci-dessus ne
      // voit rien — là où, sans scène, le même clic recharge la page.
      if (cible === window.location.pathname) resetFocusToDocumentStart(document)
      routeur.push(cible)
    }
    document.addEventListener('click', intercepter)
    return () => document.removeEventListener('click', intercepter)
  }, [monte, routeur])

  // Échap ramène à la vue d'ensemble — une navigation comme une autre.
  useEffect(() => {
    if (!monte || locale === null || scene.focus === 'overview') return
    const echap = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return
      const actif = document.activeElement
      if (actif instanceof HTMLInputElement || actif instanceof HTMLTextAreaElement) return
      routeur.push(homePath(locale))
    }
    window.addEventListener('keydown', echap)
    return () => window.removeEventListener('keydown', echap)
  }, [monte, locale, scene.focus, routeur])

  /*
   * ⛔ Une scène abandonnée disparaît **entièrement**, enveloppe comprise : c'est
   * ce que veut dire « basculer en `none` ». Laisser la couche vide en place
   * donnerait un palier `none` qui ne ressemble pas à celui d'un visiteur sans
   * WebGL — et le banc qui prouve l'absence désigne précisément cette enveloppe.
   */
  if (etat.phase !== 'mounted') return null

  return (
    <>
      <div
        aria-hidden="true"
        data-scene-root
        data-scene-visible={visible}
        className={[styles.decor, visible ? '' : styles.cachee, survol ? styles.pointe : '']
          .filter(Boolean)
          .join(' ')}
      >
        <SceneBoundary onFailure={abandonner}>
          <SceneCanvas
            capability={etat.capability}
            state={scene}
            free={libre}
            visible={visible}
            hovered={survol}
            onHover={survoler}
            onSelect={choisir}
            onContextLost={surPerteDeContexte}
            {...(diagnostics ? { probe: <DiagnosticsProbe onReadings={setReleves} /> } : {})}
          />
        </SceneBoundary>
      </div>
      {/*
       * ⭐ Le nom de l'univers survolé, HORS de `data-scene-root` : la racine de
       * scène ne contient aucun texte (ADR-0003, banc E2E). Il double un lien
       * qui existe déjà dans la navigation — d'où `aria-hidden`.
       */}
      {survol !== null && visible ? (
        <p aria-hidden="true" className={styles.etiquette}>
          {labels[survol]}
        </p>
      ) : null}
      {/*
       * ⛔ Le panneau est HORS de `data-scene-root`, et ce n'est pas un détail de
       * mise en page : un parcours E2E exige que cette racine ne contienne pas un
       * caractère de texte (ADR-0003, « rien n'y est écrit qui n'existe pas dans
       * le DOM »). L'y placer ferait rougir le banc, à juste titre.
       */}
      {diagnostics ? <DiagnosticsPanel readings={releves} /> : null}
    </>
  )
}
