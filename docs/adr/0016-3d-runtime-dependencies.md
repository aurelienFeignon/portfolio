# ADR-0016 — `three`, React Three Fiber et drei : trois dépendances, et une contrainte d'usage

- **Statut** : ACCEPTÉ (Phase 5, 2026-08-20)
- **Décide** : quelles bibliothèques 3D entrent au dépôt, à quelles versions, et sous quelle règle
  d'importation
- **Numéro** : 0016 et non 0011 — les numéros 0011 à 0015 sont **réservés** à des décisions déjà
  planifiées (assets 3D, animation de caméra, régression visuelle, audience, CSP), et l'une d'elles
  est nommée par la tâche P8-01 de la roadmap. Prendre un numéro réservé aurait cassé cette référence.
- **Lié à** : ADR-0003 (Three.js est un enrichissement progressif), ADR-0010, décision D9

## Contexte

ADR-0003 a tranché la **place** de la 3D — un enrichissement dont l'absence doit rester invisible —
sans nommer les bibliothèques. La Phase 5 doit les installer. Trois faits encadrent le choix, et
aucun n'est une préférence :

1. **La scène doit être décrite en React.** ADR-0002 fait du routeur la source de vérité de la
   navigation, et ADR-0004 impose une instance unique déplacée par portail. Une scène pilotée
   impérativement à côté de l'arbre React exigerait de synchroniser deux états à la main — la faute
   que ces deux ADR existent pour empêcher.
2. **Le budget est étroit et mesuré.** P5-01 a pesé les paquets *avant* de les installer : le
   plancher est **237,5 Ko gzip**, la cible **260**, le seuil bloquant **320** (D9,
   `performance-budget.md` §4.3).
3. **La compatibilité était un risque ouvert** (R-08), levé par P5-01 : installation, types sous
   TypeScript 6.0.3 et **scène réellement montée** sous React 19.2.8.

## Décision

Trois dépendances de production, **épinglées à la version exacte** — pas de `^`, conformément à la
mitigation de R-08 :

| Paquet | Version | Rôle |
|---|---|---|
| `three` | 0.185.1 | le moteur ; tout le reste en dépend |
| `@react-three/fiber` | 9.7.0 | le réconciliateur React → `three` : la scène devient un arbre React |
| `@react-three/drei` | 10.7.8 | des composants prêts à l'emploi, pris **un par un** |

Plus `@types/three` 0.185.4 en développement.

⛔⛔ **`drei` s'importe par composant nommé, jamais en entier.** Ce n'est pas une préférence de style,
c'est le budget de la phase :

| Import | gzip |
|---|---|
| R3F + `three`, sans `drei` | 237,5 Ko |
| + `drei`, **un** composant | 238,4 Ko |
| + `drei`, **quatre** composants | 303,7 Ko |
| + `drei` **entier** (`import * as` / `export *`) | **802,8 Ko** — 2,5 × le seuil bloquant |

Un garde ESLint refuse l'import global (`import * as … from '@react-three/drei'` et
`export * from …`). ⚠️ **Il ne couvre que le cas catastrophique** : quatre composants nommés suffisent
à consommer 80 % du seuil, et aucune règle de lint ne pèse des octets. La mesure du chunk réel est
**P5-04 et P5-09**, quand un chunk existera.

## Alternatives considérées

**`three` seul, sans React Three Fiber.** Le plus léger — 184,2 Ko, soit 53 Ko de moins. Rejeté :
la scène devrait être pilotée impérativement à côté de l'arbre React, avec un état à synchroniser à
la main sur chaque changement de route. ADR-0002 et ADR-0004 posent l'inverse, et 53 Ko ne payent pas
une classe de bugs de synchronisation.

**R3F sans `drei`.** Tenable — `drei` n'est pas structurant, chacun de ses composants est
remplaçable par du code propre. Retenu comme **repli désigné** : si le budget se tend en Phase 8,
`drei` est le premier à sortir, composant par composant, sans toucher au reste. Il entre malgré tout
parce que ses composants coûtent **0,9 Ko l'unité** et évitent d'écrire des utilitaires de caméra et
de centrage que tout le monde écrit mal la première fois.

**Une bibliothèque de plus haut niveau (`react-three-next`, un moteur clé en main).** Rejeté sans
mesure : ADR-0003 exige que la 3D soit *retirable sans conséquence*. Un cadre qui structure
l'application autour de la scène inverse exactement cette relation.

## Conséquences

- **La politique de montée de version du dépôt change de nature.** R3F 9.7.0 exige
  `react >=19 <19.3` ; nous sommes en 19.2.8, qui est la dernière publiée — le plafond ne mord pas
  aujourd'hui, mais **monter React en 19.3 deviendra un choix contre R3F**, plus une montée de
  routine. À vérifier à chaque campagne de mise à jour.
- **Un avertissement traverse déjà la console** : R3F 9.7.0 emploie `THREE.Clock`, que `three` 0.185
  déprécie. Sans conséquence fonctionnelle ; *déclencheur de réexamen* : le jour où `three` la
  retire, R3F doit avoir suivi.
- **Installer ne coûte rien tant que rien n'importe.** Mesuré : socle partagé **126,4 Ko** et
  **8,2 Ko** par route, identiques avant et après l'installation. Le coût apparaîtra à P5-04, au
  montage du canvas, et c'est là qu'il sera mesuré.
- `src/content/**` reste interdit d'accès à `three` et `@react-three/*` (CT-09) : cette règle
  existait avant les paquets, elle est maintenant vérifiable pour de bon.

## Ce que cet ADR ne décide pas

Ni le **moment** du montage, ni le découpage des chunks, ni le palier de capacité : ADR-0003 les a
tranchés, P5-03 et P5-04 les appliquent. Ici, il n'est question que de ce qui entre au `package.json`.
