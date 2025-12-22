# TradesCaptain CRM - Deployment Guide

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Deployment Options](#deployment-options)
4. [CI/CD Pipeline](#cicd-pipeline)
5. [Production Checklist](#production-checklist)
6. [Monitoring & Alerting](#monitoring--alerting)
7. [Troubleshooting](#troubleshooting)
8. [Rollback Procedures](#rollback-procedures)

---

## Prerequisites

### Required Tools
- Node.js 20.x LTS
- npm 10.x or higher
- Git

### Required Accounts
- Supabase project (database)
- Vercel account (recommended hosting)
- Stripe account (payments)
- Sentry account (error monitoring)

### Optional Integrations
- Twilio (SMS)
- Resend (Email)
- OpenAI (AI features)
- Nylas (Calendar/Email sync)
- Google Cloud (Maps, OAuth)

---

## Environment Setup

### 1. Clone and Install

```bash
git clone <repository-url>
cd trades-captain-crm
npm install
```

### 2. Environment Variables

Copy the example environment file:
```bash
cp .env.example .env.local
```

#### Required Variables

| Variable | Description | Where to Get |
|----------|-------------|--------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Supabase Dashboard > Settings > API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key | Supabase Dashboard > Settings > API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | Supabase Dashboard > Settings > API |

#### Optional Variables

See `.env.example` for full list of configurable variables.

### 3. Database Setup

```bash
# Generate TypeScript types from Supabase
npm run db:types
```

**Note**: Database schema must be set up in Supabase. See `docs/DATABASE.md` for schema details.

### 4. Verify Local Setup

```bash
npm run dev
```

Visit `http://localhost:3000` to verify the application runs.

---

## Deployment Options

### Option 1: Vercel (Recommended)

1. **Connect Repository**
   - Go to [vercel.com](https://vercel.com)
   - Import your Git repository

2. **Configure Environment Variables**
   - Add all required environment variables in Vercel dashboard
   - Use different values for Preview and Production environments

3. **Deploy**
   - Push to main branch for production
   - Push to develop branch for preview deployments

### Option 2: Self-Hosted

1. **Build the Application**
```bash
npm run build
```

2. **Start Production Server**
```bash
npm start
```

3. **Configure Reverse Proxy (Nginx)**
```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Option 3: Docker

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package*.json ./
RUN npm ci --production
EXPOSE 3000
CMD ["npm", "start"]
```

---

## CI/CD Pipeline

### GitHub Actions Workflows

Located in `.github/workflows/`:

#### `ci.yml` - Continuous Integration
- **Triggers**: Push/PR to main/develop
- **Jobs**:
  - Lint & Type Check
  - Unit Tests
  - Build Verification
  - Security Scan
  - Lighthouse Audit (PR only)

#### `deploy.yml` - Deployment
- **Triggers**: Push to main, manual dispatch
- **Environments**: Staging, Production
- **Features**:
  - Automated staging deployment
  - Manual production promotion
  - Sentry release creation
  - Slack notifications

### Required Secrets

Configure these in GitHub repository settings:

| Secret | Description |
|--------|-------------|
| `VERCEL_TOKEN` | Vercel deployment token |
| `VERCEL_ORG_ID` | Vercel organization ID |
| `VERCEL_PROJECT_ID` | Vercel project ID |
| `STAGING_SUPABASE_URL` | Staging database URL |
| `STAGING_SUPABASE_ANON_KEY` | Staging database key |
| `PRODUCTION_SUPABASE_URL` | Production database URL |
| `PRODUCTION_SUPABASE_ANON_KEY` | Production database key |
| `SENTRY_AUTH_TOKEN` | Sentry authentication token |
| `SENTRY_ORG` | Sentry organization slug |
| `SENTRY_PROJECT` | Sentry project slug |
| `SLACK_WEBHOOK_URL` | Slack webhook for notifications |
| `CODECOV_TOKEN` | Codecov upload token |
| `SNYK_TOKEN` | Snyk security scanning token |

---

## Production Checklist

### Before First Deployment

- [ ] All environment variables configured
- [ ] Supabase database schema deployed
- [ ] Stripe products/prices created
- [ ] Sentry project configured
- [ ] Domain configured and SSL enabled
- [ ] Error pages tested (404, 500)

### Security Verification

- [ ] CSP headers active
- [ ] HTTPS enforced (HSTS)
- [ ] Rate limiting enabled
- [ ] CSRF protection working
- [ ] Auth flows tested
- [ ] Admin routes protected

### Performance Verification

- [ ] Lighthouse score > 90
- [ ] Images optimized (WebP/AVIF)
- [ ] Static assets cached
- [ ] API routes respond < 200ms
- [ ] No console errors

### Integration Points (Pending)

These integrations are configured but require API keys:

- [ ] **Stripe**: Payment processing
- [ ] **Twilio**: SMS notifications
- [ ] **Resend**: Email delivery
- [ ] **OpenAI**: AI features
- [ ] **Nylas**: Calendar sync
- [ ] **Google**: Maps & OAuth

---

## Monitoring & Alerting

### Health Check Endpoint

```
GET /api/health
```

Returns system health status:
```json
{
  "status": "healthy",
  "version": "0.1.0",
  "uptime": 3600,
  "services": [
    { "name": "database", "status": "healthy" },
    { "name": "stripe", "status": "healthy" }
  ],
  "timestamp": "2025-01-01T00:00:00.000Z"
}
```

### Sentry Error Tracking

- Errors automatically reported to Sentry
- Session replay enabled for debugging
- Performance monitoring (10% sample rate)
- Source maps uploaded on deployment

### Recommended Monitoring Setup

1. **Uptime Monitoring**
   - Configure health check monitoring (e.g., Uptime Robot, Pingdom)
   - Monitor `/api/health` endpoint
   - Alert if status != "healthy"

2. **Log Aggregation**
   - Console logs available in Vercel
   - Errors sent to Sentry

3. **Performance Monitoring**
   - Lighthouse CI in GitHub Actions
   - Sentry performance tracing
   - Web Vitals tracking

---

## Troubleshooting

### Common Issues

#### Build Fails

```bash
# Clear Next.js cache
rm -rf .next

# Clear npm cache
npm cache clean --force

# Reinstall dependencies
rm -rf node_modules
npm install

# Rebuild
npm run build
```

#### Type Errors

```bash
# Run type check
npm run type-check

# Regenerate database types
npm run db:types
```

#### Environment Variables Not Loading

- Verify `.env.local` exists (local) or secrets configured (CI)
- Restart dev server after changes
- Check variable names match exactly

#### Deployment Fails

1. Check GitHub Actions logs
2. Verify all secrets are set
3. Test build locally first
4. Check Vercel deployment logs

---

## Rollback Procedures

### Vercel Rollback

1. Go to Vercel Dashboard > Deployments
2. Find last working deployment
3. Click "..." menu > "Promote to Production"

### Git Rollback

```bash
# Revert to previous commit
git revert HEAD
git push origin main
```

### Database Rollback

1. Go to Supabase Dashboard
2. Navigate to Database > Backups
3. Restore from point-in-time backup

---

## Support

### Documentation
- [Next.js Docs](https://nextjs.org/docs)
- [Supabase Docs](https://supabase.com/docs)
- [Vercel Docs](https://vercel.com/docs)

### Internal Docs
- `docs/OPTIMIZATION-REPORT.md` - Performance & security details
- `docs/API.md` - API documentation (pending)
- `docs/DATABASE.md` - Database schema (pending)
