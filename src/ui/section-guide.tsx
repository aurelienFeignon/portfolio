/**
 * Accès aux trois sections, depuis l'accueil (P4-03).
 *
 * **Il double la navigation de l'en-tête, et c'est l'intention.** Un visiteur
 * qui arrive sur l'accueil n'a pas de raison d'aller lire une barre pour savoir
 * ce que le site contient : les deux chemins mènent au même endroit, mais
 * celui-ci **dit ce que chaque section contient** au lieu de la nommer seulement.
 * C'est la différence qui justifie le composant ; sans elle, ce serait une
 * seconde barre de navigation, et les technologies d'assistance annonceraient
 * deux fois la même chose.
 *
 * Ce n'est **pas** un point de repère `navigation` : l'en-tête en porte déjà un
 * pour ces trois mêmes cibles, et un second doublerait les repères sans rien
 * ajouter. Ici, la structure est portée par les titres de niveau 2 — c'est-à-dire
 * par le plan du document, que les lecteurs d'écran parcourent aussi.
 *
 * Le lien est **dans** le titre plutôt que l'inverse : un titre placé à
 * l'intérieur d'un lien ferait du nom accessible de celui-ci la concaténation du
 * titre et de la description. Cette forme-ci garde un nom de lien court et un
 * plan de document juste.
 *
 * La carte, elle, n'est **pas** cliquable dans son ensemble : le motif qui le
 * permet rend le texte insélectionnable et déporte l'indicateur de focus. Le
 * raisonnement complet est dans `section-guide.module.css`.
 *
 * Il reçoit ses liens tout faits, comme `SiteNav` — `src/ui` ne peut pas importer
 * `src/routing` (`architecture.md` §1.2).
 */
import { type Locale } from '../i18n/locales.ts'
import { getMessages } from '../i18n/messages/index.ts'

import styles from './section-guide.module.css'
import type { SectionLink } from './site-nav'

export function SectionGuide({
  locale,
  links,
}: {
  readonly locale: Locale
  readonly links: readonly SectionLink[]
}) {
  const messages = getMessages(locale)

  /* `role="list"` : voir `bare-list.module.css`, la raison y vit une fois. */
  return (
    <ul className={styles.list} role="list">
      {links.map(({ section, href }) => (
        <li key={section} className={styles.card}>
          <h2 className={styles.title}>
            <a className={styles.link} href={href}>
              {messages.sections[section].name}
            </a>
          </h2>
          <p className={styles.description}>{messages.sections[section].description}</p>
        </li>
      ))}
    </ul>
  )
}
