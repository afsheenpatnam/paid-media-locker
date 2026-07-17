# API Documentation

Base URL (local): `http://localhost:4000/api`
Base URL (deployed): see the `EXPO_PUBLIC_API_URL` value shared with the submission.

All authenticated endpoints require:
```
Authorization: Bearer <jwt>
```

All request/response bodies are JSON except media upload (`multipart/form-data`) and the preview/original image endpoints (binary image response).

---

## Auth

### `POST /auth/register`
Rate-limited (20 requests / 15 min / IP).

Request:
```json
{ "email": "alice@example.com", "password": "Password123", "displayName": "Alice" }
```
- `password` min 8 characters.

Response `201`:
```json
{
  "token": "<jwt>",
  "user": { "id": "...", "email": "...", "displayName": "...", "walletBalance": 100, "createdAt": "..." }
}
```
New users are seeded with `STARTING_WALLET_BALANCE` coins (default 100) and a `SEED` transaction is recorded.

Errors: `400` validation, `409` email already registered.

### `POST /auth/login`
Rate-limited (20 requests / 15 min / IP).
```json
{ "email": "alice@example.com", "password": "Password123" }
```
Response `200`: same shape as register. `401` on bad credentials.

### `GET /me`
Auth required. Returns the current user's profile + wallet balance.

---

## Wallet

### `GET /wallet`
Auth required. `{ "balance": 85 }`

### `GET /wallet/transactions?page=1&pageSize=20`
Auth required. Paginated transaction history (`SEED` | `DEBIT` | `CREDIT`), newest first.
```json
{ "items": [{ "id": "...", "type": "DEBIT", "amount": 15, "balanceAfter": 85, "createdAt": "..." }], "total": 4, "page": 1, "pageSize": 20 }
```

---

## Media

### `POST /media`
Auth required. `multipart/form-data`:
- `image` (file, required) — JPEG/PNG/WEBP, ≤15MB
- `title` (string, required)
- `description` (string, optional)
- `unlockPrice` (integer ≥ 0, required)

On upload, the server generates a blurred, watermarked, downsized **preview** (via `sharp`) and stores both the original and the preview under random, non-guessable filenames outside any statically-served directory.

Response `201`:
```json
{ "media": { "id": "...", "title": "...", "unlockPrice": 30 } }
```

### `GET /media?page=1&pageSize=20`
Auth required. Paginated feed of all media, ordered newest-first.
```json
{
  "items": [
    { "id": "...", "ownerId": "...", "title": "...", "description": "...", "unlockPrice": 30,
      "createdAt": "...", "locked": true, "previewUrl": "/api/media/<id>/preview" }
  ],
  "total": 3, "page": 1, "pageSize": 20
}
```
`locked` is computed per requester: `false` if you own the media or have purchased it, `true` otherwise.

### `GET /media/:id`
Auth required. Media details for a single item. If unlocked (owner or purchaser), the response additionally includes a short-lived signed `originalUrl`:
```json
{ "media": { "...": "...", "locked": false }, "originalUrl": "/api/media/<id>/original?token=<signed>" }
```
If still locked, `originalUrl` is omitted entirely — there is no way to derive it from the response.

### `GET /media/:id/preview`
Auth required (any authenticated user). Streams the preview image. Always accessible regardless of lock state — this is the "browse" experience.

### `GET /media/:id/original?token=<signed>`
Auth required, **plus** a valid signed token minted specifically for `(mediaId, requestingUserId)` with a short TTL (default 90s, see `SIGNED_URL_TTL_SECONDS`). Even with a valid, unexpired token, the server independently re-checks in the database that the requesting user actually owns or has purchased the media — the token only bounds *how long* a captured/shared link keeps working; it is not the sole gate. See [SECURITY.md decisions in the README](../README.md#security-decisions).

Errors: `400` invalid/expired/mismatched token, `403` valid token but not entitled (shouldn't normally happen since tokens are minted only for entitled users, but re-checked anyway), `404` media not found.

### `POST /media/:id/unlock`
Auth required. Rate-limited (30 requests / min / IP). Spends coins to unlock a piece of media.

Response `200`:
```json
{ "purchaseId": "...", "walletBalance": 55 }
```

Errors:
- `400` — insufficient wallet balance, or you already own the media (you're the uploader)
- `404` — media does not exist
- `409` — already unlocked (duplicate purchase attempt — also enforced at the DB level via a unique constraint as a race-condition backstop)

---

## Error format
```json
{ "error": "bad_request" | "unauthorized" | "forbidden" | "not_found" | "conflict" | "validation_error" | "internal_error", "message"?: "...", "details"?: {...} }
```

## Health check
`GET /health` → `{ "status": "ok" }` (no auth).
