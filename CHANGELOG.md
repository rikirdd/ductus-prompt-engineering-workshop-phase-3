# Changelog

<!-- All notable changes below this line -->

## Unreleased

### Added

- Love percentage on every meme: `GET /api/memes/next` returns the meme with `stats` (`likes`, `total` and `percentage` across all users), and the card shows a big red heart with the percentage inside that grows with the number (`LoveHeart`). The percentage shows from the first swipe (`MIN_SWIPES_FOR_PERCENTAGE` = 1); a meme nobody has swiped yet gets a smaller, softer heart that says NEW instead of a number. Adds `getMemeStats` to the swipe service and `countByMeme` to `SwipeRepository` (in-memory and SQLite) (#13)
- Swipe milestone: the 30th swipe launches CSS fireworks with a synthesized whistle-and-bang sound (Web Audio API, no audio files or new dependency) and "🎆 30 memes swiped! You legend.", exactly once per swipe history. Reduced-motion users get the message and sound without the animation; without Web Audio it stays silent (`SWIPE_MILESTONE` in `frontend/src/milestone.ts`; the ticket asked for 100, lowered to 30 so it is reachable with the 30 seed memes). It outranks a streak on the same swipe and counts stored swipes, so it survives reloads and restarts (#19)
- `POST /api/swipes` also returns the user's total `swipeCount`, from `countSwipes` on the swipe service (#19)

- Card transitions: a swiped card flies off in its direction and the next card springs in, for buttons, arrow keys and drags; with `prefers-reduced-motion` the cards only fade (#17)
- Streak confetti: five likes in a row (and every multiple of five) fire CSS confetti with a "5 likes in a row!" message, a nope resets the streak, and reduced-motion users get only the message; no new dependency (#18)
- LIKE and NOPE stamps on the swipe card: the stamp fades in with the drag distance, and buttons, arrow keys and a released drag show the full stamp for 300 ms before the swipe is sent (#16)

- Memes are read from a `MemeRepository` (in-memory and SQLite implementations) instead of a fixed list. The 30 seed memes are added to the database on first start and never duplicated on later starts (#8)

- Tests for the anonymous user id (created once, kept across reloads, fallback when localStorage is blocked) and an end-to-end test that likes survive a backend restart (#7)

- Swipes are persisted in a SQLite database (built-in `node:sqlite`, no new dependency) via `createSqliteSwipeRepository`, so likes survive backend restarts; configurable with `DATABASE_PATH`, stored on a Docker volume in the container (#6)

- 20 more memes (SVG assets and seed entries), bringing the catalog to 30

- Agent guidance in `CLAUDE.md`: architecture, folder structure, commands, coding conventions, extension points (`SwipeRepository`, service vs. HTTP layer) and the rule that `CHANGELOG.md` is updated with every change (#8)

- Docker setup in `deploy/`: multi-stage `Dockerfile` (`node:22-alpine`), `docker-compose.yml` and a `README.md` for Docker and local start; root `.dockerignore` and a link from the root README (#4)
- The backend serves the built frontend when `STATIC_DIR` is set, with an SPA fallback that never answers `/api` paths, plus Supertest tests for it (#4)

- Drag gestures on the swipe card using pointer events (touch and mouse, no gesture library): the card follows the pointer, a release past 100 px likes or nopes, and a shorter release snaps back (#7)
- Left and right arrow keys swipe (nope and like) in the swipe view only, and are ignored while a swipe request is in flight (#7)
- Frontend tests for the `MemeCard` buttons, arrow keys and drag threshold, and for arrow keys and double-swipe protection in the app (#7)

- `GET /api/likes` returns `{ "memes": [...] }` with the user's liked memes in catalog order, and `listLikedMemes` on the swipe service (#6)
- Frontend likes view (`LikesView`) with an empty message, Swipe/Likes navigation and a typed `fetchLikes()` in the API client (#6)
- Service, Supertest and frontend tests for the likes list and likes view (#6)

- Reset of a user's swipes (including likes): `DELETE /api/swipes` (`204`), `resetSwipes` on the swipe service and `clearByUser` on `SwipeRepository` (#5)
- Frontend empty state ("You have seen all memes") with a Reset button, and a typed `resetSwipes()` in the API client (#5)
- Service, Supertest and frontend tests for the reset flow and the empty state (#5)

- Swipe service and in-memory swipe repository (behind a `SwipeRepository` interface) in the backend (#3)
- `POST /api/swipes` endpoint; swiped memes are never returned again, repeated swipes keep the first one (#3)
- Anonymous user id (localStorage) sent as `X-User-Id`, plus Like and Nope buttons in the frontend (#3)
- Frontend error message when the backend is unreachable or returns an error (#3)
- Unit tests for the swipe service, Supertest tests for the swipe endpoints and frontend swipe tests (#3)

- npm workspaces monorepo with `backend` (Express + TypeScript) and `frontend` (React + Vite + TypeScript) (#2)
- Ten original SVG programmer-humour memes with captions and a meme catalog in the backend (#2)
- `GET /api/memes/next` endpoint and static serving of meme images under `/api/memes/images` (#2)
- Frontend that fetches a meme and shows it as a static card, with `/api` proxied to the backend (#2)
- Vitest example tests in both workspaces (Supertest for the backend, Testing Library for the frontend) (#2)
- `.nvmrc` and `engines` requiring Node 22+ and npm 10+; README with requirements and quick start (#2)

### Changed

- `Confetti` takes a `message` instead of a streak number (#19)
- `.gitignore` ignores `.vite` and `data/` again; the two entries had been merged into one line, so the SQLite database showed up as untracked (#19)

- `MemeCard` now takes `onSwipe(direction)` and owns the Like and Nope buttons, which moved out of `App`; buttons are disabled while a swipe request is in flight (#7)
- The plain "No more memes." text is replaced by the `EmptyState` component (#5)
- `GET /api/memes/next` is now per user (requires `X-User-Id`) and returns `{ "meme": ... }`, with `{ "meme": null }` when all memes are swiped (#3)
- `createApp` now takes a swipe service instead of the meme catalog (#3)
