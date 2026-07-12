# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A Hono + Prisma/PostgreSQL API. It also runs a real Model Context Protocol (MCP) server exposing product CRUD as tools to AI agents, and a partial OAuth 2.0 authorization server for MCP client auth. This is the backend half of a two-repo project; the sibling frontend lives at `../project-nova-frontend` (React 19 + Vite). They communicate over HTTP with a cookie-based session (`access` JWT cookie) and are deployed separately (`api.nova.abhiseck.dev` / `nova.abhiseck.dev`).

## Commands

```bash
npm run dev         # tsx watch main.ts
npm run build        # tsc (emits to build/)
npm run start        # node build/index.js
npm run db:push      # prisma db push
npm run db:generate  # prisma generate
npm run db:seed      # tsx prisma/seed.ts
```

There is no test suite configured (`npm run test` is a stub that always fails; no vitest/jest config, no `*.test.ts`/`*.spec.ts` files exist) — don't invent test commands.

`.env` points at a live-looking database, AWS S3 bucket, and a Gemini API key — treat this as a real environment, not a disposable sandbox. Don't run destructive DB commands or seed scripts without checking with the user first.

No path aliases exist in `tsconfig.json` — all internal imports are relative (`../../services/prisma.service`), not `@/...`.

## Architecture

### Framework conventions (Hono, not Express)
- Use the Hono `Context` object (`c.req`, `c.json()`, `c.set()`/`c.get()`), never `req`/`res`.
- Route handlers generally have **no try/catch** — Hono propagates thrown errors to the global handler automatically. `globalErrorHandler` (`middlewares/error.middleware.ts`, registered via `app.onError()` in `main.ts`) handles `AppError`, `z.ZodError`, `Prisma.PrismaClientKnownRequestError`, and falls back to a generic 500 for anything else — in production, the raw message is replaced with "Internal Server Error"; in dev, `err.message` passes through.
- Request validation happens once per route via `validate.middleware.ts` (`validateRequest(schema)` from a module's `*.schema.ts`), which parses `body`/`query`/`params` and stores them in context (`c.get('body')`, etc.) — controllers read from context, they don't re-parse the request.

### Module layout (`app/<name>/`)
Each module is `*.controller.ts` + `*.route.ts` + `*.schema.ts`, and (only where there's real business logic to isolate) a `*.service.ts`:
- `product/` — has a service; this is the fullest CRUD reference (single/many create, update, single/bulk delete, paginated/sorted/searched list). It also exposes each operation as an `ai` SDK `tool()` (`createOneProductAITool`, etc.) that the MCP server wraps.
- `auth/` — controller-only (login, register, `/me`, logout, profile image update). No service layer.
- `mcp/` — `mcp.server.ts` builds the actual MCP server (`@modelcontextprotocol/sdk`) with tools for product create/read/update/delete (single + bulk); mounted under `/v1/mcp/*` with bearer-token auth, plus `/v1/mcp/connections/*` to list/revoke MCP client sessions.
- `oauth/` — partial OAuth 2.0 authorization-code flow (PKCE) so MCP clients can authenticate; some endpoints are scaffolded/commented out, don't assume it's complete.

### Auth (`middlewares/jwtAuth.middleware.ts`)
JWT lives in an httpOnly `access` cookie, verified via `hono/jwt`. On success the middleware looks up the user, **caching the result per-user for 5 minutes** under `jwt-auth-middleware-user:${id}` (via `services/cache.service.ts`, Keyv over Redis or in-memory), then does `c.set('user', user)` for downstream controllers to read via `c.get('user') as AuthUser`. `AuthUser` is `Omit<User, 'password'>` — always fetch with `omit: { password: true }` when populating anything that gets cached or put in context, so a password hash never ends up sitting in the cache. `services/socket.service.ts`'s Socket.IO auth (`authenticateSocket.middleware.ts`) mirrors this same cache-key pattern independently for socket connections.

**Gotcha to watch for**: the cache-miss branch fetches into a local variable and must *reassign* the outer `user` binding, not shadow it with a new `const user`/`let user` in the inner scope — a shadowed reassignment silently loses the fetched user (the outer binding stays `null`), so every downstream `user.id` access throws. This exact bug happened here once; if you touch this middleware, keep the fetch-then-reassign shape.

### Prisma
- Schema at `prisma/schema.prisma`; models are split across `prisma/models/*.prisma` (`user.prisma`: `User`, `UserSession`; `product.prisma`: `Product`; `oauth.prisma`: `McpOAuthClient`, `McpOAuthCode`). `prisma.config.ts` wires the schema/migrations paths and datasource URL.
- Generated client output goes to `prisma-generated/` (not the default `node_modules/.prisma`) — import the client from there, not from `@prisma/client` directly.
- `services/prisma.service.ts` exports the shared `db` client (via `@prisma/adapter-pg`) plus `dbConnect`/`dbDisconnect`, and instruments queries for Prometheus metrics.

### Other services (`services/`)
`cache.service.ts` (Keyv/Redis cache abstraction — `cacheConnect`, `cacheGet`, `cacheSet`, `cacheDel`), `s3.services.ts` (AWS S3 uploads, used by `middlewares/file.middleware.ts`), `email.services.ts` (SendGrid), `sms.services.ts` (Twilio), `socket.service.ts` (Socket.IO server + cross-module event listener registry, only initialized when `ENABLE_SOCKET=true`), `template.service.ts` (email/SMS templates), `tempLog.service.ts` (dev/debug logging).

### Request pipeline (`main.ts`)
Middleware order: `trimTrailingSlash` → request logger → `compress` → `bodyLimit` (10MB) → `cors` (against `FRONTEND_URL`/`WHITELISTED_DOMAINS`) → rate limiter (`limiter.middleware.ts`, 300 req/min/IP) → response-time metrics. Routes are mounted at `/oauth/*` and `/v1/*` (all app modules nest under `/v1`); API docs are served at `/docs` (Scalar or Swagger UI, basic-auth protected) and `/docs/json` (OpenAPI spec, `config/swagger.ts`). On startup: connect DB → connect cache → optionally init Socket.IO → optionally start the Prometheus metrics server.
