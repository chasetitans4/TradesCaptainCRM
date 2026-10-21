# Verification results — 2026-10-21

Baseline: `main` at `f481e48e519d6bc9473589b4d3abbd79b840a752`. After: `chore/repo-presentable`, same locked dependency versions. These are actual local results, not a claim that CI or production integrations pass.

| Check | Before | After |
| --- | --- | --- |
| Locked install | Passed: 1,882 packages | Same installed dependency tree; no dependency or lockfile change |
| `npm run lint` | Exit 1: 7 errors, 897 warnings | Exit 0: 0 errors, 904 warnings |
| `npm run type-check` | Exit 0 | Exit 0 |
| Jest suites | 4 failed, 155 passed, 159 total | 3 failed, 156 passed, 159 total |
| Jest tests | 113 failed, 1,824 passed, 1,937 total | 110 failed, 1,828 passed, 1,938 total |
| `npm run build` | Exit 0, 210.03 seconds | Exit 0, 131.79 seconds |
| Compiled App Router entries | 630 | 630; identical route-key set |

The source contains 161 page files, 465 API route files and 159 Jest test files. Compiled route entries include framework-generated entries and are not a count of user-facing pages.

## Changes relevant to checks

The existing Next.js ESLint plugin is now registered, resolving seven missing-rule errors; the rules remain enabled and now report warnings. The Twilio voice webhook tests supply an explicit fake auth token and mocked request headers, restore the environment, and add a missing-token rejection test. Production handlers were not changed. No tsconfig setting, test selection, assertion, timeout, coverage threshold or dependency version was weakened.

All 47 document/SQL relocations preserved their original Git blob and have a SHA-256 move ledger. The first individual-move build passed; the second was interrupted when batching was approved. The complete relocation batch then built successfully (194.28 seconds), followed by the final build reported above. Only this report and the production-readiness report were substantively rewritten after relocation.

## Remaining failures

- `__tests__/app/api/webhooks.stripe.route.test.ts`
- `__tests__/lib/stripe/webhook-idempotency.test.ts`
- `__tests__/lib/stripe/webhook-retry-timeout.test.ts`

These three suites also failed at baseline. Their 110 failing tests require separate investigation into Stripe webhook behavior and fixtures. They were not disabled or fixed by changing application behavior in this cleanup. Lint still emits 904 warnings.

## Execution boundaries

Jest ran with `--runInBand` and a local cache directory. A process-level test guard blocked outbound network sockets (localhost and local pipes remained available); no real Supabase, Stripe, Twilio or other provider credential was supplied. No database, seed, migration, payment, deployment, native-build, mutation-test or load-test command was run. Coverage gates and remote GitHub Actions were not re-run locally; passing the commands above does not establish they pass. Screenshots are historical captures, not a new authenticated walkthrough.

## Current-tree security checks

All 103 `.env.example` assignments are blank, with original comments/order retained. Audited service-role credentials, defaults used for account provisioning, and generated Next.js key material were removed or sanitized. No app import of the removed inventory files was found. A final exact-value sweep also removed an unreferenced default-password admin SQL file.

Gitleaks found two current-tree matches: a multiline generic-key false positive spanning blank `JWT_SECRET=` and the next variable name, and a deliberate portal-session test fixture. The known weak-password value retained in two validation tests and the common-password rejection list is not an account-provisioning default. No scanner suppression was introduced. Historical exposure still requires rotation and the separately approved purge described in the [security review](security/README.md).
