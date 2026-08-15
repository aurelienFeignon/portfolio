---
slug: askor
company: EVEA Conseil
role: Full-Stack Developer
location: Tours, France
startedAt: 2021-01-01
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
  - Design of a component library and complex dynamic workflows.
  - Interactive modelling with React Flow and advanced state management with Zustand.
  - API structuring and evolution through Symfony and API Platform.
  - Asynchronous computation engine built on Symfony Messenger and a Python microservice, with message-queue handling.
  - Real-time streaming via Mercure.
  - Dynamic eco-design module, based on a weighted decision tree.
  - "Optimisation and refactoring of a multi-sector life-cycle assessment: refactoring and lazy loading of services."
  - Versioning of emission factors and persistence of results.
---

Askor is a life-cycle assessment and eco-design software, developed at EVEA Conseil.

The heart of the product is a **computation engine**: a multi-sector life-cycle assessment pulls in a
great deal of data and a great many rules, and the difficulty is not computing it once but recomputing
it quickly when a parameter changes. Hence the move to asynchronous computation — Symfony Messenger in
front of a Python microservice — and the lazy loading of services, which cut the wasted work on every
evaluation.

The second structuring point is the **versioning of emission factors**. An assessment result only
means something alongside the factors that produced it: letting them evolve without versioning would
make two assessments six months apart incomparable.
