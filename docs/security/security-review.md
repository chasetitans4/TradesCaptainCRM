# Security Review

## Scans
- SAST: Semgrep in CI
- Dependency audit: npm audit
- DAST: OWASP ZAP against staging

## Auth & RBAC
- Roles: super_admin, admin, agent, support
- JWT validation and cookie hardening
- Least-privilege RLS policies

## Secrets
- Managed secret store; rotation; no logging of secrets

## Encryption
- TLS enforced; at-rest by cloud provider
- HSTS and CSP headers on frontend

## Compliance
- GDPR/CCPA readiness: privacy notice, DSR workflows, retention
- Audit logging and breach response

## Protections
- Rate limiting; IP allowlists; CAPTCHA when needed
