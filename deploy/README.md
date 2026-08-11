# Déploiement

Ce dossier porte la configuration d'exécution sur le VPS (ADR-0008).

| Fichier | Rôle | Tâche |
|---|---|---|
| [`Caddyfile`](./Caddyfile) | Pile « edge » : TLS automatique, en-têtes de sécurité, cache des assets immuables | P1-13 |

**La procédure de provisionnement, de déploiement, de rollback et de consultation des journaux est
la tâche P1-15**, actuellement `BLOCKED` : le VPS n'est pas commandé. Elle sera écrite ici même,
et elle n'est volontairement pas rédigée à l'avance — une procédure d'exploitation non exécutée est
une fiction.

## Ce qui est déjà vérifié

- L'image de production (étage `runner`) se construit, démarre en **non-root**, répond au
  healthcheck et sert le site — vérifié localement via `make build`, `make prod-up`.
- La suite E2E passe **contre cette image**, pas seulement contre le serveur de développement
  (`make e2e-prod`).
- Le `Caddyfile` est validé syntaxiquement par Caddy lui-même.

## Ce qui reste à faire (P1-15)

Provisionnement (pare-feu, SSH par clé, mises à jour automatiques, Docker), réseau Docker externe
partagé, publication de l'image sur GHCR taguée par SHA, déclenchement par la CI, **rollback exécuté
au moins une fois**, fichier d'environnement en `600` hors du dépôt.
