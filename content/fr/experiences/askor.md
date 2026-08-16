---
slug: askor
company: EVEA Conseil
role: Développeur Full-Stack
location: Tours
startedAt: '2021'
technologies:
  - symfony
  - api-platform
  - python
  - react
  - zustand
  - react-flow
  - mercure
  - mysql
  - highcharts
  - microservices
highlights:
  - Conception d'une bibliothèque de composants et de workflows dynamiques complexes.
  - Modélisation interactive avec React Flow et gestion d'état avancée avec Zustand.
  - Structuration et évolution de l'API via Symfony et API Platform.
  - Moteur de calcul asynchrone bâti sur Symfony Messenger et un microservice Python, avec gestion des files de messages.
  - Flux temps réel via Mercure.
  - Module d'éco-conception dynamique, fondé sur un arbre décisionnel pondéré.
  - "Optimisation et factorisation d'une analyse de cycle de vie multi-sectorielle : refactoring et chargement différé des services."
  - Versionnage des facteurs d'émission et persistance des résultats.
---

Askor est un logiciel d'analyse de cycle de vie et d'éco-conception, développé chez
EVEA Conseil.

Le cœur du produit est un **moteur de calcul** : une analyse de cycle de vie multi-sectorielle
mobilise beaucoup de données et beaucoup de règles, et la difficulté n'est pas de la calculer une
fois mais de la recalculer vite quand un paramètre change. D'où le passage en calcul asynchrone —
Symfony Messenger devant un microservice Python — et le chargement différé des services, qui a
divisé le travail inutile à chaque évaluation.

Le second point structurant est le **versionnage des facteurs d'émission**. Un résultat d'analyse
n'a de sens qu'accompagné des facteurs qui l'ont produit : les faire évoluer sans versionner
rendrait incomparables deux analyses menées à six mois d'intervalle.
