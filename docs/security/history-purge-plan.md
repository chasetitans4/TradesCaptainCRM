# Proposed history purge — NOT APPROVED / NOT RUN

This plan remains pending explicit rotation confirmation and separate approval. Current-tree sanitization and presentation cleanup have now been applied on `chore/repo-presentable`. No filter-repo, history rewrite, force push, or provider credential rotation has been performed.

## Rotate before purging

- **Supabase:** rotate the exposed service-role credential, following the project's signing-key/key-management procedure. Review row policies for the public anon key; the anon key is a public identifier, not equivalent to the service-role credential.
- **Stripe:** revoke and replace the exposed secret/restricted test keys and any actual webhook signing secrets. Historical values assigned to `STRIPE_WEBHOOK_SECRET` include secret/restricted API-key formats, so verify configuration rather than assuming they were signing secrets. Public `pk_*` keys and price IDs are not authentication secrets.
- **OpenAI:** revoke and replace the exposed project API key.
- **Resend:** revoke and replace the exposed API key.
- **Redis provider:** replace the password/token if the opaque value stored under `REDIS_URL` was used. It is a credential-shaped value without a URL scheme; this audit did not authenticate it or identify a host from it.
- **Application:** rotate `JWT_SECRET` and `ADMIN_PORTAL_SECRET`, invalidate affected sessions, and rotate any accounts provisioned with committed default passwords. Plan migration/re-encryption before rotating `ENCRYPTION_KEY` so encrypted data is not lost.
- **Next.js development/build output:** remove committed server-action/preview encryption material and regenerate build output. Do not reuse those generated keys in deployment configuration.
- Twilio-like values detected in tests are classified as fixtures, not verified live Twilio credentials. No additional real provider key was established by this scan.

GitHub recommends revoking or rotating secrets first; rewriting history does not revoke them. See [GitHub's sensitive-data removal guide](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository).

## Scope to approve

`purge-sensitive-paths.txt` contains 44 exact historical paths. It includes `.env.example`, generated files containing key material, and credential/default-password-bearing manual scripts. The complete candidate inventory also retains false positives, test fixtures, public keys, and documentation placeholders; those are not automatically treated as compromised files.

The path-filter strategy removes the entire listed file from every old commit, not just its credential lines. This changes commit IDs and may remove commits that become empty. It also removes those files at branch tips. **Before running the purge, first prepare and review sanitized current copies, then restore the approved copies to the rewritten tips.** Do not restore an original unsanitized file.

If preserving each script's historical content is preferred, choose a separately reviewed content-replacement strategy instead. That would require exact confidential replacement expressions or a reviewed callback; no full-secret replacement list has been written into these deliverables.

## Preparation after explicit approval

1. Complete rotations and record which accounts/environments need new values; do not put credentials in this repository or PR.
2. Apply the proposed blank `.env.example`; sanitize or remove the other credential-bearing current files. Keep scripts' configured behavior intact and avoid running them against live services.
3. Finish the behavior-preserving cleanup and validate its current tree. Save an approved **source-only** snapshot of the affected current files outside Git history. Do not use a bundle of old history as the public restoration artifact.
4. Coordinate a write freeze. Merge or close affected PRs as appropriate, and record all branch/tag tips immediately before the rewrite. Resolve any changes since this audit before proceeding.
5. Use a fresh mirror clone in a new directory. Install git-filter-repo with `--sensitive-data-removal` support (GitHub specifies version 2.47 or newer). Do not use `--force` to bypass its fresh-clone check.

## Exact local rewrite command — prepared only

The following PowerShell is a proposed procedure. It has **not** been executed. The paths use the existing task workspace; `TradesCaptainCRM-purge.git` must not already exist.

```powershell
$repoUrl = 'https://github.com/chasetitans4/TradesCaptainCRM.git'
$taskRoot = 'C:/Users/chase/Documents/Codex/2026-10-20/i-x20'
$reviewDir = Join-Path $taskRoot 'outputs/step-1-secret-review'
$mirror = Join-Path $taskRoot 'work/TradesCaptainCRM-purge.git'
if (Test-Path -LiteralPath $mirror) { throw 'Use a new, empty mirror path.' }

$refsBefore = @{}
git ls-remote --heads --tags $repoUrl | ForEach-Object {
    $parts = $_ -split "`t"
    if ($parts[1] -notlike '*^{}') { $refsBefore[$parts[1]] = $parts[0] }
}
if ($LASTEXITCODE -ne 0) { throw 'Unable to capture remote refs.' }
git clone --mirror $repoUrl $mirror
if ($LASTEXITCODE -ne 0) { throw 'Mirror clone failed.' }

# Confirm the manifest and approved sanitized restoration snapshot first.
git -C $mirror filter-repo --sensitive-data-removal --invert-paths --paths-from-file "$reviewDir/purge-sensitive-paths.txt"
if ($LASTEXITCODE -ne 0) { throw 'Rewrite failed; do not push.' }
```

The manifest uses `literal:` prefixes, so brackets and other punctuation in generated filenames are treated as literal paths. All observed historical filenames are listed; filter-repo does not automatically follow renames. See the [filter-repo manual](https://htmlpreview.github.io/?https://github.com/newren/git-filter-repo/blob/docs/html/git-filter-repo.html).

## Restoration and verification gate — before any remote update

- Restore only reviewed sanitized current versions from the source-only snapshot to each branch that should retain those files, committing those restorations into the rewritten mirror through a fresh working clone. The blanket path deletion is **not** a complete behavior-preserving final tree by itself.
- Re-run both the all-ref Gitleaks scan and the snapshot scan. Examine all remaining findings; do not hide them with a baseline.
- Check every original remote branch/tag still has an intended rewritten target. Stop if filter-repo pruned an entire ref; do not silently delete it.
- Run the required lint/type-check/tests/build on the sanitized current tree. Confirm no unintended application file changed and inspect the commit/ref map.
- Record filter-repo's first changed commits and affected pull-request references. Review the exact branch/tag changes with the user before publishing.

## Exact force-push plan — prepared only

Once the restoration and verification gate passes, the following uses the captured old tips as leases. It deliberately avoids an unrestricted `--force --mirror` push and does not push GitHub-owned `refs/pull/*` references. This is still a destructive history update and requires your explicit approval.

```powershell
# $mirror, $repoUrl and $refsBefore are retained from preparation above.
git -C $mirror remote get-url origin *> $null
if ($LASTEXITCODE -ne 0) { git -C $mirror remote add origin $repoUrl }

$pushArgs = @('-C', $mirror, 'push', '--atomic')
$refspecs = @()
foreach ($ref in ($refsBefore.Keys | Sort-Object)) {
    git -C $mirror show-ref --verify --quiet $ref
    if ($LASTEXITCODE -ne 0) { throw "Ref missing after rewrite: $ref" }
    $pushArgs += ('--force-with-lease={0}:{1}' -f $ref, $refsBefore[$ref])
    $refspecs += ('{0}:{0}' -f $ref)
}
$pushArgs += 'origin'
$pushArgs += $refspecs
git @pushArgs
if ($LASTEXITCODE -ne 0) { throw 'Push rejected; stop and review, do not retry with --force.' }
```

Immediately before this push, compare the current remote branch/tag **names** with the captured names as well as the leased tips. If a new ref appeared, stop, fetch, and rescan rather than leaving an old-history branch behind. Temporary branch-protection changes, if needed, require separate review and must be restored afterward.

## Aftercare

Verify all remote heads/tags again, make a fresh clone, and rescan. Coordinate replacement of old developer clones so merges do not reintroduce the old history. Review forks, GitHub PR refs/caches, CI artifacts/logs, releases, and external clones separately. Where appropriate, contact GitHub Support with the first changed commits and affected PR refs; a force push alone does not clear all cached copies. Recreate the final presentation PR against the rewritten history as needed.

No provider service was contacted to test credentials, and no rotation, history rewrite, force push, or PR creation has been attempted for this request.
