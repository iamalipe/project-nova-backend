# ==========================================
# Stage 1: Build Environment
# ==========================================
FROM node:20-slim AS builder

# Prisma requires OpenSSL to run natively
# RUN apt-get update -y && apt-get install -y openssl

WORKDIR /app

# Copy dependency files and install ALL dependencies (including devDeps like TypeScript)
COPY package*.json ./
RUN npm ci

# Copy all source code, including the prisma/ directory and prisma.config.ts
COPY . .

# Generate the Prisma client fresh from the current schema — don't rely on
# whatever happens to be committed in prisma-generated/, it can drift.
RUN npx prisma generate

# Compile TypeScript to JavaScript (Outputs to the 'build' folder)
RUN npm run build

# ==========================================
# Stage 2: Production Environment
# ==========================================
FROM node:20-slim

# OpenSSL is also required in the runtime environment for Prisma
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy dependency files and install ONLY production dependencies to save space
COPY package*.json ./
RUN npm ci --omit=dev

# Copy the prisma folder AND the new configuration file from the builder
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts

# Generate the Prisma client specifically for the production node_modules
# RUN npx prisma generate

# Copy the compiled JavaScript code from the builder stage
COPY --from=builder /app/build ./build

ENV NODE_ENV=production

EXPOSE 3000

# Run node directly rather than through "npm start" — avoids depending on
# cross-env (a devDependency, not guaranteed present after --omit=dev) and
# lets Node receive SIGTERM directly from `docker stop` instead of through npm.
CMD ["node", "build/main.js"]