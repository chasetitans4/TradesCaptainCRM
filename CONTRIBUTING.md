# Contributing

Use a feature branch and describe the problem and resulting behavior in your PR.
Install the locked dependencies with `npm ci --legacy-peer-deps`.
Copy `.env.example` to `.env.local` and use isolated development credentials.
Never commit secrets, generated output, or production/customer data.
Run `npm run lint`, `npm run type-check`, `npm test -- --runInBand`, and `npm run build`.
Report existing failures and new failures separately; do not weaken checks.
Review database scripts before use and keep schema migrations under `supabase/migrations/`.
Include screenshots for UI changes and tests for behavior changes.
