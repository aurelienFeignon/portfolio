# Banc de compatibilité 3D — P5-01

Ce que ce répertoire contient : le **harnais qui a rendu les chiffres** de
`docs/performance-budget.md` §4.3 et le verdict GO de `docs/phase-5-log.md` §1.
Il n'est pas construit, pas testé par la CI, et **n'ajoute aucune dépendance au
dépôt** — c'est tout son intérêt : P5-01 devait pouvoir conclure NO-GO sans
laisser de trace à défaire.

⭐ **Il est ici parce qu'un chiffre qui fixe un budget de phase doit pouvoir être
recontrôlé.** La première mesure était fausse — deux entrées non comparables,
`export *` d'un côté et cinq symboles nommés de l'autre, d'où un « sur-ensemble
plus léger que son sous-ensemble ». Elle a été trouvée en revue, sur la seule
lecture du tableau. Sans le harnais, la correction aurait demandé de tout
refaire de mémoire.

⛔ Le manifeste s'appelle `manifest.json` et **non** `package.json` : à la racine
d'un dépôt qui n'est pas un monorepo, un second `package.json` est une invitation
à des résolutions surprenantes. Il est copié au moment de l'emploi.

## Rejouer

```bash
SANDBOX=$(mktemp -d)
cp tools/compat-3d/manifest.json "$SANDBOX/package.json"
cp tools/compat-3d/{tsconfig.json,scene.tsx,render.mjs,bundle.mjs} "$SANDBOX/"
docker compose run --rm --no-deps -v "$SANDBOX":/sandbox -w /sandbox web sh -c '
  pnpm install --no-frozen-lockfile   # doit finir SANS avertissement de pair
  ./node_modules/.bin/tsc --noEmit    # types, options strictes du dépôt
  node render.mjs                     # montage réel de la scène, sans WebGL
  pnpm add -D esbuild >/dev/null && node bundle.mjs   # poids gzip
'
```

Les quatre étapes sont indépendantes et se lisent dans leur sortie. Aucune n'a
besoin du dépôt autrement que pour l'image de développement.
