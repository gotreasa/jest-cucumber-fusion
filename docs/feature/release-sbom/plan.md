# Plan: an SBOM for every release

Living plan. Updated as the work moves; correct anything here that proves wrong.

## Goal

Every release carries a software bill of materials (SBOM) that a person can open from the
GitHub release page, and the vulnerabilities it exposes are found and fixed without anyone
having to remember to look.

- Branch: `ci/release-sbom` (local worktree branch `worktree-feat-release-sbom`), from `main` at `2a2dffb`.
- Asked by Gearoid on 2026-10-14 ("How would you propose generating it so that it is easily
  viewable for each release and the security problems ... can easily be addressed?"), then
  "Yes, please build it", with `actions/attest-sbom` added to the release job. No Jira (ruled
  for this repository on 2026-10-09).
- Route: worked directly with one independent review, not the DES step loop. The change only
  acts inside a GitHub release run, so no local oracle can measure it RED and GREEN, and the
  design was settled by the approved proposal.

## Why it matters for this package

The CommonJS build inlines `@cucumber/gherkin`, `@cucumber/messages`,
`@cucumber/tag-expressions` and `callsites` into `dist/index.cjs` (`scripts/build-cjs.js`). A
consumer who `require`s the package runs that code, but their own `npm audit` cannot see it. The
SBOM is the record of which versions each release carries.

## Design

| Need | How |
|---|---|
| Generate | `scripts/write-sbom.js`, run by `@semantic-release/exec` in the prepare step, after `@semantic-release/npm` has written the version. It runs `npm sbom --sbom-format cyclonedx --omit dev --package-lock-only`, fails if npm fails, and writes nothing then. Runtime dependencies only: development ones never ship. |
| View per release | `@semantic-release/github` attaches `release/*.cdx.json` to the GitHub release, labelled "SBOM (CycloneDX)". The release job then checks that it is attached, because the plugin only logs an asset it could not upload. |
| Prove it | `actions/attest@v4` with `sbom-path` signs the SBOM as a statement about the staged tarball. Check with `gh attestation verify <tarball> --repo gotreasa/jest-cucumber-fusion`. |
| Find problems after release | `.github/workflows/sbom-scan.yml`, weekly and on demand: grype (`anchore/scan-action@v7`) scans the latest release's SBOM and uploads SARIF to code scanning (category `release-sbom`). |
| Stop a known problem shipping | `npm audit --omit dev --audit-level=high` before `Releasing`, on every run except a pull request. |
| Fix | Unchanged: Dependabot's `npm-security` group raises the bump as `fix(deps)`, which releases a patch with a new SBOM. |

## Decisions and deviations

- **`actions/attest`, not `actions/attest-sbom`.** Gearoid asked for `actions/attest-sbom`. Its
  latest release, v4.1.0 (2026-03-18), is a composite that prints
  `actions/attest-sbom has been deprecated, please use actions/attest instead` and then calls
  `actions/attest` with the same inputs. The direct call produces the same attestation without a
  deprecation warning on every release. Reverting is a one-line change to the `uses:` line.
- **The SBOM's root name is corrected.** `npm sbom` (npm 11.21.0) names the root component after
  the checkout directory, not the package: in a copy named `sim` it wrote `"name": "sim"`, while
  its `purl` and `bom-ref` were right (`pkg:npm/%40g_package/jest-cucumber-fusion`).
  `scripts/write-sbom.js` sets `group` and `name` from `package.json`, the CycloneDX form for a
  scoped npm package.
- **A Node script, not a shell pipe.** The first form piped `npm sbom` into `jq`. Without
  `pipefail` the pipe's status is jq's, and `npm sbom` fails with an empty stdout (`EUSAGE` with
  no lockfile, `ESBOMPROBLEMS` when it is out of step with `package.json`; both measured), so a
  failure became a 0-byte SBOM that was uploaded and attested. The script matches
  `scripts/build-cjs.js` and needs no `jq`.
- **Findings point at `package-lock.json`.** grype gives an SBOM finding an empty file location
  (`"uri": ""`), which code scanning cannot place. The lockfile is where a fix lands.
- **The audit gate skips pull requests only.** On every pull request, an advisory published
  overnight would turn unrelated work red. On a push or a manual run, where a release can be
  made, it stops the release, which is the point.
- **Permissions.** The release job gains `attestations: write` only. `artifact-metadata: write`
  is not needed: `actions/attest` creates a storage record only with `push-to-registry`, which
  applies to container images, not an npm tarball.

## Steps

- [x] Add `@semantic-release/exec@^7.1.0` (peer `semantic-release >=24.1.0`; this repo has 25).
      The lockfile change is the plugin and its own dependencies, plus `figures` hoisted.
- [x] Release config: SBOM in prepare, attached as a release asset
- [x] Release job: audit gate, finding and checking the SBOM, attesting it
- [x] Weekly scan workflow
- [x] Local proof of the release path (below)
- [x] Review round 1 (`nw-platform-architect-reviewer`): REJECTED, 1 blocker, 3 major, 4 minor.
      Each finding re-verified against source; verdicts below.
- [x] Fixes for round 1: `scripts/write-sbom.js` with its tests, test first
      (`test/specs/packaging/release-sbom.steps.js`, red then green), audit gate, release asset
      check, scan error handling
- [x] Suite, lint, Prettier, type check (results under Evidence)
- [x] Review round 2: APPROVED WITH NOTES, no blockers; four minor notes, below
- [x] Commit (`487b58c`, signed), push to `ci/release-sbom`, draft PR
      [#49](https://github.com/gotreasa/jest-cucumber-fusion/pull/49). The 8 open Dependabot
      alerts on `main` on 2026-10-14 are all development scope, so the runtime audit gate does
      not block the next release.
- [x] Tried and withdrawn: a "Runtime dependencies" table in each release's notes (`66b19f8`,
      reviewed in a third round). Gearoid judged on 2026-10-14 that it adds no value, and it was
      reverted; the attached JSON stays the only view of the SBOM.
- [ ] After merge, on the first release: the SBOM is on the release page, `gh attestation verify`
      passes, and a manual run of "Release SBOM scan" uploads to the Security tab

## Review round 1 (2026-10-14)

| # | Finding | Verdict | Action |
|---|---|---|---|
| 1 | Blocker: `npm sbom \| jq` exits 0 when npm fails, leaving an empty SBOM | Confirmed: npm exits 1 with empty stdout on a missing or drifted lockfile | `scripts/write-sbom.js`, tested for both outcomes |
| 2 | A manual run releases without the audit gate | Confirmed: `Releasing` has no condition, the audit had `push` | Audit now skips pull requests only |
| 3 | A failed asset upload does not fail the release | Confirmed: `@semantic-release/github/lib/publish.js:115-131` logs and skips | The release job checks the asset is on the release before staging |
| 4 | The scan treats every download failure as "no SBOM" | Confirmed | Only a release with no `.cdx.json` asset is a notice; an empty SBOM fails |
| 5 | The SARIF rewrite fails on a result with no `locations` | Plausible, accepted as cheap hardening | `[]?` in the jq path, run on such a result |
| 6 | Evidence overstated; a dry run would exercise the real path | Half right. A dry run would not: `prepare` is `dryRun: false` (`semantic-release/lib/definitions/plugins.js:54`) and is skipped (`lib/plugins/normalize.js:34`). The exec plugin does the template itself, and the logged command showed it expanded. The asset glob and label were unproven | `globAssets` run on the real config (Evidence) |
| 7 | upload-sarif may need `actions: read` on a private repository | Rejected: the repository is public | None |
| 8 | GitHub disables a scheduled workflow after 60 days without repository activity | Accepted as a known limit | Noted under Limits |

## Review round 2 (2026-10-14)

APPROVED WITH NOTES. The reviewer confirmed fixes 1 to 5, withdrew the dry-run claim in
finding 6, and confirmed that steps without `shell:` run as `bash -e` with no `pipefail`, which
the checks avoid needing (a command substitution and a here-string, no pipe).

| # | Note | Verdict | Action |
|---|---|---|---|
| 1 | `write-sbom.js` accepts an SBOM with no components | Declined: that is the correct SBOM of a package with no runtime dependencies; this one has four, and npm fails on a lockfile that disagrees | None |
| 2 | A manual run still releases without staging | Pre-existing, out of scope (below) | Reported |
| 3 | The asset check assumes the tag is `v<version>` | Accepted; it fails closed | A comment at the check |
| 4 | The failure test asserts npm's `ESBOMPROBLEMS` text | Kept: it proves the failure is the expected one, not some other crash | None |

Out of scope, reported, not changed: a manual run on `main` can already make a release and
skip staging (`Releasing` has no condition; staging needs `push`). That predates this work.

## Limits

- On a public repository GitHub disables scheduled workflows after 60 days with no activity. A
  quiet stretch can stop the weekly scan; the Actions tab shows it, and enabling it again resumes.
- The audit gate blocks only advisories npm knows about at release time. The weekly scan covers
  the ones published later.

## Evidence

- **Plugin order.** `@semantic-release/npm`'s prepare runs `npm version` and then `npm pack`
  (`node_modules/@semantic-release/npm/lib/prepare.js:13-36`), and semantic-release runs each step
  through the plugins in their listed order (`node_modules/semantic-release/lib/plugins/index.js:87`).
- **The release path, run locally.** In a copy of the tree, the installed npm and exec plugins'
  `prepare` were called in the configured order with version 9.9.9. The exec plugin logged
  `node scripts/write-sbom.js release/jest-cucumber-fusion-9.9.9.cdx.json`, and `release/` then
  held `g_package-jest-cucumber-fusion-9.9.9.tgz` and `jest-cucumber-fusion-9.9.9.cdx.json`:
  CycloneDX 1.5, root `@g_package` / `jest-cucumber-fusion` 9.9.9, four components
  (`@cucumber/gherkin@42.0.1`, `@cucumber/messages@34.2.1`, `@cucumber/tag-expressions@11.0.1`,
  `callsites@4.2.0`).
- **The release asset.** `@semantic-release/github`'s `globAssets`, run on the real `assets`
  config in that copy, returned
  `[{"path":"release/jest-cucumber-fusion-9.9.9.cdx.json","label":"SBOM (CycloneDX)"}]`.
- **The scan.** grype 0.120.1 on today's SBOM: no vulnerabilities. On a copy with
  `lodash@4.17.15` swapped in: five GitHub advisories, each with its fixed version (for example
  GHSA-35jh-r3h4-6jhm, high, fixed in 4.17.21). The `jq` rewrite set every SARIF location to
  `package-lock.json`, and left a result with no locations as it was.
- **The workflow shell, run locally against this repository.** The scan's download block on the
  latest release, v3.0.4 (no SBOM): the notice, exit 0. The same `gh release view` on a
  repository that does not exist: exit 1. The release job's asset check for an SBOM not on
  v3.0.4: `::error::jest-cucumber-fusion-3.0.4.cdx.json is not attached to the GitHub release
  v3.0.4.`, exit 1.
- **Not provable locally**: the GitHub release asset upload, the attestation (including
  `actions/attest`'s glob `subject-path`), the SARIF upload and how code scanning groups the
  alerts, and `gh release download` on a release that has an SBOM. They are the last step above.
- **Read, not run**: that `actions/attest-sbom` 4.1.0 wraps `actions/attest`. Its `action.yml`
  at the v4.1.0 tag prints the deprecation warning and then `uses: actions/attest@59d8942...`,
  passing its own inputs through.
- `npm audit --omit dev` on 2026-10-14: 0 vulnerabilities, so the new gate passes today. Its
  blocking case was not exercised.
- Gates on the branch after round 1: 52 of 52 suites, 1,144 passed, 3 skipped; tsd; 7 of 7
  baselines; ESLint; type check; secretlint; Prettier on the changed files. actionlint is not
  installed here, so the workflow YAML was checked by review and will be checked by GitHub on the
  first run.
