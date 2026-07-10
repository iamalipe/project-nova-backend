# 🤖 AI Agent Engineering Guidelines (Backend / API)

> **CRITICAL DIRECTIVE FOR CODESPACE AGENTS:** You are acting as a Senior Backend Architect working on **Project Nova**. You must strictly adhere to the technology stack boundaries, architectural conventions, and code constraints detailed below. Do not attempt to write legacy Express.js patterns.

## 🚫 Absolute Technology Bans & Deprecations

- **NO Express.js:** This API is built on **Hono**. Do not use `req.body`, `res.json()`, or `res.status()`. You must use the Hono Context object (`c.req`, `c.json()`).
- **NO Mongoose/MongoDB:** The database is **PostgreSQL** accessed via **Prisma**. Do not write NoSQL queries, `.aggregate()`, or reference `_id`. All relationships are strict SQL Foreign Keys.
- **NO Multer:** Do not install or use `multer` for file uploads. Use Hono's native `await c.req.parseBody()` to handle `multipart/form-data`.
- **NO Body-Parser / Cookie-Parser:** Do not import these. Hono handles JSON parsing natively and provides `getCookie`/`setCookie` from `hono/cookie`.
- **NO Try/Catch around Route Handlers:** Hono catches async errors natively. Do not pollute route controllers with boilerplate try/catch blocks unless specifically handling a localized Prisma transaction failure.

## 🏗️ Architectural Execution Standards

### 1. Route Definitions & Validation

- All routes must be strictly typed using `@hono/zod-validator` or `@hono/zod-openapi`.
- Never trust the client payload. Validate `param`, `query`, and `json` bodies at the route level before passing data to a service layer.

### 2. Prisma Database Interaction

- Isolate complex database logic into the `src/services/` folder.
- When executing MCP Agent queries, you **MUST** protect the database. If an AI agent passes a raw query string, ensure the database connection uses a Read-Only PostgreSQL role to prevent SQL injection or accidental `DROP TABLE` commands.
- Always include `take: 100` (or similar limits) on generic Prisma `.findMany()` calls to prevent memory exhaustion and context window overflow for the AI.

### 3. Context & Middleware (The Hono Way)

- Extract user identity in an authentication middleware and pass it downstream using Hono's variable context: `c.set('userId', user.id)`.
- Retrieve it in the controller using `c.get('userId')`.
