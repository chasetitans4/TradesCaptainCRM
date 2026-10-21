# Security cleanup review — 2026-10-21

The current tree has a blank `.env.example` retaining all 103 variable assignments and comments. Credential-bearing obsolete scripts and generated Next.js output were removed. The two retained screenshot/demo tools read configuration from the environment. Application imports of the removed inventory files were checked; none were found. No provider authentication or rotation was attempted.

The historical scan covered 29 commits, 3,434 unique blobs and 37,987 file snapshots. It recorded 1,330 candidate occurrences and 48 unique candidate values; these counts include placeholders, public identifiers, fixtures and false positives. They are not counts of confirmed live credentials. A separate Gitleaks scan identified 50 introductions. Values are represented only by fingerprints and prefixes of at most six characters.

- [Complete redacted inventory](history-secret-inventory.csv)
- [Candidate classifications](candidate-summary.md)
- [Pending purge plan](history-purge-plan.md)
- [Exact historical path manifest](purge-sensitive-paths.txt)

The service-role key, provider API keys, application secrets and default account passwords identified in history need owner review and rotation. Public anon/publishable keys are classified separately. Validity was not checked against providers. Generated Next.js keys must be regenerated.

**History purge is pending.** The cleanup does not revoke credentials or erase old commits. Do not run filter-repo or force-push until rotations are confirmed and the history operation is explicitly approved. Reports and inventories are redacted; do not paste raw scan logs into issues or pull requests.

The final exact-value sweep additionally found and removed `supabase/scripts/create-ready-to-use-admin.sql`, an unreferenced manual account-creation script containing a known default password. Its path was added to the pending purge manifest. Three retained occurrences of candidate `ef92b778bafe771e` are password-validation test fixtures or the common-password rejection list; none provisions an account.
