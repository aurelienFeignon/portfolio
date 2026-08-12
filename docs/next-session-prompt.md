# Prompt de reprise — session suivante

> À copier-coller tel quel dans une nouvelle session Claude Code ouverte sur
> `/home/aurel/projects/portfolio`. Mettre à jour la section « État » à chaque fin de phase.

---

```text
Tu reprends le développement de mon portfolio de développeur Full-Stack.
Répertoire de travail : /home/aurel/projects/portfolio

## Avant toute chose

Lis, dans cet ordre, et ne me demande pas de te les résumer :

1. docs/roadmap.md            ← source de vérité des tâches et des statuts, commence par « Jalons »
2. docs/vision.md             ← vision, contraintes, risques, hypothèses
3. docs/architecture.md       ← architecture, Docker, déploiement VPS
4. docs/adr/README.md         ← index des décisions + journal des révisions
5. docs/testing-strategy.md   ← ce qui est testé, comment, seuils de couverture
6. docs/performance-budget.md ← budgets chiffrés
7. docs/phase-0-questions.md  ← ce qui est tranché et ce qui reste ouvert
8. docs/phase-1-log.md        ← journal de la Phase 1 : mesures, dérives, dette tracée
9. docs/phase-2-log.md        ← journal de la Phase 2 : ce que l'exécution a renversé, dette tracée
10. deploy/README.md          ← exploitation réelle du serveur : déploiement, rollback, journaux

Les Phases 0, 1 et 2 sont TERMINÉES et validées. Ne les refais pas, ne les rediscute pas.

## État

Phases 0 et 1 : DONE. **Phase 2 : DONE (2026-08-12)** — 10 tâches sur 10, quatre critères de sortie
satisfaits, chacun vérifié par une exécution. 201 tests, 100 % de couverture sur `src/content/**`,
39 mutations appliquées au code de production et toutes tuées.
Phase 3 (Internationalisation) : à ouvrir, aucune tâche démarrée.

**P2-11 — la rédaction du contenu réel — reste à ma charge et n'est PAS faite.** `content/` porte
aujourd'hui 18 fichiers d'amorçage qui le disent en toutes lettres. Ils suffisent à développer les
Phases 3 et 4 ; ils ne doivent pas être publiés.

**Le site est EN LIGNE** sur https://aurelienfeignon.com. Ce n'est pas une maquette : chaque push
sur `main` reconstruit, teste, publie et déploie.

Ce qui existe et fonctionne, à ne pas redécouvrir :

- Squelette Next.js 16 / React 19, TypeScript strict, ESLint avec règles de cloisonnement,
  Vitest + Playwright, environnement 100 % dockerisé (`make`).
- CI GitHub Actions en cinq jobs : versions → gates → E2E contre l'image de production →
  publication GHCR taguée par SHA → déploiement SSH. `main` est protégée, gates non contournables,
  vérifié par un push direct refusé et une PR fautive vue échouer.
- VPS Hetzner CX23 (Debian 13, Nuremberg), durci : SSH par clé seule, `root` refusé, `ufw`,
  mises à jour automatiques, purge Docker hebdomadaire. La clé de déploiement de la CI est
  restreinte par `command=` et ne donne pas de shell.
- Rollback **exécuté pour de vrai** (9 s) ; `deploy.sh` revient seul au tag précédent si le
  conteneur ne devient pas sain.
- Domaine `aurelienfeignon.com` (Namecheap, expire le 2027-08-11), zone chez Cloudflare, proxy
  actif en *Full (strict)*, TLS Let's Encrypt automatique. SPF, DKIM, DMARC publiés ; domaine
  `Active` chez Mailjet. `make check-dns` vérifie tout cela sur deux résolveurs.
- L'origine n'accepte plus que les plages Cloudflare, filtrées dans `DOCKER-USER`.
- **Content Layer complet** (`src/content/`) : schémas Zod stricts, lecture du disque, validation,
  dépôt typé, tris et dérivations, cohérence référentielle. `make check-content` valide tout
  `content/` et **casse le build** ; il est déjà branché dans `pnpm build`, donc dans la CI.
- **Rendu MDX** (`src/ui/mdx/`) avec liste blanche de composants, qui refuse **avant** de rendre.
- Vocabulaire des locales dans `src/i18n/locales.ts` : `LOCALES`, `Locale`, `DEFAULT_LOCALE`,
  `isLocale`. P3-01 le **complète**, ne le recrée pas.

⚠️ Deux pièges de cette infrastructure, déjà payés une fois — voir `deploy/README.md` §1.1 et §6.3 :
`ufw` ne gouverne PAS les ports publiés par un conteneur, et le port 22 ne peut pas être restreint
à une IP tant que le déploiement part des runners GitHub.

⚠️ Trois contraintes héritées de la Phase 2, à ne pas défaire par mégarde :
`package.json` porte `"type": "module"` et les imports relatifs de `src/content/**` portent leur
extension `.ts` — c'est ce qui rend la couche exécutable par `node` seul, donc le gate de contenu
possible ; `content/` n'est PAS dans l'image de production, donc **aucune route ne doit pouvoir se
rendre à la demande** ; et la liste blanche MDX n'est **pas** une barrière de sécurité (MDX exécute
du JavaScript). Détail dans `docs/phase-2-log.md` §9.4, §10.3 et §6.1.

## Décisions déjà prises — ne pas les rejouer

ADR-0001  Markdown/MDX = source de vérité unique, Content Layer pur TS validé par Zod
ADR-0002  Le routeur Next.js est la source de vérité de la navigation ; la scène suit l'URL
ADR-0003  Three.js = enrichissement progressif, 4 paliers de capacité
ADR-0004  Contenu des écrans = DOM superposé, instance unique déplacée par portail React
ADR-0005  i18n sans bibliothèque, dictionnaires TS, contenu localisé par fichier
ADR-0006  CV : Server Action + Mailjet (API Send v3.1 via fetch natif, ZÉRO dépendance)
ADR-0007  Environnement de développement 100 % dockerisé
ADR-0008  Auto-hébergement VPS, image Docker derrière Caddy en pile « edge » autonome
ADR-0009  Compilation MDX par @mdx-js/mdx appelé directement (next-mdx-remote = repli désigné)
ADR-0010  À CRÉER en P4-01 : stratégie de style

Si une de ces décisions doit changer : signale-le, explique pourquoi, identifie les conséquences,
mets l'ADR à jour et ajoute une ligne au journal des révisions. Jamais de changement silencieux.

## Règles de travail non négociables

- Ordre d'arbitrage en cas de conflit :
  accessibilité > indexabilité > performance du contenu > richesse de la scène 3D
- Node.js N'EST PAS installé sur l'hôte, et c'est voulu (ADR-0007). Tout passe par Docker.
  Toute commande que tu proposes doit être exécutable en conteneur (`make ...`).
- Une tâche n'est DONE que si : implémentation finie, code typé, tests pertinents ajoutés et
  verts, lint vert, zéro erreur TypeScript, doc à jour, critères d'acceptation satisfaits,
  aucune dette introduite silencieusement.
- Petits incréments : une tâche → implémentation → test → validation. Jamais dix fonctionnalités
  avant de lancer les tests.
- Ne jamais supprimer ni affaiblir un test pour verdir la suite sans justification fonctionnelle.
- Les identifiants de tâches (P1-01…) sont stables et ne sont JAMAIS réutilisés. Une tâche
  abandonnée est marquée DROPPED avec sa cause.
- Aucune dépendance structurante sans justifier : problème / pourquoi adaptée / alternatives /
  pourquoi préférée. Écris-le dans un ADR si la décision est structurante.
- Mets à jour docs/roadmap.md (statuts) au fil de l'eau, pas à la fin.
- Documentation et échanges en français ; identifiants, code et noms de fichiers en anglais.

## Ta mission cette session

Ouvre la PHASE 3 — Internationalisation (tâches P3-01 à P3-09, détaillées dans roadmap.md).

Objectif : `/fr/...` et `/en/...` résolus **indépendamment**, avec des métadonnées, un `hreflang` et
un sitemap qui ne mentent jamais sur ce qui existe réellement.

Trois points de méthode propres à cette phase :

- **P3-01 est déjà à moitié fait.** `src/i18n/locales.ts` existe depuis la Phase 2, la couche
  Content en dépendant. Complète-le (négociation, repli), ne le recrée pas.
- **`getContentLocales(type, slug)` existe déjà** et rend les locales où une entité existe vraiment.
  C'est la brique de P3-07 : aucun `hreflang` ne doit pointer vers une page inexistante (R-07).
  Le contenu d'amorçage contient exprès des entités traduites et non traduites.
- **Vérifie qu'aucune route ne peut se rendre à la demande** (`dynamicParams`) : `content/` n'est
  pas dans l'image de production. C'est une dette tracée en Phase 2 (`phase-2-log.md` §9.4), et
  c'est en Phase 3 qu'elle devient réelle.

P3-06 doit aussi confirmer la contrainte `seo → i18n, routing`, posée par défaut en Phase 1 et
jamais confirmée depuis.

Avant de coder, applique la méthode de phase : objectif, décisions à prendre, tâches, tests
correspondants, critères de sortie. Puis implémente par incréments.

Ne démarre PAS la Phase 4 tant que les critères de sortie de la Phase 3 ne sont pas tous
satisfaits : `/fr/projects/augure` et `/en/projects/augure` résolus indépendamment (prouvé par
test), aucun `hreflang` vers une page inexistante, sitemap exact, couverture ≥ 95 % sur `i18n` et
`routing`.

À la fin de la phase, produis un bilan : fait / dérives / reporté.

## Contexte de planning

Objectif : portfolio documentaire EN LIGNE début septembre 2026 (tranche T1 = Phases 1 à 4 +
P4-13 à P4-16). La 3D vient après, par incréments, sur le site déjà en ligne.
Le chemin critique n'est pas technique : c'est la rédaction du contenu (P2-11), à ma charge.

## Points encore ouverts

Aucun ne bloque la Phase 3. Ils sont listés parce qu'ils se rappelleront au mauvais moment si
personne ne les écrit.

- **P2-11, la rédaction du contenu réel, est le chemin critique de T1** et n'a pas commencé. Le
  format est figé, vérifié par `make check-content`, et deux règles d'écriture sont dans
  `content/README.md` — dont celle qui a déjà mordu : une valeur contenant `: ` doit être entre
  guillemets.
- **Le runtime MDX n'est pas encore dans l'image de production** (381 Mo, inchangée) : il y entrera
  avec la première page qui rend un corps, en Phase 4, pour environ 7 Mo. Le seuil bloquant est à
  400 Mo.

- **Le jeton GHCR expire.** Un PAT `read:packages` est posé sur le VPS pour tirer l'image, qui est
  dans un paquet privé. À son expiration, `docker compose pull` échouera et les déploiements
  s'arrêteront — sans rapport apparent avec le code. Rendre le paquet public supprimerait
  définitivement ce secret et son renouvellement ; le dépôt est déjà public, l'image ne contient
  rien de plus.
- **Mesure CPU en régime stable** (P11-08) : le seul relevé date d'une minute après démarrage du
  conteneur — 32 %, au-dessus du seuil d'alerte de 25 %. Ce n'est pas une mesure valide, et ce
  n'est pas non plus un problème constaté. Le RSS, lui, est net : 38 Mo pour un budget de 250.
- **Procédure de restauration du serveur** (risque R-23) : Hetzner restreint par intermittence la
  création et le redimensionnement d'instances. Toute procédure supposant « je recrée un serveur »
  peut échouer le jour où elle sert. À écrire sous cette contrainte en Phase 15.
- **Plages Cloudflare** : un timer hebdomadaire les rafraîchit sur le VPS. En cas de doute,
  `sudo /srv/edge/sync-cloudflare-origin-firewall.sh --check` sort en 1 s'il y a dérive.
- Questions Q3 à Q6 et Q8 à Q19 de docs/phase-0-questions.md : applique la recommandation par
  défaut et signale-le, ne me bloque pas dessus.

Si quelque chose est ambigu : propose une solution argumentée et marque explicitement
l'hypothèse. Ne construis jamais une architecture cachée.
```

---

## Entretien de ce fichier

À la fin de chaque phase, mettre à jour dans le bloc ci-dessus :

- la section **État** (phase terminée, phase suivante, tâches en cours) ;
- la liste des **ADR** si de nouveaux ont été créés ;
- la section **Ta mission cette session** ;
- les **points encore ouverts**.

Le reste est stable et n'a pas vocation à changer.
</content>
