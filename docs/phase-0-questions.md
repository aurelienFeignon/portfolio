# Questionnaire de sortie de Phase 0

> Objectif : trancher les points encore ouverts avant d'ouvrir la Phase 1.
> Dernière mise à jour : 2026-08-11

**Comment répondre vite** — chaque question a une **recommandation**. Vous pouvez répondre
« défaut partout sauf Q4, Q9, Q12 » et ne détailler que celles-là.

Priorités :

- 🔴 **Bloque la Phase 1** — sans réponse, je ne peux pas démarrer proprement.
- 🟠 **Nécessaire avant la phase indiquée** — peut attendre, mais pas indéfiniment.
- 🟢 **Confort** — une réponse par défaut convient très bien.

Les questions déjà tranchées (Docker, VPS, Mailjet, domaine, ordre d'arbitrage) ne figurent pas
ici. Elles sont dans les ADR.

---

## Réponses enregistrées — 2026-08-11

| # | Réponse | Répercuté dans |
|---|---|---|
| **Q2** | **VPS dédié**, mais destiné à accueillir d'autres projets. → Le reverse proxy devient une **pile « edge » autonome** dès le départ, avec réseau Docker externe partagé. Caddy conservé ; déclencheur Traefik écrit (> ~5 services). | ADR-0008, `architecture.md` §7.2 |
| **Q7** | *« je ne sais pas ce qui est le mieux »* → **tranché : compte partagé + plafond bas** (20/jour global, 5/24 h par IP, 2/24 h par adresse). Sous-compte à prendre **seulement s'il est déjà inclus** dans le plan. R-20 retombe de 6 à 3. | ADR-0006, H-02b, R-20 |
| **Q20** | Pas d'échéance ferme, **objectif de mise en ligne début septembre 2026**. → Plan découpé en trois tranches, **mise en production avancée à la fin de la Phase 4** (T1). | `roadmap.md` § Jalons, P4-13 à P4-16 |
| **Q1** | *Partiellement répondu* : VPS dédié, mais existence et disponibilité non confirmées. Reste à préciser — bloque P1-15 uniquement. | — |

**Encore ouvertes** : Q1 (disponibilité du VPS), Q3 à Q6, Q8 à Q19. Toutes peuvent prendre la
valeur recommandée sans engager l'architecture.

---

## Bloc A — Infrastructure et déploiement

### Q1 🔴 — Le VPS existe-t-il déjà, ou est-il à commander ?
*Pourquoi ça compte* : conditionne P1-15 (déploiement du squelette). Si le VPS n'existe pas encore,
P1-15 passe en `BLOCKED` et devient la première tâche de la Phase 2 — c'est prévu et sans gravité,
mais je dois le savoir pour ne pas planifier à vide.

- [ ] a. Déjà en service (celui d'Augure ou un autre)
- [ ] b. À commander — hébergeur pressenti : ______
- [ ] c. Pas avant plusieurs semaines

**Recommandation** : sans objet, c'est un fait à constater.
**Réponse** : ______

---

### Q2 🔴 — Le portfolio tourne-t-il sur le **même VPS qu'Augure** ou sur un VPS dédié ?
*Pourquoi ça compte* : c'est la question la plus structurante du bloc, et elle n'était pas encore
posée. Sur un VPS partagé, il faut un **reverse proxy unique** pour les deux projets (on ne peut
pas avoir deux services sur le port 443), et les ressources sont partagées : un pic sur Augure
dégrade le portfolio, et inversement. Cela change la configuration de déploiement, pas
l'architecture applicative.

- [ ] a. Même VPS qu'Augure, Caddy mutualisé en frontal des deux
- [ ] b. VPS dédié au portfolio
- [ ] c. Même VPS, mais Augure a déjà son propre reverse proxy — à intégrer : ______

**Recommandation** : **(a)** si le VPS a de la marge (H-01a : 2 vCPU / 2 Go pour l'ensemble). Un
portfolio en pages statiques consomme très peu. Si Augure est déjà à l'étroit, alors **(b)**.
**Réponse** : ______

---

### Q3 🟠 *(Phase 11)* — CDN/proxy en frontal (Cloudflare offre gratuite) ?
*Pourquoi ça compte* : compense l'origine mono-région (risque R-16). Un recruteur hors de la zone
du VPS subit sinon un TTFB dégradé, alors que les Core Web Vitals sont une exigence.

- [ ] a. Oui, dès le départ
- [ ] b. Décider en Phase 11, sur mesure réelle multi-région
- [ ] c. Non, jamais de tiers devant le site

**Recommandation** : **(b)**. Mesurer d'abord ; l'ajouter est rapide si le besoin est démontré.
**Réponse** : ______

---

### Q4 🟢 — Déploiement déclenché par la CI (SSH + `docker compose pull/up`) ?
*Pourquoi ça compte* : l'alternative est un déploiement manuel, non traçable et sujet à dérive.

- [ ] a. Oui, automatique après gates verts sur la branche principale
- [ ] b. Automatique, mais avec une approbation manuelle avant la bascule
- [ ] c. Manuel

**Recommandation** : **(a)**. Avec rollback par tag SHA, le filet est suffisant pour un portfolio.
**Réponse** : ______

---

### Q5 🟢 — Dépôt GitHub public ou privé ?
*Pourquoi ça compte* : un dépôt public est en soi un argument pour un portfolio de développeur
(on peut lire le code, les ADR, la CI). Il impose en revanche une hygiène stricte sur les secrets
et rend l'historique définitivement visible. Sans incidence sur GHCR ni sur les minutes de CI à
cette échelle.

- [ ] a. Public dès le départ
- [ ] b. Privé, publié à la release
- [ ] c. Privé définitivement

**Recommandation** : **(b)**. On garde la liberté de tâtonner pendant la construction, et le dépôt
devient un atout au lancement — l'historique montrant la démarche par phases est un bon signal.
**Réponse** : ______

---

### Q6 🟠 *(Phase 15)* — Supervision : où envoyer les alertes ?
*Pourquoi ça compte* : R-15 — sans sonde externe, une panne du VPS peut durer des jours sans que
vous le sachiez.

- [ ] a. E-mail vers `aurelien.feignon@gmail.com`
- [ ] b. Autre canal : ______
- [ ] c. Aucune alerte

**Recommandation** : **(a)**, avec une sonde externe gratuite (vérification HTTP toutes les 5 min).
**Réponse** : ______

---

## Bloc B — Messagerie et CV

### Q7 🟠 *(Phase 10)* — Sous-compte Mailjet dédié, ou compte partagé avec Augure ?
*Pourquoi ça compte* : **dernier point ouvert du risque R-20**. Le domaine dédié cloisonne la
réputation, pas le quota. Sur un compte partagé, un abus du formulaire peut épuiser le quota et
**interrompre les e-mails d'Augure en production**.

- [ ] a. Sous-compte Mailjet dédié au portfolio
- [ ] b. Compte partagé, protection par le seul plafond journalier
- [ ] c. Compte Mailjet entièrement séparé

**Recommandation** : **(a)** si le plan le permet. Sinon **(b)** avec un plafond conservateur — le
risque résiduel est acceptable pour un portfolio, à condition que le plafond soit réellement bas.
**Réponse** : ______

---

### Q8 🟠 *(Phase 10)* — Quel est le quota du plan Mailjet en vigueur ?
*Pourquoi ça compte* : le plafond journalier du portfolio doit être calibré **sous** ce quota, en
tenant compte de ce qu'Augure consomme déjà.

- Quota du plan : ______ / jour, ______ / mois
- Consommation habituelle d'Augure : ______

**Recommandation** : si le plan gratuit s'applique (~200/jour), réserver **20 envois/jour** au
portfolio. C'est très au-dessus du trafic attendu et très en dessous du seuil de nuisance.
**Réponse** : ______

---

### Q9 🟠 *(Phase 10)* — Adresse d'expédition et de réponse du CV ?
*Pourquoi ça compte* : l'expéditeur doit être aligné sur le domaine du portfolio pour que DMARC
soit satisfait (P1-17).

- Expéditeur : `______@______` (proposition : `cv@<domaine>` ou `contact@<domaine>`)
- Adresse de réponse : ______ (proposition : votre adresse personnelle, pour recevoir les retours)
- Nom affiché : ______ (proposition : votre nom complet)

**Recommandation** : expéditeur `contact@<domaine>`, réponse vers l'adresse personnelle.
**Réponse** : ______

---

### Q10 🟠 *(Phase 10)* — Le CV est-il un PDF statique, et en combien de versions ?
*Pourquoi ça compte* : détermine s'il faut une version par locale, et donc si l'envoi dépend de la
langue du visiteur.

- [ ] a. Un seul PDF, bilingue ou en français
- [ ] b. Deux PDF : `cv-fr.pdf` et `cv-en.pdf`, envoyés selon la locale
- [ ] c. PDF généré dynamiquement depuis le contenu Markdown

**Recommandation** : **(b)**. Cohérent avec un portfolio bilingue, et sans coût technique. **(c)**
est séduisant mais c'est un projet en soi — hors périmètre v1.
**Réponse** : ______

---

## Bloc C — Contenu et produit

### Q11 🟠 *(Phase 2)* — Volume réel de contenu ?
*Pourquoi ça compte* : valide H-05, qui justifie l'absence de base de données et d'index de
recherche. Au-delà de ~200 entrées, l'ADR-0001 serait à réexaminer.

- Expériences : ______ · Projets : ______ · Compétences : ______

**Recommandation** : sans objet, c'est un fait. Pour information, l'architecture est confortable
jusqu'à quelques dizaines d'entrées par type.
**Réponse** : ______

---

### Q12 🟠 *(Phase 3)* — Tout le contenu est-il traduit en anglais, ou certains éléments
restent-ils en français uniquement ?
*Pourquoi ça compte* : détermine si la règle de repli (risque R-07 : ne pas lister, ne pas
référencer en hreflang, ne pas mettre au sitemap) est un cas limite rare ou un cas courant à
soigner dans l'interface.

- [ ] a. Tout est traduit, systématiquement
- [ ] b. L'essentiel est traduit, certains projets secondaires resteront en français
- [ ] c. L'anglais viendra plus tard, on démarre en français

**Recommandation** : **(a)** pour les expériences et les compétences (volume faible, fort impact
recruteur international), **(b)** toléré pour les projets secondaires. L'architecture gère les deux
sans changement.
**Réponse** : ______

---

### Q13 🟢 *(Phase 3)* — Langue par défaut et comportement de `/` ?

- [ ] a. Français par défaut, `/` négocie via `Accept-Language` puis redirige
- [ ] b. Français toujours, sans négociation
- [ ] c. Anglais par défaut

**Recommandation** : **(a)**. Un recruteur anglophone arrive directement en anglais, sans perdre
l'ancrage français.
**Réponse** : ______

---

### Q14 🟢 — Quels liens externes et quelles pages secondaires en v1 ?

- [ ] GitHub — URL : ______
- [ ] LinkedIn — URL : ______
- [ ] Autre (Mastodon, site perso, publications…) : ______
- [ ] Page « À propos »
- [ ] Page « Contact » distincte de la demande de CV

**Recommandation** : GitHub, LinkedIn, page « À propos », et une page « Contact » qui porte le
formulaire de CV plutôt qu'une page séparée.
**Réponse** : ______

---

### Q15 🟢 — Blog en v1 ?
*Pourquoi ça compte* : H-06. Ajouter un 4e type de contenu est peu coûteux **plus tard**, mais
c'est une section de plus à concevoir, traduire et alimenter maintenant.

- [ ] a. Non, pas en v1
- [ ] b. Oui

**Recommandation** : **(a)**. Un blog vide dessert un portfolio ; il vaut mieux l'ajouter quand il
y a matière.
**Réponse** : ______

---

## Bloc D — Scène 3D

### Q16 🟠 *(Phase 8)* — D'où viennent les modèles 3D ?
*Pourquoi ça compte* : risque R-04, le plus susceptible de faire déraper le planning. La Phase 5
n'utilise que des primitives, donc la réponse peut attendre — mais pas au-delà.

- [ ] a. Je modélise moi-même (Blender)
- [ ] b. Assets sous licence permissive, adaptés
- [ ] c. Style low-poly assumé, construit avec des primitives et des matériaux soignés
- [ ] d. Assets payants

**Recommandation** : **(c)** pour la v1. Une scène low-poly cohérente et fluide vaut mieux qu'une
scène réaliste lourde et inachevée — et elle tient les budgets de performance sans effort.
**Réponse** : ______

---

### Q17 🟠 *(Phase 8)* — Y a-t-il une référence visuelle ?
*Pourquoi ça compte* : la vision décrit « mon environnement de travail ». Une photo de votre poste
réel vaut mille descriptions et rend la scène personnelle plutôt que générique.

- [ ] a. Oui, je fournirai des photos de mon poste
- [ ] b. Non, invente une ambiance cohérente — préférences : ______
- [ ] c. Références visuelles externes : ______

**Recommandation** : **(a)**. C'est l'élément qui distingue ce portfolio d'une démo Three.js.
**Réponse** : ______

---

### Q18 🟢 *(Phase 13)* — Expérience mobile de la scène ?

- [ ] a. Scène décorative non interactive, navigation par liens standards
- [ ] b. Scène interactive simplifiée
- [ ] c. Pas de scène du tout sur mobile, image statique

**Recommandation** : **(a)**. Un écran 3D de 4 cm ne se clique pas confortablement ; la scène
apporte l'ambiance, la navigation reste documentaire.
**Réponse** : ______

---

## Bloc E — Divers

### Q19 🟢 — Mesure d'audience ?

- [ ] a. Aucune en v1
- [ ] b. Solution sans cookie, auto-hébergée ou tierce
- [ ] c. Google Analytics *(implique un bandeau de consentement, donc une phase supplémentaire)*

**Recommandation** : **(a)** en v1, **(b)** ensuite si le besoin se fait sentir.
**Réponse** : ______

---

### Q20 🔴 — Y a-t-il une échéance ?
*Pourquoi ça compte* : **c'est la seule réponse qui peut modifier l'ordre des phases.** En
recherche active, on déploie le portfolio HTML complet (fin de Phase 4) et on continue la 3D
ensuite, en production. Sans échéance, on suit l'ordre nominal.

- [ ] a. Aucune échéance, projet au long cours
- [ ] b. Recherche d'emploi en cours — le site doit être en ligne avant : ______
- [ ] c. Échéance précise : ______

**Recommandation** : si **(b)** ou **(c)**, je propose de **mettre en production dès la fin de la
Phase 4** — le portfolio est alors complet, indexable et accessible — puis de livrer la 3D par
incréments sur le site déjà en ligne. C'est possible sans dette, précisément parce que l'ADR-0003
fait du documentaire le socle et de la 3D un enrichissement.
**Réponse** : ______

---

## Réponse minimale

Si vous ne répondez qu'à quatre questions, que ce soit celles-ci :

| # | Question | Effet |
|---|---|---|
| **Q1 + Q2** | VPS : existant ? partagé avec Augure ? | Débloque P1-15, fixe la configuration de déploiement |
| **Q20** | Échéance | Peut réordonner tout le plan |
| **Q7** | Sous-compte Mailjet | Ferme le dernier point du risque R-20 |

Tout le reste peut prendre la valeur recommandée : aucune de ces valeurs par défaut n'engage
l'architecture, et toutes restent réversibles à la phase concernée.
</content>
