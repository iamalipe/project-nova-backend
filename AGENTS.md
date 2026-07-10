# Agent Guidelines & Development Commands

This file serves as a guide for AI agents and developers working on this Express + TypeScript backend template. It outlines the project's structure, coding rules, standard conventions, and essential command-line tools.

---

## 🛠️ Technology Stack & Key Dependencies

- **Core**: Node.js, Express, TypeScript (`ts-node`, `tsconfig.json`)
- **Database**: MongoDB via Mongoose
- **Caching**: Keyv and Redis
- **Validation**: Zod (for request body, query, and parameter schema enforcement)
- **Utilities**: `dayjs` (for date-time manipulation), `winston` & `morgan` (for logging), `multer` & `@aws-sdk/client-s3` (for S3 file uploads)
- **Metrics & Tracing**: Prometheus (`prom-client`), OpenTelemetry/SigNoz integration
- **Load Testing**: k6 performance test suite

---

## 📐 Project Structure

Code is organized logically by responsibility:

```
├── app/                       # Application domain modules
│   ├── auth/                  # Authentication module (models, routes, controllers)
│   ├── blog/                  # Blog domain module
│   ├── changeLog/             # Changelog domain module
│   ├── copyMe/                # Template copy module (used for boilerplate generation)
│   ├── product/               # Product domain module
│   ├── testing/               # Developer-only testing endpoints & mock controllers
│   ├── app.controller.ts      # Top-level routes (root, healthcheck)
│   └── app.route.ts           # Central API router combining all domain routes
├── config/                    # Configuration loading and type safety
├── middlewares/               # Express global/reusable middlewares
├── migrate/                   # Database migrations and data seeding scripts
├── services/                  # Database connections and cache initializers
├── types/                     # Shared TypeScript interfaces & types
├── utils/                     # Utility helpers (auth, errors, logger, validation)
└── main.ts                    # Application entry point
```

---

## 📜 Coding Conventions & Rules

When modifying or extending the codebase, strictly adhere to the following rules:

### 1. TypeScript & Code Style
- Always write type-safe code using TypeScript. Avoid `any` types wherever possible.
- Use ES modules syntax (`import`/`export`) consistently.
- Keep the code clean and formatted. The configuration in [.prettierrc](file:///.prettierrc) should be followed.
- Before committing any changes, run the TypeScript compiler (`npm run build`) to ensure type correctness.

### 2. Date and Time Format
- **Strict Rule**: Always use **ISO 8601** format for date-times (`YYYY-MM-DDTHH:mm:ssZ` or similar).
- Leverage `dayjs` for all date-time calculations, checks, and formatting.

### 3. Request Validation
- Validate all incoming API requests (body, query params, path params) using **Zod**.
- Use the `validate` middleware located in [validate.middlewares.ts](file:///middlewares/validate.middlewares.ts).
- For files and uploads, use the `validateMulter` middleware and the predefined file schemas from [validation.utils.ts](file:///utils/validation.utils.ts) (e.g., `zFile` or `zFileS3`).
- **Example Usage**:
  ```typescript
  import { validate } from '../../middlewares/validate.middlewares';
  import { z } from 'zod';

  const userSchema = z.object({
    body: z.object({
      email: z.string().email(),
      name: z.string().min(2),
    }),
  });

  router.post('/register', validate(userSchema), registerController);
  ```

### 4. Error Handling
- Custom operational errors should be thrown using the global `AppError` class, defined in [appError.utils.ts](file:///utils/appError.utils.ts).
- Avoid manually returning error responses like `res.status(400).json(...)` inside controllers; instead, throw an `AppError` and let the [globalErrorHandler](file:///middlewares/error.middlewares.ts) manage it.
- **Example Usage**:
  ```typescript
  if (!user) {
    throw new AppError('User not found', { status: 404, path: 'email' });
  }
  ```

### 5. Configuration & Environment Variables
- All environment variables must be declared in [.env](file:///.env) and added to [config/default.ts](file:///config/default.ts) to maintain strict typing.
- Never hardcode secrets, ports, or integration URLs.

---

## 💻 Standard Development & Testing Commands

Ensure all dependencies are installed using `npm install` before running these.

### 🚀 Running the Server

- **Start in Development Mode** (auto-reloads on `.ts` file changes):
  ```bash
  npm run dev
  ```
- **Build the TypeScript Code**:
  ```bash
  npm run build
  ```
- **Start in Production Mode** (runs the compiled JavaScript in `build/`):
  ```bash
  npm run start
  ```

### 🗄️ Database & Dependencies

- **Run Database Migrations/Seeds**:
  ```bash
  npm run db:migrate
  ```
- **Check for Unused or Broken Dependencies**:
  ```bash
  npm run check:deps
  ```

### 🧪 API & Performance Testing

- **Load Testing (k6)**:
  Make sure you have `k6` installed on your system.
  ```bash
  k6 run k6-load-testing.js
  ```
  *(Optional: Configure `BASE_URL` inside `k6-load-testing.js` to target your local environment: `http://localhost:3000`)*

- **Manual Testing Endpoints**:
  In development mode, testing endpoints are exposed under `/api/testing/...`.
  - **Healthcheck**:
    ```bash
    curl -X GET http://localhost:3000/healthcheck
    ```
  - **Cache Test**:
    ```bash
    curl -X POST http://localhost:3000/api/testing/cache \
         -H "Content-Type: application/json" \
         -d '{"message": "Hello Redis Cache"}'
    ```
