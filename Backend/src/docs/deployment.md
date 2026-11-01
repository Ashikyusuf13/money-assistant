# Money Assistant Backend — Production Deployment & Operations Guide

## 1. Overview & Architecture

The **Money Assistant Backend** is an enterprise-grade RESTful API built with Node.js, Express, TypeScript, and MongoDB. It tracks salaries, incomes, expenses, budgets, savings goals, financial reports, and provides an AI-assisted financial advisor.

### Architecture Topology
```
                          [ Client Applications ]
                         (React Native / Expo / Web)
                                     │
                                     ▼ (HTTPS:443)
                        [ Nginx / Cloudflare CDN ]
                    (SSL Termination & DDoS Mitigation)
                                     │
                                     ▼ (HTTP:5000)
            ┌──────────────────────────────────────────────────┐
            │       Money Assistant API Service (Node.js)       │
            │  - Express.js with Helmet, CORS, Rate Limiting   │
            │  - Correlation ID injection (X-Request-Id)       │
            │  - Strict Zod validation & Safe Integer Paise    │
            │  - Non-root container process (USER node)        │
            └────────────────────────┬─────────────────────────┘
                                     │
                                     ▼ (TCP:27017)
                 [ MongoDB 7.0+ Replica Set Cluster (rs0) ]
                  (ACID Multi-Document Transactions & Data)
```

---

## 2. Production Environment Variables Reference

Store these securely using secrets management tools (AWS Secrets Manager, HashiCorp Vault, Doppler, or Docker Secrets). Never commit raw `.env` files to version control.

| Variable | Type | Example / Default | Required | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| `NODE_ENV` | `string` | `production` | Yes | Switches Express and error handlers to production mode (disables debug stacks). |
| `PORT` | `number` | `5000` | Yes | HTTP port the server listens on. |
| `APP_NAME` | `string` | `Money Assistant API` | No | Display name used in health check and logs. |
| `MONGODB_URI` | `string` | `mongodb+srv://user:pass@cluster.mongodb.net/money_assistant?retryWrites=true&w=majority` | Yes | MongoDB connection string. Must be a replica set. |
| `JWT_ACCESS_SECRET` | `string` | `min-32-char-random-high-entropy-string` | Yes | HMAC secret for signing short-lived access JWTs. |
| `JWT_REFRESH_SECRET`| `string` | `min-32-char-random-high-entropy-string` | Yes | HMAC secret for signing rotating refresh JWTs. |
| `JWT_ACCESS_EXPIRY` | `string` | `15m` | Yes | Expiration window for access tokens. |
| `JWT_REFRESH_EXPIRY`| `string` | `7d` | Yes | Expiration window for refresh tokens. |
| `BCRYPT_SALT_ROUNDS`| `number` | `12` | Yes | Work factor for bcrypt password hashing (12 recommended). |
| `CORS_ORIGINS` | `string` | `https://app.moneyassistant.com,https://api.moneyassistant.com` | Yes | Comma-separated list of permitted origins. |
| `LOG_LEVEL` | `string` | `info` | No | Minimum level for structured JSON logging (`info`, `warn`, `error`). |
| `RATE_LIMIT_WINDOW_MS`| `number` | `900000` (15 min) | Yes | Time window for global rate limiter. |
| `RATE_LIMIT_MAX` | `number` | `100` | Yes | Maximum requests per IP within the rate limit window. |
| `OPENAI_API_KEY` | `string` | `sk-proj-...` | No | OpenAI API key for AI assistant. If omitted, mock/fallback engine is used. |
| `OPENAI_MODEL` | `string` | `gpt-4o-mini` | No | OpenAI model version used for insights. |

---

## 3. Deployment Methods

### Method A: Docker & Docker Compose (Recommended)

1. **Verify Environment Configuration:**
   Create a production `.env` file on your server (or inject environment variables into your orchestrator).

2. **Start the Stack:**
   ```bash
   docker compose up -d --build
   ```

3. **Verify Container Health:**
   ```bash
   docker compose ps
   docker compose logs -f app
   ```

4. **Verify Healthcheck:**
   ```bash
   curl -i http://localhost:5000/api/v1/health
   curl -i http://localhost:5000/api/v1/ready
   ```

### Method B: PM2 on Ubuntu / Linux VPS

1. **Install Prerequisites:**
   ```bash
   sudo apt update && sudo apt install -y nodejs npm git
   sudo npm install -g pm2
   ```

2. **Clone & Build:**
   ```bash
   git clone <repo-url> /opt/money-assistant
   cd /opt/money-assistant/Backend
   npm ci
   npm run build
   ```

3. **Start with PM2 Cluster Mode:**
   ```bash
   pm2 start ecosystem.config.cjs --env production
   pm2 save
   pm2 startup
   ```

4. **Monitoring:**
   ```bash
   pm2 status
   pm2 logs money-assistant-api
   ```

### Method C: Cloud Run / AWS ECS / Kubernetes

Deploy the container using the provided `Dockerfile`. Configure liveness and readiness probes:
- **Liveness Probe:** `HTTP GET /api/v1/health` (Port 5000, Initial Delay: 10s, Period: 15s)
- **Readiness Probe:** `HTTP GET /api/v1/ready` (Port 5000, Initial Delay: 5s, Period: 10s)

---

## 4. Database Setup, Indexes & Transactions

### MongoDB Replica Set Requirement
Money Assistant requires MongoDB to run as a **Replica Set** (e.g. `rs0` or MongoDB Atlas cluster) so that multi-document financial ledger operations execute under ACID transactions:
- Multi-document transactions guarantee that when transferring money or logging savings goal contributions, both account balance deduction and transaction insertion either commit together or roll back completely.

### Index Verification
Indexes are defined in each Mongoose schema and automatically built at boot:
```bash
# Verify index creation manually if needed:
node -e "const { connectDatabase } = require('./dist/config/database'); connectDatabase().then(() => console.log('Indexes synced successfully'));"
```

Primary indexes include:
- `users`: `{ email: 1 }` (unique)
- `accounts`: `{ userId: 1, name: 1 }` (unique), `{ userId: 1, isDefault: 1 }`
- `salaries`: `{ userId: 1, effectiveDate: -1 }`
- `transactions`: `{ userId: 1, date: -1 }`, `{ userId: 1, category: 1 }`, `{ userId: 1, idempotencyKey: 1 }` (unique, partialFilterExpression for strings)
- `budgets`: `{ userId: 1, category: 1, month: 1 }` (unique)
- `goals`: `{ userId: 1, priority: 1 }`, `{ userId: 1, isArchived: 1 }`
- `goal_contributions`: `{ goalId: 1, date: -1 }`
- `sessions`: `{ refreshTokenHash: 1 }` (unique), `{ expiresAt: 1 }` (TTL index)

---

## 5. Backup, Disaster Recovery & Maintenance

### 1. Automated Daily Backups (`mongodump`)
Set up a daily cron job to dump database state to compressed BSON:
```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/var/backups/mongodb/$DATE"
mkdir -p "$BACKUP_DIR"

mongodump --uri="$MONGODB_URI" --gzip --out="$BACKUP_DIR"

# Encrypt and upload to AWS S3 / Cloud Storage
aws s3 sync "$BACKUP_DIR" s3://my-org-money-backups/"$DATE"/ --sse aws:kms

# Retain local backups for 7 days
find /var/backups/mongodb -maxdepth 1 -type d -mtime +7 -exec rm -rf {} +
```

### 2. Database Restore Drill (`mongorestore`)
To restore from backup:
```bash
mongorestore --uri="$MONGODB_URI" --gzip --drop /var/backups/mongodb/<DATE>/money_assistant
```

---

## 6. Security Hardening & Zero-Leakage Assurances

1. **Helmet Security Headers:**
   All HTTP responses automatically include `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `Strict-Transport-Security`, and disabled `X-Powered-By`.
2. **CORS Enforcement:**
   Strict whitelist matching. Direct mobile clients (which send null origins) are permitted, while unauthorized web domains are rejected with a CORS error.
3. **Structured Logging & Redaction:**
   All logs are written as JSON objects. The `logger.ts` utility recursively intercepts and masks all sensitive keys (`password`, `passwordHash`, `refreshToken`, `accessToken`, `authorization`, `apiKey`, `OPENAI_API`, etc.) with `[REDACTED]`.
4. **Zero Stack-Trace Leakage:**
   In production (`NODE_ENV=production`), Express error handling guarantees no file paths or stack traces are ever emitted in HTTP responses. All unhandled errors return generic `INTERNAL_SERVER_ERROR` with HTTP 500.
5. **Non-Root Docker Execution:**
   The `Dockerfile` creates and runs the process under the `node` non-root user (UID 1000).
6. **Graceful Shutdown:**
   The process handles `SIGTERM` and `SIGINT` cleanly: stops accepting new connections, allows pending requests to finish, disconnects from MongoDB cleanly, and exits with code 0.

---

## 7. Production Readiness Checklist

Before public launch, verify:

- [x] TypeScript builds cleanly with `npm run build` (`npx tsc --project tsconfig.json`).
- [x] Test suite passes 100% of unit and integration tests (`npm test`).
- [x] Strong random secrets generated for `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` (>= 32 chars).
- [x] Production database is configured as a replica set with SSL/TLS enabled (`tls=true`).
- [x] Database indexes verified via automated index builds.
- [x] Sensitive keys verified redacted in application logs.
- [x] Rate limiting verified for auth endpoints (5 req/15 min) and global endpoints (100 req/15 min).
- [x] Liveness (`/api/v1/health`) and Readiness (`/api/v1/ready`) probes responding with 200 OK.
- [x] Automated daily backup cron with S3 sync tested and verified.
- [x] Non-root execution in Docker verified.
- [x] Mobile app client integrated and tested with refresh token rotation and bearer auth.
