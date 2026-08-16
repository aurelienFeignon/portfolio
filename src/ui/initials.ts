/**
 * Les initiales d'un nom affiché — « Aurélien Feignon » → « AF » (P4-08).
 *
 * **Elle est ici, et pas dans la route qui l'emploie**, parce que c'est une
 * décision à branches : un nom d'un seul mot, un espace en trop, une casse
 * quelconque. La règle du dépôt est que toute décision sorte de la route, faute
 * de quoi l'exclusion de couverture des routes cesse d'être honnête
 * (`testing-strategy.md` §6).
 *
 * ⚠️ **Deux lettres au plus, et c'est un choix de rendu, pas une troncature de
 * données** : l'icône fait 32 px. Un nom à trois mots y rendrait trois lettres
 * illisibles.
 *
 * Le nom vient du dictionnaire, jamais d'ici : cette fonction ne connaît aucune
 * identité.
 */
export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter((word) => word !== '')
    .map((word) => word[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}
