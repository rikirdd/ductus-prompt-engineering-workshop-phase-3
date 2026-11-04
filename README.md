# Meme-Tinder

Tinder but for memes

A proof of concept that workshop teams fork and extend. It is an npm workspaces monorepo:

- `backend/`: Express + TypeScript API on port 3000. Serves the seed memes (original SVGs in `backend/assets/memes`).
- `frontend/`: React + Vite + TypeScript on port 5173. The dev server proxies `/api` to the backend.

## Requirements

- Node.js 22 or newer (see `.nvmrc`; run `nvm use` if you use nvm)
- npm 10 or newer

## Quick start

```bash
npm install
npm run dev
```

To run in Docker instead, or for more detail on both options, see [deploy/README.md](deploy/README.md).

Open http://localhost:5173, then swipe memes by dragging the card, with the Like and Nope buttons or with the left and right arrow keys, and use the Likes tab to see what you liked. When all memes are swiped, press Reset to start over.

## Commands

| Command         | What it does                                  |
| --------------- | --------------------------------------------- |
| `npm run dev`   | Starts backend and frontend in watch mode     |
| `npm test`      | Runs all backend and frontend tests           |
| `npm run build` | Builds both workspaces                        |

## API

All endpoints are under `/api` and need an `X-User-Id` header (the frontend creates an anonymous id on first visit and stores it in localStorage).

| Endpoint                                 | Description                                                                                                                                                                                                                           |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /api/memes/next`                    | `200 { "meme": {...} }` with the next unseen meme and its `stats` (`likes`, `total` and `percentage` across all users; `percentage` is `null` until someone has swiped it), or `200 { "meme": null }` when all memes have been swiped |
| `POST /api/swipes`                       | Body `{ "memeId": "...", "direction": "like" \| "nope" }`. `200` with the stored swipe and the user's total `swipeCount`                                                                                                              |
| `GET /api/likes`                         | `200 { "memes": [...] }` with the user's liked memes in catalog order (`[]` when nothing is liked)                                                                                                                                    |
| `DELETE /api/swipes`                     | Removes all of the user's swipes, including likes. `204 No Content`; safe to call repeatedly                                                                                                                                          |
| `GET /api/profile`                       | `200 { "profile": { "nickname", "emoji" } }`. A user without a profile gets a generated one ("Meme Fan 4821")                                                                                                                         |
| `PUT /api/profile`                       | Body `{ "nickname": "...", "emoji": "..." }` (nickname 1 to 20 characters, one emoji). `200` with the profile                                                                                                                         |
| `POST /api/login`                        | Body `{ "nickname": "..." }`. `200 { "userId", "profile" }`; needs no `X-User-Id` header and no password                                                                                                                              |
| `GET /api/people`                        | `200 { "people": [...] }`: everyone else with `nickname`, `emoji`, `demo`, `compatibility` (percent, or `null` without shared swipes) and `sharedSwipes`, best match first                                                            |
| `GET /api/people/:nickname/shared-memes` | `200 { "memes": [...] }` with the memes both you and that person liked, in catalog order. `404` for an unknown nickname                                                                                                               |

Errors are JSON `{ "error": "..." }`: `400` for a missing user id, missing meme id or invalid direction, `404` for an unknown meme id or an unknown nickname at login, `409` when a nickname is already taken (ignoring case). Swiping the same meme twice is idempotent: the first swipe is kept.

Swipes are stored in a SQLite file (`backend/src/swipes/sqlite.ts`, path set by `DATABASE_PATH`, default `data/meme-tinder.db`), so they survive restarts. The `SwipeRepository` interface in `backend/src/swipes/repository.ts` is where another database plugs in.

## Profiles and signing in

Everyone has a profile with a unique nickname (ignoring case) and an emoji, stored next to the swipes in the same SQLite file (`backend/src/profiles/`). People who swiped before profiles existed get a generated profile the first time they are seen, and keep all their swipes because the user id does not change.

To use your memes and likes on another device, open the Profile tab and sign in with your nickname.

**Known limitation:** signing in needs only the nickname, with no password, so anyone who knows a nickname can sign in as that person. The product owner accepted this for now. Do not use it for anything that must stay private.

## People and compatibility

The People tab lists everyone else, best match first, as "You and Sara are 91% compatible!". Tap a person to see the memes you both loved.

- **Compatibility** is the percentage of memes you both swiped where you made the same choice (both liked or both noped). It shows from the first shared swipe, so early scores are noisy. With no shared swipes there is no score.
- **Everyone can see everyone**: the list and the shared likes are visible to all users (product owner decision). User ids are never sent, only nicknames.
- **Demo people**: five seeded people (`backend/src/people/demo.ts`, nickname ending in "(demo)") are added on every start without duplicates, so even the only user has someone to compare with. They are marked as demo in the API and in the UI.
