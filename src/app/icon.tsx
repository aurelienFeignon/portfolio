/**
 * L'icône du site (P4-08).
 *
 * ⛔ **Elle existe d'abord pour une raison mesurée, pas décorative.** Tout
 * navigateur demande une icône à la première visite d'une origine. Sans elle,
 * cette requête traversait le proxy et recevait la **page 404 complète — 14,5 Ko
 * de HTML** au lieu d'une icône (`phase-4-log.md` §13.10). Ce n'était pas un
 * défaut du mécanisme de 404 : c'était une icône manquante.
 *
 * ⚠️ **C'est un monogramme d'attente, et il est dit comme tel.** Ce dépôt refuse
 * d'afficher une valeur d'attente comme un fait — c'est ce qui garde les niveaux
 * de compétence non publiés (D2) et ce qui a coûté une tâche entière sur la
 * précision des dates. Un logo est une **décision de marque**, et elle appartient
 * à l'auteur du site.
 *
 * Ce qui est rendu ici n'en est pas un : ce sont les **initiales de `site.name`**,
 * dans la couleur d'accent du site — une dérivation typographique de ce que
 * l'utilisateur a déjà écrit, au même titre que l'image de partage rend son nom
 * et sa description. Le jour où un vrai logo existe, il remplace ce fichier par
 * un `icon.png` dans `src/app/`, et rien d'autre ne bouge.
 *
 * Le fichier n'est pas dans `public/` : à `src/app/`, Next l'attache lui-même aux
 * métadonnées de toutes les pages, ce qu'un fichier statique ne fait pas.
 */
import { ImageResponse } from 'next/og'

import { DEFAULT_LOCALE } from '@/i18n/locales'
import { getMessages } from '@/i18n/messages'
import { BRAND } from '@/ui/brand-palette'
import { initials } from '@/ui/initials'

/** 32 px : la taille qu'un onglet affiche. Next décline le reste. */
export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

export default function Icon() {
  // Le nom est un **nom propre**, identique dans les deux langues (P4-02) :
  // l'icône est donc unique, et n'a pas de segment de locale au-dessus d'elle.
  const { site } = getMessages(DEFAULT_LOCALE)

  return new ImageResponse(
    <div
      style={{
        height: '100%',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: BRAND.accent,
        color: BRAND.background,
        fontSize: 18,
      }}
    >
      {initials(site.name)}
    </div>,
    size,
  )
}
