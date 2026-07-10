# Project Nova (Backend API & MCP Server)

The backend for Project Nova is a high-performance, strictly typed REST API and Model Context Protocol (MCP) server built to handle global supply chain data for a sustainable tech brand. It connects a React/Vite frontend to a complex PostgreSQL database, while simultaneously exposing safe, rate-limited data execution tools to AI Agents.

## 🚀 Deployment Domains

- **Production API:** [https://api.nova.abhiseck.dev](https://api.nova.abhiseck.dev)
- **Production Frontend:** [https://nova.abhiseck.dev](https://nova.abhiseck.dev)

## 🛠️ The Tech Stack

- **Core Framework:** Hono (Running on `@hono/node-server`)
- **Database ORM:** Prisma
- **Database Engine:** PostgreSQL
- **Validation & Typing:** Zod + `@hono/zod-validator`
- **Documentation:** `@hono/zod-openapi` + `@hono/swagger-ui`
- **AI Integration:** Vercel AI SDK (`ai`, `@ai-sdk/google`)
- **Caching & Rate Limiting:** Redis + Keyv + `hono-rate-limiter`
- **Authentication:** `hono/jwt` + Argon2 + `@simplewebauthn/server`
