# Redacted candidate summary

Each prefix exposes at most six characters. IDs are truncated SHA-256 fingerprints, used to distinguish values with the same prefix. Validity was not tested with providers. The CSV contains every affected file/commit snapshot.

| Candidate | Variable | Prefix | Provider | Classification | Files | Commits |
| --- | --- | --- | --- | --- | ---: | ---: |
| 134559773a2cf955 | JWT_SECRET | z.stri… | Application JWT | false positive: code/schema expression or dependency example | 1 | 29 |
| a611af031e7dd001 | JWT_SECRET | db8e7a… | Application JWT | potential credential; validity unverified | 1 | 20 |
| daffc84748a3e755 | process.env.JWT_SECRET | 012345… | Application JWT | test fixture candidate; not provider-validated | 2 | 28 |
| e9cfe273c0ec6b5c | ADMIN_PORTAL_SECRET | 4dde48… | Application admin | potential credential; validity unverified | 1 | 9 |
| 0d81eae3783d65fc | ENCRYPTION_KEY | 801d42… | Application encryption | potential credential; validity unverified | 1 | 20 |
| 15c0e388bf9a2539 | previewModeEncryptionKey | 671c8f… | Application encryption | generated Next.js development/build encryption material | 3 | 3 |
| 9bd4b59ae795fb82 | encryption.key | g0NxTh… | Application encryption | generated Next.js development/build encryption material | 4 | 3 |
| 1086cff3a33af950 | password | Abcdef… | Application/unknown | test fixture candidate; not provider-validated | 1 | 28 |
| 11c5415d193508b9 | NEW_PASSWORD | Strong… | Application/unknown | potential credential; validity unverified | 1 | 3 |
| 17dd6453ccf10923 | api_key_created | Create… | Application/unknown | false positive: code, UI label, or library example | 1 | 29 |
| 240be518fabd2724 | PASSWORD | admin1… | Application/unknown | potential credential; validity unverified | 1 | 6 |
| 240bf9275a0bbeb7 | NEXT_PUBLIC_GOOGLE_MAPS_API_KEY | z.stri… | Application/unknown | false positive: code/schema expression or dependency example | 1 | 29 |
| 25aa34070a75ce79 | password_hash | ef92b7… | Application/unknown | potential credential; validity unverified | 1 | 6 |
| 297e6f9d156b4517 | mockSecret | MANUAL… | Application/unknown | test fixture candidate; not provider-validated | 1 | 27 |
| 4cce02651adfe686 | process.env.PORTAL_SESSION_SECRET | short-… | Application/unknown | test fixture candidate; not provider-validated | 1 | 6 |
| 4f1355d434853d99 | password_reset_request | Reques… | Application/unknown | false positive: code, UI label, or library example | 2 | 29 |
| 534237920eabad8b | access_token | tok_sm… | Application/unknown | test fixture candidate; not provider-validated | 1 | 28 |
| 536439a476eacd3c | api_key_revoked | Revoke… | Application/unknown | false positive: code, UI label, or library example | 1 | 29 |
| 6aeaa6a53d09dcad | password | Show p… | Application/unknown | false positive: code, UI label, or library example | 1 | 6 |
| 7bbb2bb0e90e10c5 | token | , e))\… | Application/unknown | false positive: code/schema expression or dependency example | 3 | 3 |
| 8be5d113c0871ce1 | mockSecret | JBSWY3… | Application/unknown | test fixture candidate; not provider-validated | 1 | 27 |
| 9f8e75e16c074d33 | apikey | public… | Application/unknown | false positive: code/schema expression or dependency example | 10 | 3 |
| a44ca5d29f6dab43 | LOGIN_PASSWORD | AdminP… | Application/unknown | potential credential; validity unverified | 10 | 6 |
| a8ae6e6ee929abea | process.env.PORTAL_SESSION_SECRET | 012345… | Application/unknown | test fixture candidate; not provider-validated | 1 | 6 |
| b041c0aeb35bb0fa | password | custom… | Application/unknown | potential credential; validity unverified | 3 | 3 |
| b1c3d9553ca9a105 | PASSWORD | OwnerP… | Application/unknown | potential credential; validity unverified | 1 | 6 |
| b40c56f10c751354 | password_hash | old_ha… | Application/unknown | test fixture candidate; not provider-validated | 1 | 27 |
| d8387781a6717c14 | previewModeSigningKey | d8fac1… | Application/unknown | generated Next.js development/build encryption material | 3 | 3 |
| e0edfeb3a71a1002 | password_reset_complete | Reset … | Application/unknown | false positive: code, UI label, or library example | 2 | 29 |
| e80e4f1d45cee64b | password_change | Change… | Application/unknown | false positive: code, UI label, or library example | 2 | 29 |
| ef92b778bafe771e | password | passwo… | Application/unknown | potential credential; validity unverified | 7 | 6 |
| fd12d5bb0bd9ace1 | NEXT_PUBLIC_GOOGLE_MAPS_API_KEY | AIzaxx… | Application/unknown | documentation/configuration placeholder; not a live credential | 1 | 1 |
| 2aba0661fd08e1cb | DATABASE_URL | postgr… | Database/broker | documentation/configuration placeholder; not a live credential | 1 | 22 |
| 4389982954a4d426 | DATABASE_URL | postgr… | Database/broker | documentation/configuration placeholder; not a live credential | 1 | 22 |
| 295c2da518cd0700 | OPENAI_API_KEY | sk-pro… | OpenAI | potential credential; validity unverified | 1 | 5 |
| c591aa26aef41a62 | OPENAI_API_KEY | sk-xxx… | OpenAI | documentation/configuration placeholder; not a live credential | 1 | 1 |
| b752357138c89075 | REDIS_URL | Ab6psd… | Redis | potential credential; validity unverified | 1 | 8 |
| 607b3181ceea73a0 | RESEND_API_KEY | re_CFU… | Resend | potential credential; validity unverified | 1 | 10 |
| 16340ccfcaf8432c | process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY | pk_tes… | Stripe | test fixture candidate; not provider-validated | 1 | 28 |
| 51781b76adad9287 | NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY | pk_tes… | Stripe | public Stripe publishable key; not a secret | 1 | 20 |
| 58c92e4b6999ed1e | STRIPE_WEBHOOK_SECRET | sk_tes… | Stripe | potential credential; validity unverified | 1 | 20 |
| 7ba88f380e2bd2b3 | process.env.STRIPE_SECRET_KEY | sk_tes… | Stripe | test fixture candidate; not provider-validated | 1 | 28 |
| df4d198c12eb082e | STRIPE_WEBHOOK_SECRET | rk_tes… | Stripe | potential credential; validity unverified | 1 | 19 |
| 05cd5a9eb8e22eef | NEXT_PUBLIC_SUPABASE_ANON_KEY | z.stri… | Supabase | false positive: code/schema expression or dependency example | 1 | 29 |
| 3ef210b33c4a357f | NEXT_PUBLIC_SUPABASE_ANON_KEY | eyJhbG… | Supabase | public anon key; identifier, verify RLS | 8 | 22 |
| c971b71fd2373e51 | SUPABASE_SERVICE_ROLE_KEY | eyJhbG… | Supabase | privileged service-role credential; rotate | 20 | 22 |
| c9b07a956370d642 | SUPABASE_SERVICE_ROLE_KEY | z.stri… | Supabase | false positive: code/schema expression or dependency example | 1 | 29 |
| f35cd067d05752ed | process.env.TWILIO_AUTH_TOKEN | test-a… | Twilio | test fixture candidate; not provider-validated | 1 | 3 |
