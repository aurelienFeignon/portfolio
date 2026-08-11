// Violation VOLONTAIRE, destinée à vérifier que les gates de la CI ne sont pas
// contournables (P1-14). Cette branche n'a pas vocation à être fusionnée.
//
// Erreur commise ici, et parfaitement plausible : la couche Content renvoie du
// JSX « pour rendre service au composant qui l'appelle ». C'est exactement ce
// que l'ADR-0001 interdit — le contenu cesse d'être testable sans DOM et
// réutilisable hors rendu.
import { createElement } from 'react'

export function renderTitle(title: string) {
  return createElement('h2', null, title)
}
