# System Requirements Review

## Business Modules
- Contacts, Leads, Pipeline, Commissions, Offers/Coupons, Onboarding, Locations, Documents
- Reporting, SMS Usage, NeverMiss Support, Stripe Billing

## Traceability
- Map each requirement to implementation and tests
- Record gaps and remediation tasks

## Integrations
- Supabase: database, auth, storage, RLS policies
- Stripe: webhooks, idempotency, secret management
- Twilio/NeverMiss: SMS, conversation APIs
- Email provider: transactional messages
- Environment variables: required keys and rotation plans

## Data Model & Migrations
- Validate production schema, indexes, constraints
- Define seed data and migration safety checks
