/**
 * Le bloc « pile technique » d'une fiche : son titre et sa liste (P4-05).
 *
 * ⚠️ **Ce qui était recopié n'est pas la liste — `TechnologyList` l'avait déjà
 * absorbée — mais l'appariement.** Les deux fiches écrivaient chacune un
 * `<h2 id="technologies">` et un `labelledBy="technologies"`, et **rien ne
 * reliait les deux chaînes** : une faute de frappe d'un côté rendait la liste
 * anonyme pour un lecteur d'écran, sans que rien n'échoue. L'`id` est désormais
 * produit ici, une fois, avec le titre qu'il désigne.
 *
 * Le libellé est lu ici (`ui → i18n` est autorisé), sur le modèle de
 * `SkillList`. Effet de bord bienvenu : la fiche d'un **projet** cesse de lire
 * `messages.experience.technologies`, une clé du dictionnaire « expérience ».
 */
import { type Locale } from '../i18n/locales.ts'
import { getMessages } from '../i18n/messages/index.ts'

import styles from './technology-section.module.css'
import { TechnologyList } from './technology-list'

const HEADING_ID = 'technologies'

export function TechnologySection({
  locale,
  labels,
}: {
  readonly locale: Locale
  readonly labels: readonly string[]
}) {
  return (
    <section>
      <h2 className={styles.heading} id={HEADING_ID}>
        {getMessages(locale).technologies}
      </h2>
      <TechnologyList labels={labels} labelledBy={HEADING_ID} />
    </section>
  )
}
