/**
 * « Rien à afficher dans cette langue pour le moment. » (P4-06)
 *
 * Troisième exemplaire — projets, expériences, compétences — et c'est le seuil
 * auquel ce dépôt extrait. Mais ce qui était réellement recopié n'est pas la
 * ligne de JSX : c'est le **raisonnement**, un paragraphe sur le risque R-07
 * réécrit à la main dans chacun des trois composants, et déjà formulé
 * différemment dans chacun.
 *
 * Il tient en une phrase : **une locale peut ne traduire aucune entité d'une
 * section, et ce n'est pas une erreur.** La page reste valide et le dit, plutôt
 * que d'afficher une liste sans éléments — qui ne se distingue pas d'une panne.
 *
 * ⭐ Ce qui n'est **pas** partagé, délibérément : la garde `if (items.length ===
 * 0)`. Chaque liste décide de ce qu'est « vide » pour elle ; l'avis, lui, est le
 * même. Le jour où il reçoit un style — il n'en a aucun aujourd'hui —, c'est un
 * site à modifier au lieu de trois.
 */
import { type Locale } from '../i18n/locales.ts'
import { getMessages } from '../i18n/messages/index.ts'

export function EmptyNotice({ locale }: { readonly locale: Locale }) {
  return <p>{getMessages(locale).empty}</p>
}
