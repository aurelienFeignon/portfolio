'use client'

/**
 * La frontière d'erreur de la scène — ADR-0003 point 5, tâche P5-07.
 *
 * ⭐ **Elle n'affiche rien.** Ce n'est pas un oubli d'écran d'erreur : une scène
 * qui tombe est un décor qui manque, pas une panne du site. Le contenu
 * documentaire est complet sans elle depuis la Phase 4, et afficher quoi que ce
 * soit transformerait un enrichissement raté en incident visible — ce que
 * l'ADR interdit en toutes lettres (« aucun message anxiogène »).
 *
 * ⛔ **Une frontière d'erreur ne peut pas être écrite avec des hooks.** React
 * n'expose `getDerivedStateFromError` / `componentDidCatch` que sur une classe :
 * c'est la seule de tout le dépôt, et elle l'est par contrainte du framework.
 *
 * ⛔⛔ **Elle ne voit pas tout, et c'est structurel** : une perte de contexte
 * WebGL est un événement du DOM, pas une exception de rendu. Aucune frontière ne
 * l'attrapera jamais — elle est surveillée séparément, dans `scene-canvas`.
 */
import { Component, type ReactNode } from 'react'

import type { SceneFailure } from '@/scene/capability/mount-state'

interface Props {
  readonly children: ReactNode
  readonly onFailure: (failure: SceneFailure) => void
}

interface State {
  readonly tombee: boolean
}

/**
 * Un chunk qui ne se charge pas et une scène qui jette arrivent par le même
 * chemin — le composant paresseux lève au rendu. Les distinguer sert le
 * diagnostic, jamais le comportement : les deux mènent au même palier `none`.
 *
 * ⭐ **Le critère est celui qui a été MESURÉ, et rien d'autre.** Turbopack nomme
 * l'erreur `ChunkLoadError` : le banc E2E qui refuse le chunk du moteur l'a fait
 * écrire en toutes lettres (`phase-5-log.md` §7.4). Une première écriture y
 * ajoutait trois motifs de message glanés d'autres écosystèmes — du code qu'aucun
 * banc n'atteint, pour un diagnostic qu'on ne saurait pas vérifier.
 *
 * ⚠️ Sa limite, écrite plutôt que tue : un moteur qui nommerait l'erreur
 * autrement verrait sa défaillance classée `render`. Le visiteur, lui, voit
 * exactement la même chose — la bascule est la même.
 */
function estEchecDeChargement(erreur: unknown): boolean {
  return erreur instanceof Error && erreur.name === 'ChunkLoadError'
}

export class SceneBoundary extends Component<Props, State> {
  override state: State = { tombee: false }

  static getDerivedStateFromError(): State {
    return { tombee: true }
  }

  override componentDidCatch(erreur: Error): void {
    this.props.onFailure(estEchecDeChargement(erreur) ? 'chunk' : 'render')
  }

  override render(): ReactNode {
    return this.state.tombee ? null : this.props.children
  }
}
