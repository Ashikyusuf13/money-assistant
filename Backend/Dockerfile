# Multi-stage Dockerfile for Money Assistant Backend
# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency specifications
COPY package*.json ./
RUN npm ci

# Copy TypeScript configuration and source code
COPY tsconfig.json ./
COPY src/ ./src/

# Compile TypeScript to JavaScript
RUN npm run build

# Prune devDependencies to keep production image lean
RUN npm prune --production

# ─────────────────────────────────────────────────────────────────────────────
# Production runtime stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

# Install dumb-init or curl if needed for healthcheck
RUN apk add --no-cache curl

# Copy runtime node_modules and compiled output
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

# Create non-root user and assign permissions for security hardening
USER node

EXPOSE 5000

# Health check probe against Express /health endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:5000/api/v1/health || exit 1

# Start compiled server
CMD ["node", "dist/server.js"]
