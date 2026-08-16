import { expectNoBlockingAxeViolations } from '../../support/axe'
import { expect, test } from '../../support/test'

/**
 * Les compétences, groupées par catégorie (P4-06).
 *
 * Joué sur **un seul profil** : ces assertions portent sur la structure du
 * document servi, qui ne dépend d'aucun profil.
 *
 * Aucune compétence de `content/` n'est nommée — le contenu appartient à
 * l'auteur et changera. Les **catégories**, elles, sont des constantes du
 * domaine, et leurs libellés viennent du dictionnaire d'interface.
 */
/** L'ordre du domaine : du plus concret au plus transversal. Écrit une fois. */
const DOMAIN_ORDER = [
  'Langages',
  'Frameworks et bibliothèques',
  'Outillage',
  'Infrastructure',
  'Pratiques',
]

test.describe('compétences', () => {
  test('groupe les compétences dans l’ordre du domaine', async ({ page }) => {
    await page.goto('/fr/skills')

    const main = page.getByRole('main')

    // L'ordre des catégories est une décision — du plus concret au plus
    // transversal —, et c'est **l'ordre** qui est testé, pas la présence des
    // cinq. Exiger les cinq contredirait le contrat du groupement, qui n'ouvre
    // pas une catégorie vide : retirer les deux compétences « langage » du
    // contenu ferait rougir un test sur un état parfaitement valide.
    const shown = await main.getByRole('heading', { level: 2 }).allTextContents()
    expect(shown.length).toBeGreaterThan(0)
    expect(shown).toEqual(DOMAIN_ORDER.filter((label) => shown.includes(label)))
  })

  test('remplit chaque groupe, et n’y affiche aucun niveau d’auto-évaluation', async ({ page }) => {
    // Une seule traversée des listes pour deux propriétés du même DOM : « aucun
    // groupe vide » et « aucun niveau ». Deux tests en faisaient deux.
    // ⛔ Les niveaux (1 à 5) sont une **proposition** que l'auteur n'a pas relue
    // — décision D2, ouverte. Les publier afficherait comme un fait un jugement
    // que personne n'a validé.
    //
    // ⚠️ **Ce test n'est pas ce qui tient la décision, et il ne faut pas le
    // croire.** Elle est tenue par le contrat : `SkillGroup` ne porte que
    // `{ slug, name }`, et la route retire `level` à la composition — la vue ne
    // peut donc pas afficher un niveau, même par accident. Ce parcours-ci est
    // un **filet de dernier recours**, pour ce qu'on ajouterait *hors* de
    // `SkillList`, dans la page. Il n'observe qu'un symptôme parmi d'autres :
    // « ★★★ » ou « Expert » lui échapperaient. Le resserrer vaudra toujours
    // mieux que de s'y fier.
    await page.goto('/fr/skills')

    // ⚠️ Les listes sont désignées par leur **nom accessible**. `getByRole(
    // 'listitem')` sur le `main` attrapait aussi les deux entrées du sélecteur
    // de langue : le garde passait donc même avec zéro compétence rendue —
    // exactement le piège que `experiences.spec.ts` documente en tête.
    const main = page.getByRole('main')
    const labels = (
      await Promise.all(
        DOMAIN_ORDER.map((name) =>
          main.getByRole('list', { name }).getByRole('listitem').allTextContents(),
        ),
      )
    ).flat()

    expect(labels.length).toBeGreaterThan(0)
    for (const label of labels) {
      // ⚠️ Aucun chiffre : le motif précédent ne visait que « 3/5 » et « ★ », et
      // laissait passer la régression la plus simple — `{skill.name} {level}`,
      // soit « TypeScript 5 ». Cette assertion suppose qu'aucun libellé de
      // compétence ne contient de chiffre, ce qui est vrai des 80 libellés
      // actuels ; si un « HTML5 » apparaît un jour, ce garde doit être resserré,
      // pas supprimé.
      expect(label, `« ${label} » ne doit porter aucun niveau`).not.toMatch(/\d/)
    }
  })

  test('ne présente aucune violation axe', async ({ page }) => {
    await page.goto('/fr/skills')
    await expectNoBlockingAxeViolations(page, '/fr/skills')
  })
})
