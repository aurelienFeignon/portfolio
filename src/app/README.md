# `src/app` — App Router

**Responsabilité** : routes, layouts, métadonnées et composition des pages ; c'est le seul endroit où la couche documentaire et la couche immersive se rencontrent.
**Peut importer** : `content`, `i18n`, `routing`, `ui`, `scene`, `seo`.

Le **layout racine est `[locale]/layout.tsx`** : il n'y a pas de `app/layout.tsx`. C'est ce qui permet à `<html lang>` de porter la langue réelle plutôt qu'une valeur en dur. `/` n'est donc pas une page mais une redirection, faite par [`src/proxy.ts`](../proxy.ts).

Les routes sont de la **composition seule** — toute décision à branches en est sortie — et sont à ce titre exclues de la mesure de couverture, les E2E les exerçant contre l'image de production (`testing-strategy.md` §6).
