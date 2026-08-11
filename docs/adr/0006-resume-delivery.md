# ADR-0006 — Envoi du CV : Server Action, transport Mailjet, rate limiting en mémoire

- **Statut** : ACCEPTÉ (Phase 0, 2026-08-11)
- **Révisions du transport, le 2026-08-11** :
  1. Resend (hypothèse H-02, jamais mise en œuvre) → **SMTP auto-hébergé**, pour s'aligner sur le
     projet Augure.
  2. Après vérification, Augure utilise en réalité **Mailjet** : c'est donc Mailjet qui est retenu.
     Cette seconde révision annule la première.
- **Décide** : mécanisme d'envoi du CV, transport, anti-abus, testabilité
- **Lié à** : ADR-0008 (auto-hébergement)

> Le noyau de la décision — Server Action, interfaces `ResumeSender`/`RateLimiter`, anti-abus,
> rate limiting en mémoire — **n'a pas bougé au fil de ces trois transports successifs**. C'est la
> justification de l'abstraction, vérifiée avant même la première ligne de code.

## Contexte

Un visiteur doit pouvoir demander l'envoi de mon CV à son adresse e-mail. La mission impose : pas
de backend séparé, validation stricte, limitation de fréquence, protection anti-spam, gestion des
erreurs, aucune fuite d'information, aucune persistance inutile de l'adresse, et un fournisseur
d'e-mail masqué derrière une interface métier.

Le danger principal n'est pas fonctionnel mais **sécuritaire** : un endpoint qui envoie un e-mail
à une adresse arbitraire est un relais de spam potentiel, et un moyen de harceler un tiers ou de
brûler la réputation de mon domaine d'expédition.

Élément déterminant du contexte : le projet **Augure utilise déjà Mailjet**, avec un compte, un
domaine authentifié et une intégration éprouvée. Le coût d'entrée d'un fournisseur transactionnel —
compte, authentification de domaine, DKIM, suivi des rejets — est donc **déjà payé**, et je connais
l'outil. C'est ce qui rend ce choix préférable ici, indépendamment des mérites comparés des
fournisseurs du marché.

## Décision

### Mécanisme

**Server Action** appelée par un `<form action={...}>`, et non un Route Handler appelé en `fetch`.

Raison décisive : le formulaire fonctionne **sans JavaScript**, ce qui satisfait directement
l'exigence de robustesse (§8 de la mission) et le projet de test `no-js`. Un handler `fetch`
exigerait JS pour la fonctionnalité la plus importante en termes de conversion.

### Chaîne de traitement

```text
form ▶ validation Zod ▶ honeypot + time-trap ▶ rate limit (IP, e-mail, plafond global)
     ▶ ResumeSender.sendResume(email, locale) ▶ réponse
```

### Interfaces

```ts
interface ResumeSender {
  sendResume(email: string, locale: Locale): Promise<void>
}

interface RateLimiter {
  consume(key: string, rule: RateRule): Promise<RateResult>
}
```

Implémentations : `MailjetResumeSender` (production), `FakeResumeSender` (tests, avec simulation de
panne), `ConsoleResumeSender` (développement sans identifiants).

### Transport : Mailjet, comme Augure

| Aspect | Choix |
|---|---|
| Mécanisme | **API Send v3.1 en HTTPS**, appelée avec le `fetch` natif — *pas* de SDK, *pas* de relais SMTP (voir ci-dessous) |
| Dépendance ajoutée | **Aucune** |
| Identité d'expédition | **Dédiée au portfolio** — sous-compte Mailjet si possible, sinon expéditeur et domaine propres — pour cloisonner quota et réputation vis-à-vis d'Augure (risque R-20) |
| Secrets | Clé et secret d'API, adresse d'expédition, en variables d'environnement validées au démarrage ; jamais dans le dépôt |
| Pièce jointe | PDF statique versionné, lu depuis le système de fichiers de l'image (H-03), encodé en base64 dans la requête |
| Prérequis vérifiés en P10-11 | Domaine du portfolio authentifié (SPF, DKIM), expéditeur validé, quota du plan connu (H-02a, H-02c) |
| Délai réseau | Appel sortant borné par un délai d'expiration explicite ; un dépassement est traité comme une panne de transport, pas comme une erreur utilisateur |

**Pourquoi l'API HTTP plutôt que le relais SMTP de Mailjet** — les deux sont proposés par le
fournisseur et fonctionnent. L'API est retenue parce qu'elle ne demande **aucune dépendance**
(`fetch` est natif, l'adaptateur fait quelques dizaines de lignes), qu'elle renvoie des erreurs
structurées et exploitables là où SMTP renvoie des codes à interpréter, et qu'elle se teste
trivialement en injectant `fetch`. Le relais SMTP imposerait Nodemailer — une dépendance à
justifier au titre de CT-08 pour un bénéfice nul ici.

**Pourquoi pas le SDK officiel `node-mailjet`** — il n'apporte, pour ce seul appel, qu'un habillage
de ce que fait `fetch`, au prix d'une dépendance et de son suivi de versions. Le format de la
requête Send v3.1 est stable et documenté. Décision réévaluée si l'usage de Mailjet s'étendait
au-delà de cet unique envoi.

### Anti-abus

| Mesure | Détail |
|---|---|
| Corps du message **entièrement fixe** | Rien de la saisie utilisateur n'entre dans le sujet, le corps ou la pièce jointe. Seul le destinataire varie. Supprime l'usage en relais de contenu arbitraire. |
| Rate limit par IP | Fenêtre courte, quelques envois. |
| Rate limit par adresse e-mail (hachée) | Fenêtre longue, empêche le harcèlement d'un tiers par envois répétés. |
| Plafond global journalier | Coupe le service plutôt que de laisser filer le quota partagé avec Augure. **Persisté sur disque**, donc résistant à un redémarrage. |

### Calibrage retenu (décision du 2026-08-11)

Le compte Mailjet reste **partagé avec Augure** (voir alternatives ci-dessous). La protection
repose donc entièrement sur ces valeurs, à confirmer une fois le quota du plan connu (H-02c) :

| Limite | Valeur | Raison |
|---|---|---|
| Plafond global | **20 envois / jour** | Deux ordres de grandeur au-dessus du trafic attendu, très en dessous du quota d'un plan d'entrée. Même saturé quotidiennement, le portfolio ne peut pas asphyxier Augure. |
| Par adresse IP | 3 / heure et 5 / 24 h | Absorbe une erreur de saisie ou un doute, bloque l'automatisation naïve. |
| Par adresse e-mail | 2 / 24 h | Un visiteur n'a besoin du CV qu'une fois ; la seconde couvre le message égaré. Au-delà, c'est du harcèlement d'un tiers. |

Ces valeurs sont **délibérément basses**. Un visiteur légitime ne les rencontrera jamais ; un abus
les rencontre immédiatement. En cas de saturation du plafond global, le service se coupe proprement
avec un message invitant à utiliser le téléchargement direct du PDF (P10-08) — la fonction reste
donc disponible sous une autre forme, ce qui rend la coupure acceptable.
| Honeypot | Champ masqué ; s'il est rempli, rejet silencieux (réponse de succès, aucun envoi). |
| Time-trap | Soumission en moins de ~2 s après affichage : rejet. |
| Aucune persistance de l'adresse | Seules des clés **hachées** avec expiration existent, uniquement pour le rate limit (CF-08). |
| Réponses neutres | Aucune information sur l'infrastructure, le fournisseur, ou l'historique d'une adresse. |

### Rate limiting : implémentation

**En mémoire de processus**, dans une structure à fenêtre glissante, avec une **horloge injectée**
(donc testable sans attendre).

Ce choix n'est valide que parce que l'application tourne en **instance unique et durable** sur un
VPS (ADR-0008). En serverless, il aurait été illusoire. Le plafond journalier global est persisté
sur un volume, car c'est la seule limite dont la perte au redémarrage serait exploitable.

## Alternatives considérées

| Alternative | Pourquoi écartée |
|---|---|
| **Route Handler + fetch** | Exige JavaScript pour la fonctionnalité principale de conversion. Reste possible en complément si un besoin d'API apparaît ; le métier étant isolé, l'ajout serait trivial. |
| **Service tiers de formulaire** (Formspree, Getform) | Dépendance externe, données transitant chez un tiers, personnalisation limitée, et coût récurrent — pour un besoin que Next.js couvre nativement. |
| **Autre fournisseur transactionnel** (Resend, Brevo, Postmark, SendGrid) | Tous conviendraient techniquement. Écartés parce qu'aucun n'apporte d'avantage décisif sur Mailjet **ici**, alors que Mailjet est déjà en place, déjà authentifié et déjà connu. Multiplier les comptes fournisseurs entre mes projets serait un coût sans contrepartie. |
| **SMTP auto-hébergé sur le VPS** — *décision intermédiaire, annulée* | Aurait évité tout tiers et tout quota. Annulée dès vérification : Augure ne fonctionne pas ainsi, et monter une messagerie sortante (rDNS, SPF, DKIM, DMARC, déblocage du port 25, réchauffage d'IP, suivi des rejets) est un travail d'exploitation permanent, pour un risque de délivrabilité nettement supérieur — sur la seule fonction de conversion du site. |
| **Sous-compte Mailjet dédié au portfolio** | Cloisonnerait le quota, et pas seulement la réputation — la seule solution qui ferme complètement R-20. Écarté **pour la v1** : les sous-comptes relèvent généralement des offres supérieures, et payer un plan pour isoler un formulaire qui enverra quelques CV par mois est disproportionné. **À prendre si le plan actuel les inclut déjà**, auquel cas c'est un gain gratuit. |
| **Compte Mailjet entièrement séparé** | Cloisonnement parfait, mais un second compte à gérer, un second domaine à authentifier, une seconde facture éventuelle. Réservé au cas où un abus réel se produirait. |
| **SDK `node-mailjet`** | Voir ci-dessus : dépendance sans bénéfice pour un unique appel HTTP. |
| **Relais SMTP de Mailjet + Nodemailer** | Fonctionnel, mais impose une dépendance et une gestion d'erreurs moins fine que l'API. Repli si l'API venait à poser problème. |
| **Lien de téléchargement direct, sans e-mail** | Plus simple, mais ne répond pas à la demande. Sera néanmoins proposé **en complément** : un visiteur pressé doit pouvoir télécharger le PDF sans formalité. |
| **CAPTCHA / Turnstile d'emblée** | Friction immédiate, dépendance tierce, script externe, et implications de confidentialité — pour un trafic attendu très faible. Prévu en **réponse à un abus constaté**, pas en prévention systématique. |
| **Redis pour le rate limit** | Un service à exploiter et à sauvegarder sur le VPS, pour un besoin que la mémoire d'un processus unique couvre correctement. Déclencheur de réexamen ci-dessous. |
| **Stocker les adresses** (liste de contacts) | Aucun besoin fonctionnel, et donc données personnelles à protéger sans contrepartie. Interdit par CF-08. |

## Conséquences

**Positives**

- Fonctionne sans JavaScript, donc utilisable par tout le monde.
- Testable intégralement sans envoyer un seul e-mail ; un garde-fou fait échouer la suite si une
  clé de production est présente pendant les tests.
- Changer de transport ou d'hébergeur ne touche pas le métier — **démontré trois fois avant même
  d'écrire le code**.
- **Aucune dépendance ajoutée** : l'adaptateur tient en quelques dizaines de lignes de `fetch`.
- Aucune donnée personnelle conservée de mon côté : rien à protéger, rien à purger (CF-08).
- Délivrabilité, réputation d'IP, DKIM et suivi des rejets sont à la charge du fournisseur : c'est
  le risque R-19 largement retiré de mes mains, et c'est le principal bénéfice de ce choix.
- Compte, domaine authentifié et savoir-faire déjà en place grâce à Augure : rien à apprendre,
  rien à provisionner.
- Un tableau de bord existe pour diagnostiquer un envoi qui n'arrive pas — ce qu'un serveur
  auto-hébergé n'offre qu'au prix d'une lecture de journaux.

**Négatives, assumées**

- Le rate limit se réinitialise au redémarrage du conteneur (sauf le plafond journalier).
  Exploitation possible mais peu attractive, et le plafond journalier reste le garde-fou dur.
- L'implémentation devra changer en cas de passage à plusieurs répliques : contenue derrière
  l'interface `RateLimiter`.
- Le honeypot et le time-trap arrêtent les robots simples, pas un attaquant déterminé. Le vrai
  garde-fou est le plafond global, qui borne le préjudice maximal.
- **Quota et réputation partagés avec Augure** (R-20). C'est la contrepartie la plus sérieuse, et
  elle est spécifique à la mutualisation du compte : le formulaire envoie vers des adresses
  fournies par des inconnus, donc un abus consommerait le quota d'un compte dont **un autre projet
  en production dépend**. Augure cesserait d'envoyer. D'où deux exigences : identité d'expédition
  dédiée (sous-compte de préférence), et **plafond journalier global calibré sous le quota du
  plan** — il cesse d'être un garde-fou de coût pour devenir la protection d'un service tiers.
- **Dépendance à un service externe** : une panne Mailjet rend la fonction indisponible. Traitement :
  message neutre, délai d'expiration explicite, et aucun impact sur le reste du site (le
  téléchargement direct du PDF reste disponible, P10-08).
- **L'adresse du visiteur transite chez un tiers** (R-21), contrairement à ce que permettait
  l'auto-hébergement. Atténuations : fournisseur européen, donnée minimale, aucune persistance de
  mon côté, mention dans la page de contact.
- **Contrainte de volume** : le plan impose un plafond ; le service doit se couper proprement
  plutôt que d'échouer aléatoirement une fois le quota atteint.

**Déclencheurs de réexamen**

Passage à plusieurs répliques → store partagé pour le rate limit. Abus réel constaté → ajout de
Turnstile. Usage de Mailjet dépassant cet unique envoi → réévaluer le SDK. Impossibilité d'obtenir
un cloisonnement satisfaisant vis-à-vis d'Augure → compte distinct pour le portfolio.
</content>
