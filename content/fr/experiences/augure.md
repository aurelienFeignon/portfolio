---
slug: augure
company: Augure
role: Fondateur, Product Owner et développeur
startedAt: 2025-01-01
technologies:
  - typescript
  - python
  - nodejs
  - react
  - react-flow
  - prisma
  - pydantic
  - postgresql
  - timescaledb
  - redis
  - rabbitmq
  - docker
  - traefik
  - tensorflow
  - xgboost
  - nvidia-triton
  - cuda
  - minio
  - grafana
  - cloudflare-tunnel
  - github-actions
  - microservices
  - event-driven-architecture
  - llm-integration
  - tool-calling
  - structured-outputs
  - autonomous-agents
  - time-series
  - documented-architecture
  - distributed-reliability
  - automated-testing
highlights:
  - "Assistant conversationnel agentique intégré au produit : orchestrateur de tool-calling exposant 27 outils métier au modèle, avec réponses en streaming."
  - "Abstraction multi-fournisseurs de modèles de langage : interface client unifiée avec adaptateurs Anthropic, OpenAI et Ollama auto-hébergé, clés d'API chiffrées au repos."
  - "Architecture microservices événementielle : environ trente workers spécialisés orchestrés par RabbitMQ, avec files de rebut, supervision et reprises idempotentes."
  - "Pipeline de machine learning de bout en bout : ingestion, features, entraînement TensorFlow/Keras et XGBoost, inférence GPU via NVIDIA Triton."
  - RFC d'architecture de 35 chapitres et 169 décisions tracées, transformant la plateforme en laboratoire de recherche auditable.
  - "Contrats typés cross-langage : génération Prisma vers JSON Schema puis Pydantic, avec gardes structurelles en CI garantissant la parité TypeScript/Python."
  - "Séries temporelles à grande échelle sur PostgreSQL et TimescaleDB : 151 modèles, hypertables, ingestion multi-fournisseurs en temps réel."
  - "Sécurité et multi-tenant : séparation des rôles PostgreSQL au moindre privilège, JWT et Argon2, HMAC inter-services, visibilité des ressources par organisation et par rôle."
  - "Fiabilité et exploitation : moteur de backtest et indicateurs glissants, chaîne de sauvegarde et de restauration éprouvée, observabilité Grafana."
  - Intégration continue sur runner auto-hébergé, porte de tests unifiée Vitest et pytest, 214 migrations versionnées.
---

Augure est une plateforme prédictive temps réel : un monorepo TypeScript et Python de
48 services conteneurisés, en architecture événementielle, avec un assistant IA intégré au produit.

C'est **mon propre projet**. J'en suis le propriétaire, le Product Owner et l'unique développeur ;
la société n'est pas constituée à ce jour. Cela signifie que la conception architecturale,
l'implémentation et l'exploitation sont assumées de bout en bout par la même personne — ce qui est
la contrainte la plus structurante du projet, et la raison pour laquelle tout y est automatisé ou
tracé plutôt que retenu.

Le point qui me paraît le plus intéressant techniquement n'est pas le pipeline de machine learning,
mais **la sécurité des outils exposés au modèle** : chaque outil applique les règles de visibilité
et les gardes d'état de l'application, de sorte que le modèle n'accède jamais qu'aux ressources
autorisées à l'utilisateur qui lui parle. Un assistant agentique qui court-circuiterait ces règles
serait une élévation de privilèges déguisée en fonctionnalité.
