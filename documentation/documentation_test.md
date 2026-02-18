# EpiTrello - Documentation de Test

## 1. Objectif du document

Ce document formalise la stratégie de tests de l'application EpiTrello dans une logique professionnelle:

- distinguer clairement les tests unitaires, d'intégration et la politique de mocking
- documenter la couverture existante
- définir les standards de qualité attendus en contribution

---

## 2. Stack et outillage de test

- Runtime et exécution des tests: Bun (`bun test`)
- Framework de test: `bun:test` (`describe`, `it`, `expect`, `mock`, `beforeEach`)
- Cible principale actuellement couverte: routes API SvelteKit (`+server.ts`)

Fichier de référence actuel:

- `epitrello/tests/api/routes-db-mocking.test.ts`

---

## 3. Typologie de tests

### 3.1 Tests unitaires

Définition projet:

- testent une unité isolée (fonction utilitaire, transformation de données, règle métier locale)
- n'exécutent ni I/O réseau, ni Redis réel
- utilisent des mocks simples et ciblés sur les dépendances externes

Objectif:

- valider la logique métier fine, avec des tests rapides, déterministes et faciles à diagnostiquer

Bonnes pratiques attendues:

- structure `Arrange / Act / Assert`
- un scénario métier par test
- nommage explicite orienté comportement (ex: `returns 400 when ...`)

### 3.2 Tests d'intégration

Définition projet:

- testent l'intégration d'un handler API complet avec ses dépendances applicatives (connecteurs, format de payload, mapping HTTP)
- restent isolés de l'infrastructure réelle via mocking du module d'accès aux données

Concrètement dans EpiTrello:

- import direct des handlers `GET/POST/PATCH/DELETE` depuis `src/routes/api/*/+server.ts`
- invocation avec objets `Request`/`URL` réalistes
- validation:
  - du code HTTP (`200`, `400`, `403`, `404`, `500`)
  - du payload JSON retourné
  - des interactions vers les connecteurs/mock Redis (effets de bord attendus)

---

## 4. Politique de mocking

Le projet applique un mocking de module centralisé via:

```ts
mock.module('$lib/server/redisConnector', () => ({ ... }));
```

Ce pattern permet de remplacer tout l'accès données (Redis + connecteurs) par des doubles de test contrôlés.

Principes suivis:

- état central de test (`state`) pour piloter les retours et erreurs simulées
- reset complet de cet état dans `beforeEach` pour garantir l'indépendance des tests
- assertions explicites sur les appels mockés (`rdbHsetCalls`, `rdbSaddCalls`, etc.)
- simulation des erreurs techniques pour vérifier les chemins `500`

Règles de qualité:

- ne jamais dépendre d'une instance Redis réelle dans ces tests
- éviter les mocks implicites ou cachés
- vérifier à la fois le résultat HTTP et l'effet côté dépendances

---

## 5. Couverture actuelle (état du dépôt)

Tests API couverts:

- `api/board-state`
- `api/boards`
- `api/lists`
- `api/cards`
- `api/tags`
- `api/board-full`
- `api/users`
- `api/login`

Routes API non couvertes à date:

- `api/board-events`
- `api/board-sharing`

Constat:

- la couverture actuelle est majoritairement de type "intégration isolée par mocking"
- il n'existe pas encore de suite dédiée `tests/unit/` pour des unités métier pures

---

## 6. Organisation recommandée des tests

Arborescence cible:

```text
epitrello/tests/
├── api/                    # tests d'intégration des routes +server.ts
│   └── routes-db-mocking.test.ts
├── unit/                   # tests unitaires (fonctions pures / règles métier)
└── integration/            # intégration avec infra réelle (Redis de test), si activée
```

Conventions:

- suffixe de fichier: `.test.ts`
- un bloc `describe` par module/endpoint
- couvrir au minimum:
  - cas nominal
  - validation des entrées invalides
  - erreur technique de dépendance

---

## 7. Exécution locale et CI

Depuis `epitrello/`:

```bash
bun i
bun test
```

Exécuter un seul fichier:

```bash
bun test tests/api/routes-db-mocking.test.ts
```

CI actuelle (`.github/workflows/ci.yml`):

- installe Bun
- exécute `bun run lint`
- exécute `bun test`
- build l'application

Note: les étapes lint/test sont actuellement en `continue-on-error: true` (non bloquantes).

---

## 8. Standards de contribution (PR)

Pour toute évolution backend/API, la PR doit inclure des tests couvrant:

- la validation des paramètres d'entrée
- le cas nominal
- au moins un scénario d'erreur technique (dépendance indisponible ou payload invalide)
- les effets de bord attendus sur les connecteurs/mocks

Checklist auteur:

- [ ] tests ajoutés ou adaptés
- [ ] mocks reset correctement dans `beforeEach`
- [ ] assertions sur statut HTTP + payload + appels dépendances
- [ ] exécution locale `bun test` réussie

---

## 9. Plan d'amélioration recommandé

1. Ajouter les tests pour `api/board-events` et `api/board-sharing`.
2. Introduire une suite `tests/unit/` pour isoler les règles métier complexes.
3. Ajouter une suite d'intégration avec Redis éphémère (Docker) pour valider les contrats réels.
4. Rendre lint/tests bloquants en CI (suppression progressive de `continue-on-error`).
