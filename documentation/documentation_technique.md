# EpiTrello - Documentation technique

## 1. Objet du document

Ce document décrit l'architecture technique actuelle du projet EpiTrello, ses composants, ses flux applicatifs, ses dépendances et ses contraintes d'exploitation.

Il sert de référence pour :

- le développement quotidien
- l'onboarding des nouveaux contributeurs
- l'exploitation locale et Docker
- la maintenance et le debug

---

## 2. Vue d'ensemble technique

EpiTrello est une application web Kanban basée sur SvelteKit, avec une API intégrée (routes `+server.ts`) et une persistance Redis.

### 2.1 Stack principale

- Runtime JS: Bun `1.3.7`
- Framework frontend/backend: SvelteKit `2.x` + Svelte `5.x`
- Bundler: Vite `7.x`
- Styles: Tailwind CSS `4.x` (+ plugin forms/typography)
- Validation de schémas: Zod `4.x`
- Base de données: Redis (via `Bun.RedisClient`)
- CI: GitHub Actions

### 2.2 Philosophie d'architecture

- Backend léger intégré au projet SvelteKit via endpoints API.
- Pas de microservices séparés.
- État de session géré principalement côté navigateur (`localStorage`).
- Données métier centralisées dans Redis avec des connecteurs types.

---

## 3. Arborescence utile

```text
epitrello/
├── src/
│   ├── lib/
│   │   ├── interfaces/            # Schémas Zod (IUser, IBoard, IList, ICard, ITag)
│   │   ├── server/
│   │   │   ├── redisConnector.ts  # Connecteurs Redis (CRUD métier)
│   │   │   └── fakeDb.ts          # DB mémoire pour tests/legacy
│   │   └── LogoutButton.svelte
│   ├── routes/
│   │   ├── api/                   # API HTTP (boards, lists, cards, tags, ...)
│   │   ├── auth/                  # OAuth GitHub et Microsoft
│   │   ├── b/[board_id]/          # Vue board Kanban
│   │   ├── u/[user_id]/           # Vue profil + boards utilisateur
│   │   ├── login/                 # Login page
│   │   └── +page.svelte           # Landing page
│   └── app.css                    # Initialisation Tailwind
├── tests/api/routes-db-mocking.test.ts
├── docker-compose.dev.yml
├── docker-compose.prod.yml
├── Dockerfile
├── Dockerfile.prod
└── package.json
```

---

## 4. Configuration et exécution

### 4.1 Prérequis

- Bun installé
- Redis accessible (local ou conteneur)
- Variables d'environnement configurées

### 4.2 Scripts npm/bun

- `bun run dev`: démarrage dev Vite
- `bun run build`: build production
- `bun run preview`: preview local du build
- `bun run test`: tests Bun
- `bun run lint`: prettier check + eslint
- `bun run check`: vérification Svelte/TypeScript

### 4.3 Variables d'environnement utilisées

- `REDIS_URL`
- `GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET`
- `MICROSOFT_CLIENT_ID`
- `MICROSOFT_CLIENT_SECRET`
- `MICROSOFT_TENANT_ID`
- `MICROSOFT_REDIRECT_URI`

Notes :

- Le projet contient actuellement un fichier `.env` local.
- Recommandé: ne pas versionner de secrets réels et fournir un `.env.example`.

### 4.4 Exécution Docker

### Dev

- Fichier: `epitrello/docker-compose.dev.yml`
- App exposée sur `5173`
- Redis `7-alpine` exposé en interne compose
- Volume code monté pour itération rapide

### Prod

- Fichier: `epitrello/docker-compose.prod.yml`
- App exposée sur `3000`
- Runtime Node avec build SvelteKit prégénéré
- Redis `7-alpine` persiste via volume

---

## 5. Architecture applicative

### 5.1 Couches

- Couche UI: composants Svelte (`+page.svelte`, `card.svelte`, `top_bar.svelte`, etc.)
- Couche API: handlers HTTP dans `src/routes/api/*/+server.ts`
- Couche auth OAuth: `src/routes/auth/*/+server.ts`
- Couche données: connecteurs Redis dans `src/lib/server/redisConnector.ts`
- Couche validation: schémas Zod dans `src/lib/interfaces/*`

### 5.2 Flux principal (board Kanban)

1. L'utilisateur arrive sur `/b/[board_id]`.
2. Le `load` serveur vérifie l'existence du board.
3. Le client charge les données via `GET /api/board-full`.
4. Les actions UI (ajout liste/carte/tag, suppression, rename, move) appellent les endpoints API.
5. Les endpoints mettent à jour Redis via connecteurs ou commandes directes.

---

## 6. Modèle de données Redis

Les données sont stockées avec des préfixes de clés explicites.

### 6.1 Utilisateurs

- `user:{uuid}` (hash)
- `user_email:{email}` (string -> uuid)
- `user:{uuid}:boards` (set board ids)

### 6.2 Boards

- `board:{uuid}` (hash)
- `board:{uuid}:editors` (set user ids)
- `board:{uuid}:viewers` (set user ids)
- `board:{uuid}:lists` (set list ids)

### 6.3 Lists

- `list:{uuid}` (hash)
- `list:{uuid}:cards` (set card ids)

### 6.4 Cards

- `card:{uuid}` (hash)
- `card:{uuid}:tags` (set tag ids)
- `card:{uuid}:assignees` (set user ids)

### 6.5 Tags

- `tag:{uuid}` (hash)
- `tag:{uuid}:attributes` (supprimé à la deletion, non alimenté explicitement à la création)

### 6.6 État board agrégé

- `board_state:{boardId}` (JSON brut pour snapshot d'état)

---

## 7. API HTTP (état actuel)

### 7.1 Authentification locale simplifiée

### `POST /api/login`

But:

- récupérer ou créer un utilisateur depuis un email

Payload:

```json
{
  "email": "user@example.com",
  "name": "optionnel"
}
```

Réponse:

```json
{
  "id": "uuid",
  "email": "user@example.com",
  "name": "username"
}
```

### 7.2 Boards

### `POST /api/boards`

- Crée un board (`ownerId`, `name`)
- Vérifie que l'utilisateur propriétaire existe

### `PATCH /api/boards`

- Renomme un board (`boardId`, `name`)

### `DELETE /api/boards?id={boardId}`

- Supprime un board et ses ressources liées

### 7.3 Lists

### `POST /api/lists`

- Crée une liste sur un board (`boardId`, `name`)

### `PATCH /api/lists`

- Renomme une liste (`listId`, `name`)

### `DELETE /api/lists?id={listId}`

- Supprime la liste et ses cartes

### 7.4 Cards

### `POST /api/cards`

- Crée une carte dans une liste (`listId`, `title`)

### `PATCH /api/cards`

- Renomme (`cardId`, `name`) et/ou déplace (`fromListId`, `toListId`)

### `DELETE /api/cards?id={cardId}`

- Supprime une carte (supporte aussi `cardId` dans le body)

### 7.5 Tags

### `POST /api/tags`

- Ajoute un tag sur carte (`cardId`, `name`)

### `DELETE /api/tags`

- Supprime un tag par nom (`cardId`, `name`)

### 7.6 Lecture board complet

### `GET /api/board-full?boardId={boardId}`

- Retourne:
  - métadonnées board
  - listes
  - cartes
  - tags (noms)

### 7.7 Snapshot board state

### `GET /api/board-state?boardId={boardId}`

- Lit le JSON stocké dans Redis

### `POST /api/board-state`

- Écrit un payload normalisé `{ board_name, lists }` pour un board

---

## 8. Auth OAuth

### 8.1 GitHub

Routes:

- `GET /auth/github`
- `GET /auth/github/callback`

Processus:

1. Redirection vers GitHub OAuth.
2. Échange `code` contre `access_token`.
3. Lecture du profil GitHub (+ emails).
4. Création utilisateur si inexistant.
5. Retour HTML script qui écrit `localStorage` puis redirige vers `/u/{id}#profile`.

### 8.2 Microsoft

Routes:

- `GET /auth/microsoft`
- `GET /auth/microsoft/callback`

Processus:

1. Redirection vers Microsoft OAuth v2.
2. Échange `code` contre token.
3. Lecture profil via Microsoft Graph (`/me`).
4. Création utilisateur si inexistant.
5. Retour HTML script qui écrit `localStorage` puis redirige.

---

## 9. Frontend et routage

### 9.1 Pages principales

- `/`: landing page
- `/login`: login standard + boutons OAuth
- `/u/[user_id]`: espace utilisateur et liste des boards
- `/b/[board_id]`: board Kanban editable

### 9.2 Comportement session

- Session client basée sur `localStorage` (`authToken`, `user`)
- Vérifications de présence utilisateur faites côté client dans plusieurs pages
- Pas de session serveur signée actuellement

---

## 10. Qualité, tests et CI

### 10.1 Tests existants

- `tests/api/routes-db-mocking.test.ts`
- Couvre principalement:
  - `api/board-state`
  - `api/boards`

### 10.2 Pipeline CI

Fichier: `.github/workflows/ci.yml`

Étapes:

1. checkout
2. setup Bun
3. install dépendances
4. lint
5. tests
6. build

Point important:

- `lint` et `tests` sont actuellement en `continue-on-error: true` (non bloquants).

---

## 11. Limites techniques observées

Ces points décrivent l'état courant et peuvent guider la roadmap technique.

- Auth locale `/api/login` ne valide pas le mot de passe (email only).
- Les callbacks OAuth écrivent la session en `localStorage` via script HTML de retour.
- Certaines URLs de callback sont hardcodées en `localhost`.
- Une page existe avec faute de nommage: `auth/microsoft/sucess`.
- Le fichier `auth/microsoft/sucess/+page.svelte` est vide.
- Le projet ne fournit pas de `.env.example` versionné.

---

## 12. Recommandations techniques court terme

1. Introduire une vraie session serveur (cookie HttpOnly, expiration, rotation).
2. Ajouter un `.env.example` sans secrets et retirer les secrets réels du dépôt.
3. Rendre lint/tests bloquants en CI.
4. Externaliser les URLs de callback OAuth dans des variables d'environnement.
5. Étendre la couverture de tests API (lists, cards, tags, board-full, auth).
