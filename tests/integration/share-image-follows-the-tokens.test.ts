/**
 * L'image de partage n'invente aucune couleur (P4-08).
 *
 * **Pourquoi cette duplication existe et ne peut pas ne pas exister.**
 * `ImageResponse` rend hors du navigateur : pas de feuille de style, pas de
 * variables CSS, donc pas de `var(--color-accent)`. L'image doit porter les
 * valeurs en clair, et c'est le **seul** endroit du dépôt où le palette est
 * recopié — la règle 3 de l'ADR-0010 veut que tout littéral remonte en token.
 *
 * ⚠️ Le mode de panne est purement visuel et **silencieux** : le jour où un
 * token change, l'image continue de se générer, sans erreur, dans les anciennes
 * couleurs. Personne ne regarde une vignette de partage à chaque déploiement.
 *
 * Ce test ne vérifie donc pas que l'image est belle — il vérifie que chaque
 * couleur employée **existe encore dans les tokens**. C'est la seule moitié qui
 * soit automatisable, et c'est celle qui casse.
 *
 * ⛔ Il ne lisait d'abord que `opengraph-image.tsx`, alors que `icon.tsx` recopie
 * la même couleur — et son commentaire affirmait pourtant être gardé par ce
 * test. Il lit maintenant **tout `src/`**, ce qui couvre aussi
 * `src/ui/brand-palette.ts`, où les valeurs vivent désormais une seule fois.
 *
 * ⚠️ **Ce que ce test ne peut pas voir**, et qui a justifié le palette partagé :
 * ⚠️ Il ignore `src/scene/**` depuis P5-05 — la raison est écrite à l'endroit du
 * filtre : la palette d'une scène qui décrit un bureau photographié n'est pas
 * une palette d'interface, et aucun token ne peut porter le bois d'un plateau.
 *
 * il vérifie que chaque littéral **est** un token, jamais que deux fichiers
 * désignent le **même**. Deux images qui se contredisent sur l'accent le
 * laisseraient vert. C'est la duplication qu'il fallait supprimer, pas
 * surveiller. Relevé en revue.
 */
import { readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { BRAND } from '@/ui/brand-palette'

/**
 * Le token que chaque clé du palette désigne.
 *
 * ⚠️ Écrit ici et non déduit : `textMuted` s'écrit `--color-text-muted`, et une
 * conversion camelCase → kebab-case serait une **règle** là où il n'y a que
 * quatre correspondances. La table est exhaustive par construction — une
 * cinquième couleur ne compile pas tant qu'on n'a pas dit quel token elle suit.
 */
const TOKEN_OF = {
  accent: 'accent',
  background: 'background',
  text: 'text',
  textMuted: 'text-muted',
} as const satisfies Record<keyof typeof BRAND, string>

const SOURCE_DIR = join(process.cwd(), 'src')
const TOKENS = join(SOURCE_DIR, 'app', 'globals.css')

/** Les couleurs écrites en clair, quelle que soit leur casse. */
function hexColours(source: string): string[] {
  return [...source.matchAll(/#[0-9a-fA-F]{3,8}\b/g)].map(([hex]) => hex.toLowerCase())
}

/** Les couleurs écrites en clair dans les routes, avec le fichier qui les porte. */
async function colouredSources(): Promise<{ file: string; colour: string }[]> {
  const entries = await readdir(SOURCE_DIR, { recursive: true, withFileTypes: true })
  const found: { file: string; colour: string }[] = []

  for (const entry of entries) {
    if (!entry.isFile() || !/\.tsx?$/.test(entry.name)) continue

    const path = join(entry.parentPath, entry.name)
    /*
     * ⛔⛔ **`src/scene` est hors de portée, et ce n'est pas une exemption de
     * confort.** Ce garde tient une règle précise : *un rendu hors navigateur ne
     * doit pas inventer une couleur d'INTERFACE*, parce qu'un token qui change
     * laisserait l'image de partage dans l'ancienne teinte, en silence.
     *
     * La palette de la scène 3D ne relève pas de cette règle : elle décrit un
     * **objet physique** — le bois d'un plateau, le beige d'un mur, le corail
     * d'un abat-jour — relevé sur des photographies. Aucun token du site ne
     * peut l'exprimer, et l'y forcer produirait quatorze variables CSS que rien
     * dans l'interface n'emploierait. Le lien à surveiller n'existe pas : la
     * scène ne redit pas ce que dit `globals.css`, elle dit autre chose.
     *
     * ⭐ La règle du dossier de scène tient ce que ce garde tiendrait mal : le
     * mur est **assombri** de `#D9CDB8` à `#C2B49B` par rapport à la photo, et
     * cet écart est justifié par une mesure de contraste, pas par un token.
     */
    if (path.slice(SOURCE_DIR.length + 1).startsWith('scene/')) continue
    for (const colour of hexColours(await readFile(path, 'utf8'))) {
      found.push({ file: path.slice(SOURCE_DIR.length + 1), colour })
    }
  }

  return found
}

describe('palette des rendus hors navigateur', () => {
  it('en emploie, sinon ce test ne vérifie rien', async () => {
    // Un parcours qui ne trouve rien rend l'assertion suivante verte pour la
    // pire des raisons (`phase-2-log.md` §10.5).
    expect((await colouredSources()).length).toBeGreaterThan(0)
  })

  it('n’en emploie aucune qui ne soit un token', async () => {
    const declared = new Set(hexColours(await readFile(TOKENS, 'utf8')))

    const invented = (await colouredSources()).filter(({ colour }) => !declared.has(colour))

    expect(
      invented,
      'ces couleurs ne sont plus dans globals.css : un rendu a dérivé du site',
    ).toEqual([])
  })

  it('la valeur **importée** est celle des tokens, et pas seulement le texte du fichier', async () => {
    /*
     * ⭐ **Lire un fichier n'est pas l'exécuter.** Les deux contrôles ci-dessus
     * parcourent `src/` comme du **texte** : ils ne chargent aucun module, si
     * bien que `brand-palette.ts` — le seul endroit où ces valeurs vivent —
     * restait à 0 % de couverture, dette nommée en `phase-4-log.md` §13.8.
     *
     * Ce contrôle-ci **importe** le palette et confronte chaque valeur au token
     * du même nom. Il est strictement plus fort : le texte du fichier peut
     * contenir la bonne couleur dans un commentaire pendant que la constante en
     * porte une autre, et les deux premiers le laisseraient vert.
     */
    const css = await readFile(TOKENS, 'utf8')
    const tokenValue = (name: string) =>
      new RegExp(`--color-${name}\\s*:\\s*(#[0-9a-fA-F]{3,8})`).exec(css)?.[1]?.toLowerCase()

    const mismatched = Object.entries(BRAND).filter(
      ([name, value]) => tokenValue(TOKEN_OF[name as keyof typeof BRAND]) !== value.toLowerCase(),
    )

    expect(mismatched, 'le palette importé et les tokens ne disent plus la même chose').toEqual([])
  })
})
