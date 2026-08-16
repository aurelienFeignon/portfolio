/**
 * Compétences groupées par catégorie (P4-06).
 *
 * Quarante compétences en liste plate ne se lisent pas. Groupées, elles
 * répondent à la question qu'un lecteur se pose — « qu'est-ce qu'il sait
 * faire, et de quel ordre ? » — et le plan du document suit : un `h2` par
 * catégorie, que les lecteurs d'écran parcourent comme une table des matières.
 *
 * ⛔ **Le niveau (1 à 5) n'est pas affiché, et c'est délibéré.**
 * `content/README.md` le dit : les quarante niveaux sont « une proposition,
 * déduite de la place que chaque technologie occupe dans les expériences.
 * C'est un jugement sur toi-même : relis-les » — décision D2, ouverte. Les
 * publier reviendrait à afficher comme un fait une auto-évaluation que
 * personne n'a validée, exactement l'erreur que la précision des dates a
 * coûté une tâche entière à réparer. Ils **ordonnent** la liste, ce qui est
 * un signal doux ; ils ne l'**affirment** pas.
 *
 * Le groupement et l'ordre viennent de `src/content` (`groupByCategory`,
 * `bySkillOrder`) : une vue qui trie elle-même est un défaut. Ce composant
 * reçoit des groupes tout faits, et `src/ui` n'a pas le droit de connaître
 * `src/content` (`architecture.md` §1.2).
 *
 * L'**état vide** est traité ici, comme dans `EntityList` et `ExperienceList` :
 * une locale peut ne traduire aucune compétence (R-07), et la page doit rester
 * valide.
 */
import { type Locale } from '../i18n/locales.ts'
import { getMessages, type Messages } from '../i18n/messages/index.ts'

import chip from './chip.module.css'
import styles from './skill-list.module.css'
import { EmptyNotice } from './empty-notice'

/**
 * Le nom d'une catégorie, **tel que le dictionnaire la connaît**.
 *
 * Pas d'import du type `SkillCategory` de `src/content` : la frontière l'interdit.
 * Ce type-ci porte exactement les mêmes valeurs, et l'accord entre les deux est
 * vérifié là où il compte — au point d'appel, dans `src/app`, qui passe de
 * vraies catégories et ne compilerait pas si les deux divergeaient.
 */
export type SkillCategoryName = keyof Messages['skills']['categories']

export interface SkillGroup {
  readonly category: SkillCategoryName
  /**
   * Le `slug` accompagne le nom parce qu'il est la **clé** : deux compétences
   * peuvent partager un libellé, et React n'aurait alors rien pour les
   * distinguer — un enfant omis ou dupliqué, sans erreur.
   */
  readonly skills: readonly { readonly slug: string; readonly name: string }[]
}

export function SkillList({
  locale,
  groups,
}: {
  readonly locale: Locale
  readonly groups: readonly SkillGroup[]
}) {
  const messages = getMessages(locale)

  if (groups.length === 0) {
    return <EmptyNotice locale={locale} />
  }

  return (
    <div className={styles.groups}>
      {groups.map(({ category, skills }) => (
        <section key={category}>
          {/* `aria-labelledby` rattache la liste à son titre : un lecteur
              d'écran annonce « Outillage, liste de 3 éléments » plutôt qu'une
              liste anonyme — et c'est ce qui rend le groupe désignable par son
              nom, non par sa position. */}
          <h2 className={styles.title} id={`skills-${category}`}>
            {messages.skills.categories[category]}
          </h2>
          {/* `role="list"` : voir `bare-list.module.css`. */}
          <ul className={styles.list} role="list" aria-labelledby={`skills-${category}`}>
            {skills.map(({ slug, name }) => (
              <li key={slug} className={chip.chip}>
                {name}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
