/**
 * Le bloc de données structurées d'une page (P4-09).
 *
 * **Il ne rend rien de visible**, et c'est pourtant du rendu : ce composant est
 * la seule façon d'obtenir un `<script>` dans le document, l'API `Metadata` de
 * Next n'ayant pas de champ pour JSON-LD. Il vit donc dans `src/ui` avec les
 * autres composants, et il ne connaît **aucun** vocabulaire de schema.org — ce
 * qu'il reçoit est un objet JSON quelconque, construit par `src/seo/json-ld.ts`.
 *
 * C'est ce qui le laisse hors du graphe de dépendances (`ui → i18n` seulement) :
 * il sérialise, il ne décide pas.
 */

/**
 * ⛔⛔ **`JSON.stringify` n'échappe pas `<`, et c'est le seul risque réel de ce
 * fichier.** Un texte de contenu contenant `</script>` produirait cette séquence
 * littéralement dans le document : le parseur HTML fermerait le bloc à cet
 * endroit, et la fin du graphe — du JSON — deviendrait du texte visible sur la
 * page. Aucune erreur, aucun test rouge ailleurs.
 *
 * `<` est l'échappement **JSON** du même caractère : un consommateur relit
 * la chaîne d'origine à l'identique. Échapper `<` suffit — c'est `</script` seul
 * qui termine un élément de texte brut, et il ne peut plus se former.
 *
 * ⚠️ Ce n'est pas une barrière de sécurité, et il ne faut pas la lire comme
 * telle : `content/` est du code, écrit par le propriétaire du dépôt (MDX y
 * exécute du JavaScript, `phase-2-log.md` §6.1). C'est un mode de panne
 * silencieux, ce qui est une raison suffisante.
 */
function serialise(data: unknown): string {
  return JSON.stringify(data).replaceAll('<', '\\u003c')
}

export interface JsonLdProps {
  /**
   * Le document à émettre, ou `null` quand la page n'a rien à déclarer.
   *
   * `null` **ne rend pas de balise**. Un `<script>` vide, ou porteur d'un graphe
   * vide, annoncerait des données structurées à un moteur qui n'y trouverait
   * rien — le pire des deux mondes.
   */
  readonly data: unknown
}

export function JsonLd({ data }: JsonLdProps) {
  if (data === null || data === undefined) return null

  return (
    <script
      type="application/ld+json"
      // Le seul `dangerouslySetInnerHTML` du dépôt hors du rendu MDX. React
      // échapperait `<` en `&lt;` dans un nœud texte, ce qui produirait un JSON
      // que personne ne peut relire : un bloc de données n'est pas du HTML.
      dangerouslySetInnerHTML={{ __html: serialise(data) }}
    />
  )
}
