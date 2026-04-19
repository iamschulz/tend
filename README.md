# 🌱 Tend

Tend is a friendly, privacy-focused habit and time tracking app. Create custom categories for your activities, track time spent on them, and set goals to build better habits.

I made this app for myself, because I wanted a privacy focused habit tracker. No company should have full access to everything you do, especially health related.

If you have suggestions or want to contribute, please reach out or open an issue.

## Features

- **Habit tracking**: as events or tracked time
- **Custom categories**: with notes, colors and emojis 🌱
- **Goals**: like "run 3 times per week" or "meditate 30 minutes per day"
- **Search**: Find old entries and notes easily
- **PWA**: installable and offline-capable
- **Localization**: English and German
- **Maximum privacy**: All data stays on your device
- **Self-hostable**: Sync your habits across your devices

## Accessibility

I try to make this app as accessible as I can. I test keyboard-navigation, display modes, TalkBack and VoiceOver regularly. If you come across an issue, please let me know and I'll do my best to fix it.

## Serverless Mode

The easiest way to use Tend is the hosted version at [tend.iamschulz.com](https://tend.iamschulz.com). You don't need an account or setup anything. Your data is stored only in your browser. The site is hosted at Netlify. I do not track anything through my domain or hoster.

## Self-Hosting with Docker

Self-hosting runs Tend in server mode, storing data in a SQLite database with session-based authentication. This will allow you to back up your data and sync it across devices.

When moving from serverless to self-hosted (or vice versa), you can use the import/export function in the app to transfer your data.

### Setup

1. Create a `docker-compose.yml`:
   ```yaml
   services:
     tend:
       image: ghcr.io/iamschulz/tend:latest
       ports:
         - "3000:3000"
       volumes:
         - ./data:/data
       environment:
         - NUXT_SESSION_PASSWORD=   # random string, min 32 characters
         - NUXT_MAX_BODY_SIZE_MB=5       # optional, max request body in MB
         - NUXT_SESSION_MAX_AGE_DAYS=60  # optional, session lifetime in days
       restart: unless-stopped
   ```

2. Start the container:
   ```sh
   docker compose up -d
   ```

Tend will be available at `http://localhost:3000`. The first created user will have admin rights.

### Authentication

Tend supports multiple authentication methods. Password-based accounts always work out of the box. OAuth providers are optional.

#### Password (default)

No extra configuration needed. The first user to register becomes admin. Additional users must be invited by the admin (via the admin panel's email allowlist).

#### OAuth Providers (optional)

Fill out any of these in your `.env` file:

```yaml
# Google
- NUXT_OAUTH_GOOGLE_CLIENT_ID=
- NUXT_OAUTH_GOOGLE_CLIENT_SECRET=

# Apple
- NUXT_OAUTH_APPLE_CLIENT_ID=
- NUXT_OAUTH_APPLE_TEAM_ID=
- NUXT_OAUTH_APPLE_KEY_ID=
- NUXT_OAUTH_APPLE_PRIVATE_KEY=

# GitHub
- NUXT_OAUTH_GITHUB_CLIENT_ID=
- NUXT_OAUTH_GITHUB_CLIENT_SECRET=
```

#### Self-hosted SSO (Authelia, Authentik, Keycloak, etc.)

Tend supports any OpenID Connect-compliant provider via the generic OIDC handler. This is the recommended approach if you want SSO without depending on third-party services.

Example with Authelia:

1. In your Authelia configuration, register Tend as a client:
   ```yaml
   identity_providers:
     oidc:
       clients:
         - client_id: tend
           client_secret: '<your-secret-hash>'
           redirect_uris:
             - https://tend.example.com/api/auth/oidc
           scopes:
             - openid
             - profile
             - email
           authorization_policy: two_factor  # optional
   ```

2. Add the OIDC environment variables to your `docker-compose.yml`:
   ```yaml
   environment:
     - NUXT_OAUTH_OIDC_CLIENT_ID=tend
     - NUXT_OAUTH_OIDC_CLIENT_SECRET=<your-client-secret>
     - NUXT_OAUTH_OIDC_OPENID_CONFIG=https://auth.example.com/.well-known/openid-configuration
   ```

The login page will show a "Sign in with SSO" button when configured.

### Security

If you expose Tend to the Internet, you must use HTTPS, or else the password and session cookie are transmitted in plain text and can be intercepted. It is highly advised to use a self-signed cert and HSTS even when not exposed to the Internet.

Also run this container root-less and check your database permissions:
```sh
chmod 600 ./data/tend.db
```

### Fail2ban

Tend logs authentication events in a structured format that can be parsed by [fail2ban](https://github.com/fail2ban/fail2ban) to ban IPs at the firewall after repeated failures. The log lines look like:

```
[tend-auth] authentication-failure ip=192.168.1.1 user=alice@example.com path=/api/auth/login
```

### Data & Backups

The SQLite database is stored at `./data/tend.db` on your host machine. To create a consistent backup, use the SQLite backup command:

```sh
sqlite3 ./data/tend.db ".backup ./data/tend-backup.db"
```

This is safer than copying the file directly while the app is running.

You can also manually export your data from the app in the main menu. Re-importing your data *will* overwrite everything in the app and server.

## API

Selfhosted Tend provides a REST API for managing entries, categories, daily notes, and bulk data import/export programmatically. All data endpoints require authentication. Admin-only endpoints under `/api/admin/*` (invite management and user listing) are used by the admin panel and are not part of this public API surface.

### API Authentication

The browser frontend uses session cookies automatically. For external clients (scripts, integrations, mobile apps), use **Bearer tokens**:

```bash
# Create a token (requires an existing session)
curl -c cookies.txt -X POST http://localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"you@example.com","password":"yourpass"}'

curl -b cookies.txt -X POST http://localhost:3000/api/auth/tokens \
  -H 'Content-Type: application/json' \
  -d '{"label":"My script"}'
# Response: { "id": "...", "token": "abc123...", ... }

# Use the token for all subsequent requests
curl -H 'Authorization: Bearer abc123...' http://localhost:3000/api/entries
```

The plaintext token is returned only once at creation. Only a SHA-256 hash is kept in the database.

### Token Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/auth/tokens` | List your tokens (metadata only, no hashes) |
| `POST` | `/api/auth/tokens` | Create a token |
| `DELETE` | `/api/auth/tokens/:id` | Revoke a token |

**Create token body:**

```json
{
  "label": "Home Assistant",
  "expiresAt": 1735689600000
}
```

`label` is required (1–100 printable ASCII chars). `expiresAt` is optional (epoch ms, must be in the future).

### Entries

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/entries` | List entries (all or filtered by date range) |
| `POST` | `/api/entries` | Create an entry |
| `PUT` | `/api/entries/:id` | Update an entry (partial) |
| `DELETE` | `/api/entries/:id` | Delete an entry |
| `POST` | `/api/entries/start` | Start a timer |
| `POST` | `/api/entries/:id/stop` | Stop a running timer |

#### Get entries

Without parameters, returns all entries. With date-range filtering:

```bash
# Entries for a specific day
curl -H 'Authorization: Bearer TOKEN' \
  'http://localhost:3000/api/entries?range=day&date=2026-04-10'

# Entries for a week, month, or year
curl -H 'Authorization: Bearer TOKEN' \
  'http://localhost:3000/api/entries?range=week&date=2026-04-10'
curl -H 'Authorization: Bearer TOKEN' \
  'http://localhost:3000/api/entries?range=month&date=2026-04-01'
curl -H 'Authorization: Bearer TOKEN' \
  'http://localhost:3000/api/entries?range=year&date=2026-01-01'
```

Both `range` and `date` must be provided together, or neither. The `date` parameter is interpreted as **UTC**. Entries whose time span overlaps the range are included, including running timers.

#### Create an entry

```bash
curl -X POST -H 'Authorization: Bearer TOKEN' \
  -H 'Content-Type: application/json' \
  http://localhost:3000/api/entries \
  -d '{
    "categoryId": "CAT_UUID",
    "start": 1712736000000,
    "end": 1712739600000,
    "running": false,
    "comment": "Morning run"
  }'
```

`end` can be `null` if `running` is `true`. Timestamps are epoch milliseconds (UTC). The server generates an `id` automatically; you can optionally provide your own UUID.

#### Start a timer

Creates a running entry with server-set timestamps — clients cannot forge the start time. Returns `409` if the category already has a running timer.

```bash
curl -X POST -H 'Authorization: Bearer TOKEN' \
  -H 'Content-Type: application/json' \
  http://localhost:3000/api/entries/start \
  -d '{"categoryId":"CAT_UUID","comment":"Deep work session"}'
```

`comment` is optional (defaults to `""`).

#### Stop a timer

Sets the end time server-side. Returns `409` if the entry is not currently running.

```bash
curl -X POST -H 'Authorization: Bearer TOKEN' \
  http://localhost:3000/api/entries/ENTRY_UUID/stop
```

#### Update an entry

Partial updates — only include the fields you want to change:

```bash
curl -X PUT -H 'Authorization: Bearer TOKEN' \
  -H 'Content-Type: application/json' \
  http://localhost:3000/api/entries/ENTRY_UUID \
  -d '{"comment":"Updated note","end":1712739600000,"running":false}'
```

#### Delete an entry

```bash
curl -X DELETE -H 'Authorization: Bearer TOKEN' \
  http://localhost:3000/api/entries/ENTRY_UUID
```

### Categories

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/categories` | List all categories |
| `POST` | `/api/categories` | Create a category |
| `PUT` | `/api/categories/:id` | Update a category (partial) |
| `DELETE` | `/api/categories/:id` | Delete a category (cascades to entries) |

### Days

Daily free-form notes, keyed by calendar date (`YYYY-MM-DD`).

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/days?q=...` | Search day notes (case-insensitive substring, capped at 1000 results) |
| `GET` | `/api/days/:date` | Get the note for a date (returns `{ date, notes: "" }` if none exists) |
| `PUT` | `/api/days/:date` | Upsert the note for a date |

**Update body:**

```json
{ "notes": "Free-form text, up to 10000 characters" }
```

### Data Import & Export

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/data/export` | Export all categories, entries, and day notes for the user |
| `POST` | `/api/data/import` | Replace all user data with the provided payload |

### Status Codes

Successful creation endpoints return `201 Created`. All other successful requests return `200 OK`.

### Error Responses

All errors return JSON with `statusCode` and `statusMessage`:

```json
{ "statusCode": 401, "statusMessage": "Invalid or expired API token" }
```

| Code | Meaning |
|------|---------|
| `400` | Bad request (e.g. invalid input) |
| `401` | Missing or invalid authentication |
| `404` | Resource not found or belongs to another user |
| `409` | Conflict (e.g. timer already running for category, duplicate ID) |
| `413` | Request body too large |
| `422` | Validation error (invalid request body or query params) |
| `429` | Too many requests (rate limited) |

## Development

[![CI](https://github.com/iamschulz/tend/actions/workflows/ci.yml/badge.svg)](https://github.com/iamschulz/tend/actions/workflows/ci.yml)
[![Netlify Status](https://api.netlify.com/api/v1/badges/cc781baa-99c4-4180-9827-800b1c692ff8/deploy-status)](https://app.netlify.com/projects/tend-iamschulz/deploys)

### Setup

1. Install dependencies:
   ```sh
   npm install
   ```

2. Start the dev server:
   ```sh
   npm run dev
   ```

The app runs at `http://localhost:3000` in standalone mode by default (data in IndexedDB, no auth).

You can start the app in server mode with the docker-compose.yml

```sh
docker compose up -d --build
```

### Seeding Data

To generate sample data for development:

```sh
npm run seed
```

This creates a `tmp/seed-data.json` file with categories and entries. Open the app, go to the main menu, and use the import function to load it.

### Testing

Install playwright before e2e testing:
```sh
npx install playwright
```

```sh
npm run lint         # code linting
npm run test:unit    # unit tests
npm run test:e2e     # end-to-end tests (builds first)
```

### Linting

```sh
npm run lint         # check
npm run lint:fix     # auto-fix
```