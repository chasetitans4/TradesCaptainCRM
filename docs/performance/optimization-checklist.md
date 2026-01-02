# Performance Optimization Checklist

## Load Testing
- Run k6 smoke and load scenarios at production scale
- Capture p50/p95/p99 latencies, throughput, error rates

## Database
- Review slow query logs; add/verify indexes
- Enforce pagination; avoid N+1 patterns
- Batch writes where safe; minimize transaction scope

## Caching
- CDN for static assets
- Response caching for read-heavy endpoints
- Memoize expensive calculations; define invalidation rules

## Webhooks
- Ensure idempotency; reduce DB contention; retries configured

## SLA Targets
- p95 API ≤ 300 ms standard; ≤ 700 ms aggregates
- Zero missed webhooks; document SLOs/SLIs
