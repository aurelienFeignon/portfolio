---
slug: augure
company: Augure
role: Founder, Product Owner and developer
startedAt: '2025'
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
  - "Product-integrated agentic conversational assistant: a tool-calling orchestrator exposing 27 business tools to the model, with streaming responses."
  - "LLM multi-provider abstraction: unified client interface with Anthropic, OpenAI and self-hosted Ollama adapters, API keys encrypted at rest."
  - "Event-driven microservices architecture: about thirty specialised workers orchestrated by RabbitMQ, with dead-letter queues, supervision and idempotent retries."
  - "End-to-end machine-learning pipeline: ingestion, features, TensorFlow/Keras and XGBoost training, GPU inference via NVIDIA Triton."
  - A 35-chapter architecture RFC with 169 tracked decisions, turning the platform into an auditable research lab.
  - "Cross-language typed contracts: Prisma to JSON Schema to Pydantic generation, with structural CI guards enforcing TypeScript/Python parity."
  - "Large-scale time series on PostgreSQL and TimescaleDB: 151 models, hypertables, real-time multi-provider ingestion."
  - "Security and multi-tenancy: least-privilege PostgreSQL role separation, JWT and Argon2, inter-service HMAC, per-organisation and per-role resource visibility."
  - "Reliability and operations: backtesting engine and rolling indicators, proven backup and restore chain, Grafana observability."
  - Continuous integration on a self-hosted runner, unified Vitest and pytest test gate, 214 versioned migrations.
---

Augure is a real-time predictive platform: a TypeScript and Python monorepo of 48
containerised services, event-driven, with an AI assistant built into the product.

This is **my own project**. I am its owner, Product Owner and sole developer; the company is not
incorporated at this stage. It means architectural design, implementation and operations are carried
end to end by the same person — which is the most structuring constraint of the project, and the
reason everything in it is automated or written down rather than remembered.

The part I find most interesting technically is not the machine-learning pipeline but **the security
of the tools exposed to the model**: each tool enforces the application's visibility rules and state
guards, so the model only ever reaches resources the user talking to it is authorised for. An agentic
assistant that bypassed those rules would be a privilege escalation dressed up as a feature.
