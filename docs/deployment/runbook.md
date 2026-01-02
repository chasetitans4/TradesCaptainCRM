# Deployment Runbook

## Pre-Checks
- Confirm migrations backward-compatible
- Feature flags toggled appropriately
- Secrets present and valid

## Steps
- Build artifacts
- Apply migrations
- Deploy using blue-green or rolling
- Run smoke tests and health checks

## Rollback
- Revert to previous release
- Restore database from snapshot if needed
- Disable affected feature flags

## Post-Deploy
- Validate KPIs and monitoring
- Announce release status
