# Multi-stage Dockerfile for ElfZero Autonomous Solana Guardian
# ------------------------------------------------------------
# Stage 1: Build the React Frontend SPA
FROM node:22-bookworm-slim AS frontend-builder
WORKDIR /app/frontend

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY frontend/package.json ./
COPY frontend/ ./
RUN pnpm install
RUN pnpm build

# ------------------------------------------------------------
# Stage 2: Production Runtime (Express + LiteSVM + Static Frontend)
FROM node:22-bookworm-slim AS runner
WORKDIR /app

# Install CA certificates for secure Devnet & OpenAI TLS handshakes
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    && rm -rf /var/lib/apt/lists/*

RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy backend manifests and install dependencies (including native litesvm bindings)
COPY backend/package.json ./backend/
WORKDIR /app/backend
RUN pnpm install

# Copy application code, SBF payloads, and built static UI
WORKDIR /app
COPY backend ./backend
COPY payloads ./payloads
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Set active execution directory
WORKDIR /app/backend

# Production environment defaults
ENV NODE_ENV=production
ENV PORT=3001
ENV SOLANA_RPC_URL=https://api.devnet.solana.com
ENV PROGRAM_ID=D8r3d2uXQn9wYE96BRjyYqmqReFbziK5rfSwdYvHEtkT

EXPOSE 3001

CMD ["pnpm", "exec", "tsx", "src/index.ts"]
