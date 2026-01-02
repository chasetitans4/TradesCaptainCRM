# System Architecture

## Overview
- Next.js application with Supabase backend and Stripe/Twilio integrations
- Admin modules: accounts, leads, commissions, offers, pipeline, reports, nevermiss-support

## Data Flow
- CRM actions → Supabase → Webhooks → External services
- Monitoring and logging across all layers

## Security Controls
- RBAC enforcement and RLS policies
- Secret management and encryption

## Deployment Topology
- Staging and production environments
- Blue-green or rolling deployments; zero-downtime migrations
