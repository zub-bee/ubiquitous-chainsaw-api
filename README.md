# Ubiquitous Chainsaw Profiles API

Node.js Express API for profile management with GitHub OAuth, natural language search, and a CLI tool. Integrates Genderize.io, Agify.io, Nationalize.io, and REST Countries APIs with PostgreSQL + Redis.

## Table of Contents

- [System Architecture](#system-architecture)
- [Authentication Flow](#authentication-flow)
- [Token Handling](#token-handling)
- [Role Enforcement](#role-enforcement)
- [Multi-Interface Support](#multi-interface-support)
- [Natural Language Parsing](#natural-language-parsing)
- [Rate Limiting](#rate-limiting)
- [Request Logging](#request-logging)
- [CLI Usage](#cli-usage)
- [API Endpoints](#api-endpoints)
- [Setup](#setup)
- [Stack & External APIs](#stack--external-apis)

<!-- **API:** [https://ubiquitous-chainsaw-production-73a8.up.railway.app](https://ubiquitous-chainsaw-production-73a8.up.railway.app) -->
<!-- **Web Portal:** [https://insighta-web-portal.up.railway.app](https://insighta-web-portal.up.railway.app/) -->

This powers two services: a [web portal](https://github.com/zub-bee/insighta-web-portal) and a [CLI tool](https://github.com/zub-bee/insighta-cli-tool)

## System Architecture

Express.js → PostgreSQL + Redis → External APIs (Genderize, Agify, Nationalize, GitHub OAuth, REST Countries)

Clients (Web Portal + CLI) -> Middleware (CORS, Redis session, JWT auth, admin check) -> Routes (`/auth`, `/api/profiles`, `/api/users`, `/api/classify`) -> Data (PostgreSQL: profiles/users · Redis: sessions/token blacklist)

## Authentication Flow

**GitHub OAuth 2.0 with PKCE (S256):**

- **Web:** `GET /auth/github` generates a `state` nonce + PKCE challenge stored in the Redis session → GitHub redirects to `GET /auth/github/callback` → backend validates `state`, exchanges code + `code_verifier`, creates/retrieves user → sets HTTP-only cookies (`access_token` 3 min, `refresh_token` 5 min) → redirects to dashboard.
- **CLI:** `insighta login` opens browser to `GET /auth/github` → user authorizes → CLI posts `{code, code_verifier}` to `POST /auth/github/cli/callback` → receives tokens in JSON → saved to `~/.insighta/credentials.json`.

| Client     | Token transport                                                            |
| ---------- | -------------------------------------------------------------------------- |
| Web Portal | HTTP-only cookie (`access_token`, set automatically by browser)            |
| CLI / API  | `Authorization: Bearer <token>` header (or `Cookie: access_token=<token>`) |

Security: PKCE prevents code interception; `state` mismatch returns `403`; HTTP-only cookies prevent XSS theft; used tokens are blacklisted in Redis on logout/refresh.

## Token Handling

| Token   | Lifetime | Web storage      | CLI storage                    |
| ------- | -------- | ---------------- | ------------------------------ |
| Access  | 3 min    | HTTP-only cookie | `~/.insighta/credentials.json` |
| Refresh | 5 min    | HTTP-only cookie | `~/.insighta/credentials.json` |

**Web auto-refresh** (`middlewares/authenticate.js`): on `TokenExpiredError`, middleware reads the `refresh_token` cookie, verifies it is not blacklisted, blacklists both old tokens, issues a fresh pair as HTTP-only cookies, and continues the request transparently. If the refresh token is also expired/blacklisted → `401 "Refresh token expired. Please log in again."`.

**CLI refresh**: on `401 "Access Token has expired"`, the CLI posts `{ "refresh_token": "..." }` to `POST /auth/refresh`, saves the new pair to `~/.insighta/credentials.json`, and retries the original request.

## Role Enforcement

The first user registered via GitHub OAuth receives `admin`; every subsequent user receives `analyst` (stored in `users.role`). `middlewares/adminAccess.js` returns `403` for non-admin requests to protected routes.

| Role    | Permitted endpoints                                                                                                               |
| ------- | --------------------------------------------------------------------------------------------------------------------------------- |
| admin   | All analyst endpoints + `POST /api/profiles`, `DELETE /api/profiles/:id`, `GET /api/profiles/export`, `GET/DELETE /api/users/:id` |
| analyst | `GET /api/profiles`, `/api/profiles/search`, `/api/profiles/:id`, `/api/profiles/dashboard`, `/api/classify`, `/api/users/me`     |

## Multi-Interface Support

All requests to `/api/profiles` and `/api/users` require `X-API-Version: 1` (enforced by `middlewares/checkHeader.js`; missing → `400 "API version header required"`; wrong value → `400 "Incorrect API version header"`). Auth endpoints are exempt.

- **Web Portal** (`js/api.js`): `axios` with `withCredentials: true` and `X-API-Version: 1`. A response interceptor calls `POST /auth/refresh` on `401` and retries transparently.
- **CLI** (`cli-tool/`): sends `Authorization: Bearer <token>` + `X-API-Version: 1`; calls `POST /auth/refresh` on `401` and retries automatically.

## Natural Language Parsing

Rule-based, no AI/LLMs (`models/retrieveProfileData.js`).

**Keywords:** gender (`male`/`female`), age groups (`child`, `teenager`, `adult`, `senior`), age ranges (`young` → 16–24, `above`/`over X`, `below`/`under X`), any country name (resolved via REST Countries API → ISO 3166 code).

**Logic:** lowercase query → extract gender → extract country → extract age group → extract age ranges (regex `/(?:above|over)\s+(\d+)/`) → build `WHERE` clause (AND). Example: `"adult males from kenya"` → `WHERE gender='male' AND age_group='adult' AND country_id='KE'`

**Limitations:** fixed keywords only, no synonyms, AND logic only, one age group per query.

## Rate Limiting

Redis-backed via `express-rate-limit` + `rate-limit-redis` (`middlewares/rateLimit.js`):

| Limiter       | Routes                                         | Window | Limit       |
| ------------- | ---------------------------------------------- | ------ | ----------- |
| `authLimiter` | `/auth/*`                                      | 1 min  | 10 requests |
| `apiLimiter`  | `/api/classify`, `/api/profiles`, `/api/users` | 1 min  | 60 requests |

Exceeded → `429 { "error": "Too Many Requests", "message": "Rate limit exceeded. Try again in 1 minute." }`. IPv6 `/56` subnet grouping prevents subnet-hopping abuse.

## Request Logging

Inline `app.js` middleware logs `METHOD /path STATUS DURATIONms` for every completed response using `console.log`. No external library.

## CLI Usage

```bash
cd cli-tool && npm install && npm link

insighta login / whoami / logout
insighta get-profiles [--gender male] [--page 2]
insighta search-profiles "adult males from kenya"
insighta get-profiles-by-id <UUID>
insighta create-profiles --name John          # admin only
insighta export-profiles --format csv         # admin only
```

## API Endpoints

| Method   | Path                        | Role    | Description                                    |
| -------- | --------------------------- | ------- | ---------------------------------------------- |
| `POST`   | `/api/profiles`             | admin   | Create profile from name                       |
| `GET`    | `/api/profiles`             | analyst | List with filters (gender, country, age)       |
| `GET`    | `/api/profiles/search?q=`   | analyst | Natural-language search (paginated)            |
| `GET`    | `/api/profiles/:id`         | analyst | Get profile by UUID                            |
| `DELETE` | `/api/profiles/:id`         | admin   | Delete profile                                 |
| `GET`    | `/api/profiles/export`      | admin   | Download CSV (same filters as list)            |
| `GET`    | `/api/profiles/dashboard`   | analyst | Aggregate stats by gender/age/country          |
| `GET`    | `/api/classify?name=`       | analyst | Name classification (gender, age, nationality) |
| `GET`    | `/api/users`                | admin   | List all users                                 |
| `DELETE` | `/api/users/:id`            | admin   | Delete user                                    |
| `GET`    | `/api/users/me`             | any     | Current user info                              |
| `GET`    | `/auth/github`              | —       | Start web OAuth (rate-limited)                 |
| `GET`    | `/auth/github/callback`     | —       | Web OAuth callback (sets cookies)              |
| `POST`   | `/auth/github/cli/callback` | —       | CLI OAuth — body: `{code, code_verifier}`      |
| `POST`   | `/auth/refresh`             | —       | Exchange refresh token for new pair            |
| `POST`   | `/auth/logout`              | —       | Blacklist tokens and clear cookies             |

## Setup

**Prerequisites:** Node.js 16+, PostgreSQL 12+, Redis, GitHub OAuth App

```env
PORT=3000
NODE_ENV=development
DATABASE_URL=postgresql://user:password@localhost:5432/profiles_db
REDIS_URL=redis://localhost:6379
GITHUB_CLIENT_ID=your_client_id
GITHUB_CLIENT_SECRET=your_client_secret
REDIRECT_URI=http://localhost:3000/auth/github/callback
JWT_SECRET=your_jwt_secret
REFRESH_SECRET=your_refresh_secret
SESSION_SECRET=your_session_secret
FRONTEND_URL=http://localhost:5500
```

```bash
npm install
redis-server &   # start Redis
npm start        # start API (tables auto-created on startup)
```

GitHub OAuth App → callback URL: `http://localhost:3000/auth/github/callback`. Railway-ready (`railway.toml`, `nixpacks.toml` included).

---

## Stack & External APIs

- Stack
  - Node.js: https://nodejs.org/
  - Express: https://expressjs.com/
  - PostgreSQL: https://www.postgresql.org/
  - Redis: https://redis.io/
  - JSON Web Tokens (JWT): https://jwt.io/
  - GitHub OAuth: https://docs.github.com/en/apps/oauth-apps
  - Axios: https://github.com/axios/axios
  - json2csv: https://github.com/zemirco/json2csv
  - cli-table3: https://github.com/cli-table/cli-table3
  - Ora: https://github.com/sindresorhus/ora

- External APIs
  - Genderize.io: https://genderize.io/
  - Agify.io: https://agify.io/
  - Nationalize.io: https://nationalize.io/
  - REST Countries: https://restcountries.com/
