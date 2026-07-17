# Paid Media Locker

A backend + minimal React Native (Expo) Android app where users upload images, set an unlock price, and other users spend coins from a wallet to unlock the original. Built for the Team Konvo backend intern assignment.

- **Backend**: Node.js, Express, TypeScript, PostgreSQL (Prisma ORM)
- **Mobile**: React Native (Expo, Android), TypeScript
- **API docs**: [`docs/API.md`](docs/API.md)
- **DB schema**: [`docs/DB_SCHEMA.md`](docs/DB_SCHEMA.md)

## Demo credentials

Seeded by `npm run seed` (see setup below):

| Role | Email | Password |
|---|---|---|
| Buyer (starts with 100 coins, no uploads) | `demo@lockerapp.test` | `Demo@1234` |
| Creator (owns 3 sample media items) | `creator@lockerapp.test` | `Creator@1234` |

---

## Project structure

```
PaidMediaLocker/
  backend/          Express + TypeScript + Prisma API
  mobile/           Expo React Native (Android) app
  docs/             API.md, DB_SCHEMA.md
```

---

## Backend setup

### Option A — Docker Compose (recommended, closest to production)
```bash
cd backend
docker compose up --build
# in another terminal, seed demo data:
docker compose exec backend npx ts-node prisma/seed.ts
```
The API is now at `http://localhost:4000`. Postgres and uploaded media persist in named Docker volumes.

### Option B — Local Node + a Postgres instance
Requires Node 20+ and a reachable Postgres (local install, Docker's `postgres` image run standalone, or a free cloud instance).
```bash
cd backend
npm install
cp .env.example .env        # edit DATABASE_URL etc. if needed
npx prisma migrate dev      # creates schema
npm run seed                # demo user + sample media
npm run dev                 # starts on http://localhost:4000
```

Don't have Postgres installed and don't want Docker? `npm run db:local` starts a real (non-Docker) Postgres binary via the `embedded-postgres` package, listening on port 5433 — point `DATABASE_URL` in `.env` at it (`.env.example` already shows the shape). This is exactly how the backend in this repo was developed and tested.

### Tests
```bash
cd backend
npm test
```
18 Jest/Supertest tests cover: registration/login/validation, upload + feed lock-state, the full unlock flow (success, duplicate rejection, insufficient-balance rejection, owner-can't-unlock-own-media, 404 on unknown media), and the original-file access-control path (locked users denied, cross-user signed tokens rejected, unauthenticated requests rejected). Tests run against a real Postgres instance — point `.env.test`'s `DATABASE_URL` at any reachable test database (defaults to the same embedded-postgres instance as above, on a separate `paid_media_locker_test` database).

---

## Mobile app setup

```bash
cd mobile
npm install
cp .env.example .env
# edit EXPO_PUBLIC_API_URL:
#   Android emulator reaching your host machine -> http://10.0.2.2:4000
#   physical device on the same Wi-Fi           -> http://<your-lan-ip>:4000
npx expo start
```
Scan the QR code with Expo Go (Android) or run on an emulator. Screens: **Login/Register → Media Feed → Upload → Media Detail (unlock/view original)**.

---

## Security decisions

- **Media storage is private by construction.** Original and preview files are saved under `backend/storage/{originals,previews}` with random UUID filenames, and that directory is **never** wired up as an Express static route. The only way to reach a file is through an authenticated controller (`GET /media/:id/preview`, `GET /media/:id/original`) — there is no static URL that maps directly to a file on disk.
- **Preview generation happens server-side at upload time** (`sharp`: downsize + heavy blur + a "PREVIEW — UNLOCK TO VIEW" watermark band), so the "preview" is a genuinely degraded asset, not the original with a CSS overlay that a client could strip.
- **The original-file route re-checks entitlement on every single request**, independent of anything else. Ownership/purchase is looked up in the database each time `GET /media/:id/original` is called — there's no cached "is unlocked" flag that could go stale or be tampered with client-side.
- **Short-lived signed tokens bound the replay window of a leaked URL.** `GET /media/:id/original` also requires a `?token=` query param: an HMAC-SHA256 signature over `(mediaId, requestingUserId, expiry)` minted only for entitled users, with a default 90-second TTL (`SIGNED_URL_TTL_SECONDS`). This is defense-in-depth, not the primary gate — the database entitlement check above is what actually matters — but it means a screenshotted or copy-pasted URL stops working within seconds even if the DB check were somehow bypassed, and a token minted for one user is rejected outright for another (`token_mismatch`), so URLs can't be shared between accounts even inside the TTL window.
- **Duplicate purchases are blocked at two layers.** The unlock endpoint checks for an existing `Purchase` row before charging the wallet, *and* the database has a `UNIQUE (userId, mediaId)` constraint as a hard backstop — if two unlock requests for the same media race each other, the second `INSERT` fails at the DB level and is caught and turned into a `409 Conflict`, so a race condition can never result in a double-charge or two purchase rows.
- **Wallet mutations are transactional.** Deducting the balance, inserting the `Purchase` row, and inserting the `Transaction` row all happen inside a single Prisma `$transaction` — they succeed or fail together.
- **Audit logging** records every unlock attempt (success, insufficient balance, already-owned, not-found) and every original-file access attempt (granted or denied) with user id, media id, and IP, for traceability. Audit writes are best-effort (wrapped so a logging failure never turns a legitimate 400/404 into a 500), since they're a diagnostic trail, not part of the authorization decision itself.
- **Standard hardening**: `bcrypt` password hashing, JWT bearer auth on every non-public route, `helmet` security headers, `express-rate-limit` on `/auth/*` (brute-force) and `/media/:id/unlock` (abuse), Zod input validation on every mutating endpoint, and file-type/size validation on upload (JPEG/PNG/WEBP only, 15MB cap).
- **Known limitation, documented rather than hidden**: local disk storage means uploaded media does not survive a redeploy on Render's free tier (its filesystem is ephemeral, and persistent disks require a paid instance type). `StorageService` (`backend/src/storage/StorageService.ts`) is an interface specifically so swapping in S3/R2 is a contained change — see "Future work" below.

## Scalability considerations

- **Stateless API**: JWT auth means any request can be served by any backend instance — horizontal scaling behind a load balancer needs no sticky sessions.
- **DB is the single source of truth for money and entitlement** (wallet balance, `Purchase` rows), with the `UNIQUE(userId, mediaId)` constraint and transactional writes — this is what makes it safe to run multiple backend instances concurrently without double-spend races.
- **Feed and transaction history are paginated** (`page`/`pageSize` query params) rather than returning full tables, so response size doesn't grow unbounded with data volume.
- **Media indexes**: `Media.ownerId`, `Purchase(userId, mediaId)`, `Transaction.userId`, `AuditLog.userId/mediaId` are all indexed for the query patterns the API actually uses (feed-by-owner, entitlement lookup, history-by-user).
- **Current bottleneck under real load**: local-disk storage. It doesn't scale past a single instance/disk and is the first thing called out in "Future work" below — an S3/R2-backed `StorageService` would let the app scale horizontally and offload file serving to a CDN/presigned URLs instead of proxying bytes through the API process.
- **Not implemented, but straightforward given the current design**: read replicas for the feed (read-heavy, no writes), Redis-based rate limiting instead of in-memory (needed once there's more than one backend instance, since `express-rate-limit`'s default store is per-process).

## Future work (not implemented, given scope/time)
- Swap `LocalDiskStorage` for an S3/R2-backed `StorageService` implementation (interface already supports this) for durable storage in production.
- Client-side image compression before upload (currently the mobile app uploads the picked image as-is; the server does all resizing/blurring for the preview).
- Structured audit log viewer / admin endpoint (logs currently live in the DB only, queryable via `prisma studio` or SQL).

---

## Deployment (live backend for the APK)

This repo includes `backend/render.yaml` (a Render Blueprint) and `mobile/eas.json` (EAS Build profiles), but actually deploying and building an APK requires **your own** Render and Expo accounts — those two steps can't be done on your behalf:

1. **Render**: push this repo to GitHub, then in the Render dashboard choose "New Blueprint" and point it at the repo (`render.yaml` is auto-detected at `backend/`). It provisions a free Postgres instance and the web service, runs `prisma migrate deploy` before each deploy, and generates `JWT_SECRET`/`SIGNED_URL_SECRET` automatically. After the first deploy, run the seed script once via the Render shell:
   ```bash
   npx ts-node prisma/seed.ts
   ```
2. **Mobile**: update `mobile/eas.json`'s `build.preview.env.EXPO_PUBLIC_API_URL` to your actual Render URL, then:
   ```bash
   cd mobile
   npx eas login          # your own Expo account
   npx eas build --platform android --profile preview
   ```
   EAS builds in the cloud and gives you a download link for the finished `.apk` when done.

**Note on Render's free tier**: its filesystem is ephemeral (no persistent disks without a paid plan), so re-running the seed script after any redeploy is expected — this is called out in `render.yaml` and in the security notes above.
