# syntax=docker/dockerfile:1

# ---- Build stage: compile TypeScript to dist/ ----
FROM node:24-alpine AS builder
WORKDIR /app

# Install all dependencies (including dev) for the build.
COPY package.json package-lock.json ./
RUN npm ci

# Compile the source.
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# tsc does not copy non-TS assets, so bring the SQL migrations into dist/
# where the compiled migrate.js expects them (dist/db/migrations).
RUN cp -r src/db/migrations dist/db/migrations

# ---- Production stage: lean runtime image ----
FROM node:24-alpine AS production
WORKDIR /app

ENV NODE_ENV=production

# Install only production dependencies.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Compiled app + runtime assets.
COPY --from=builder /app/dist ./dist
COPY data ./data

# Default configuration (overridable via docker-compose `environment` or `-e`).
# NOTE: JWT_SECRET here is a development default only — override it in real deployments.
ENV PORT=3000 \
    HOST=0.0.0.0 \
    JWT_SECRET=change-me-in-production \
    JWT_EXPIRES_IN=10m \
    LOCATIONS_FILE=data/locations.json \
    DATABASE_URL=postgresql://user:password@postgres:5432/restaurant_finder

COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

EXPOSE 3000

# Migrates, seeds, then starts the server.
ENTRYPOINT ["./docker-entrypoint.sh"]
