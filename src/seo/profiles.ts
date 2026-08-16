/**
 * Les profils publics de la personne que ce site décrit (P4-09).
 *
 * **Pourquoi ces adresses existent en un seul endroit.** Elles sont émises
 * aujourd'hui par le `sameAs` du `Person` des données structurées, et elles
 * seront demain le contenu des liens du pied de page (Q14, réponse par défaut
 * appliquée depuis la Phase 1, jamais rendue). Deux endroits qui écriraient la
 * même adresse finiraient par ne plus écrire la même : un `sameAs` qui désigne
 * un profil et un lien visible qui en désigne un autre est une contradiction que
 * rien ne signale.
 *
 * ⭐ `sameAs` est **le** signal par lequel un moteur de recherche rattache une
 * page à une identité. Une adresse fausse ne casse rien : elle rattache
 * simplement le site à quelqu'un d'autre.
 *
 * ⚠️ **Elles sont ici et non dans `content/`.** Ce ne sont pas des entités
 * éditoriales — il n'existe aucun type de contenu « personne », et en créer un
 * pour deux adresses serait un schéma, un gate et des fixtures pour une valeur
 * qui ne change jamais. Elles ne sont pas non plus dans `i18n` : une URL de
 * profil ne se traduit pas.
 *
 * ⚠️ **Elles ne sont pas dans l'environnement**, contrairement à `SITE_URL` :
 * une variable non fournie sur le VPS produirait un `sameAs` vide en production
 * et vert en local. Ce sont des faits stables, versionnés, relus en revue.
 *
 * **Déclencheur** : le jour où un troisième consommateur apparaît — un « À
 * propos » (Phase 9), une page de contact (Phase 10) —, la question d'un type de
 * contenu « personne » se rouvre pour de bon. Deux consommateurs ne la justifient
 * pas.
 *
 * Fournies par l'utilisateur le 2026-08-16. **Ne pas les deviner** : l'adresse de
 * dépôt d'un projet donne le nom de compte GitHub, jamais celle de LinkedIn, et
 * une inférence juste sur l'une aurait autorisé une inférence fausse sur l'autre.
 */

/**
 * L'ordre est stable et sans signification : il est celui du HTML servi, et deux
 * builds ne doivent pas produire deux documents différents.
 *
 * ⚠️ L'adresse LinkedIn est **percent-encodée** (`aur%C3%A9lien`) parce que
 * LinkedIn la sert ainsi. C'est la forme canonique de cette URL ; la décoder
 * produirait une seconde écriture de la même adresse, donc exactement ce que ce
 * fichier existe pour empêcher.
 */
export const PROFILE_URLS: readonly string[] = [
  'https://github.com/aurelienFeignon',
  'https://www.linkedin.com/in/aur%C3%A9lien-feignon-19a01820b/',
]
