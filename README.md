# 🌱 Tend

Tend is a friendly, privacy-focused habit and time tracking app. Create custom categories for your activities, track time spent on them, and set goals to build better habits.

I made this app for myself, because I wanted a privacy focused habit tracker. No company should have full access to everything you do, especially health related.

If you have suggestions or want to contribute, please reach out or open an issue.

## Features

- **Habit tracking**: as events or tracked time
- **Custom categories**: with notes, colors and emojis 🌱
- **Goals**: like "run 3 times per week" or "meditate 30 minutes per day"
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
         - NUXT_ADMIN_USERNAME=     # your login username
         - NUXT_ADMIN_PASSWORD=     # bcrypt hash of your password (see Security below)
         - NUXT_MAX_BODY_SIZE_MB=5       # optional, max request body in MB
         - NUXT_SESSION_MAX_AGE_DAYS=60  # optional, session lifetime in days
       restart: unless-stopped
   ```

2. Start the container:
   ```sh
   docker compose up -d
   ```

Tend will be available at `http://localhost:3000`.

### Authentication

Tend supports multiple authentication methods. Password-based accounts always work out of the box. OAuth providers are optional.

#### Password (default)

No extra configuration needed. The first user to register becomes admin. Additional users must be invited by the admin (via the admin panel's email allowlist).

#### OAuth Providers (optional)

Add any combination of these to your `docker-compose.yml` environment:

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

`NUXT_ADMIN_PASSWORD` must be a bcrypt hash, not a plaintext password. Generate one with Node.js:

```sh
node -e "require('bcryptjs').hash('yourpassword', 12).then(console.log)"
```
Please note that all `$` characters in the hash must be duplicated in the `docker-compose.yml` due do yml's character escaping.

If you expose Tend to the Internet, you must use HTTPS, or else the password and session cookie are transmitted in plain text and can be intercepted. It is highly adviced to use a self-signed cert and HSTS even when not exposed to the Internet.

Also run this comtainer root-less and check your database permissions:
```sh
chmod 600 ./data/tend.db
```

If your login gets compromised, set a new `NUXT_ADMIN_PASSWORD` and `NUXT_SESSION_PASSWORD` in the `docker-compose.yml`.

### Data & Backups

The SQLite database is stored at `./data/tend.db` on your host machine. To create a consistent backup, use the SQLite backup command:

```sh
sqlite3 ./data/tend.db ".backup ./data/tend-backup.db"
```

This is safer than copying the file directly while the app is running.

You can also manually export your data from the app in the main menu. Re-importing your data *will* overwrite everything in the app and server.

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