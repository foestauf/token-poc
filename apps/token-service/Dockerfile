# Stage 1: Dependencies (from monorepo root)
FROM node:24-alpine AS deps
RUN corepack enable && corepack prepare pnpm@10.28.2 --activate
WORKDIR /app

# Copy workspace configuration
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/token-utils/package.json ./packages/token-utils/
COPY apps/token-service/package.json ./apps/token-service/

# Install all dependencies
RUN pnpm install --frozen-lockfile

# Stage 2: Build
FROM node:24-alpine AS builder
RUN corepack enable && corepack prepare pnpm@10.28.2 --activate
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/token-utils/node_modules ./packages/token-utils/node_modules
COPY --from=deps /app/apps/token-service/node_modules ./apps/token-service/node_modules
COPY . .

# Build shared package then app
RUN pnpm --filter @token-poc/token-utils build
RUN pnpm --filter @token-poc/token-service build

# Stage 3: Production
FROM node:24-alpine AS runner
RUN corepack enable && corepack prepare pnpm@10.28.2 --activate

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 appuser

WORKDIR /app

# Copy production dependencies
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/token-utils/node_modules ./packages/token-utils/node_modules
COPY --from=deps /app/apps/token-service/node_modules ./apps/token-service/node_modules

# Copy built applications
COPY --from=builder /app/packages/token-utils/dist ./packages/token-utils/dist
COPY --from=builder /app/packages/token-utils/package.json ./packages/token-utils/
COPY --from=builder /app/apps/token-service/dist ./apps/token-service/dist
COPY --from=builder /app/apps/token-service/package.json ./apps/token-service/

# Copy root configs needed at runtime
COPY package.json pnpm-workspace.yaml ./

RUN chown -R appuser:nodejs /app

USER appuser

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

WORKDIR /app/apps/token-service
CMD ["node", "--require", "./dist/tracing.js", "dist/main.js"]
