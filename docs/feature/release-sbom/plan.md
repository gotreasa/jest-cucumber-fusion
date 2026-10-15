# Plan: an SBOM for every release

Living plan. Updated as the work moves; correct anything here that proves wrong.

## Goal

Every release carries a software bill of materials (SBOM) that a person can download from the
GitHub release page, and no release ships with a known high-severity advisory in what it bundles.

- Branch: `ci/release-sbom` (local worktree branch `worktree-feat-release-sbom`), from `main` at
  `2a2dffb`. PR [#49](https://github.com/gotreasa/jest-cucumber-fusion/pull/49).
- Asked by Gearoid on 2026-10-14 ("How would you propose generating it so that it is easily
  viewable for each release and the security problems ... can easily be addressed?"), then
  "Yes, please build it", with `actions/attest-sbom` added to the release job. Slimmed on his
  decision on 2026-10-15, after an adversarial review (below). No Jira (ruled for this
  repository on 2026-10-09).
- Route: worked directly with independent review, not the DES step loop. The change only acts
  inside a GitHub release run, so no local oracle can measure it RED and GREEN. The adversarial
  review was not bound to a DES candidate (`des prepare-role`), because there is no DES Request
  for this work; its verdict lives here.

## Why, and what it is not

The honest reason is the request: a standard, machine-readable SBOM for each release. Nothing
obliges it (see the adversarial review), and no mainstream consumer tool reads it.

**Corrected 2026-10-15.** This section first said the CommonJS bundle hides the four runtime
dependencies from a consumer's `npm audit`. That was false: `package.json` declares them as
ordinary, exact-pinned `dependencies`, so a consumer installs them and their audit reports them.
What the bundle does change is that a consumer cannot fix one themselves; only a new release of
this package can, which `.github/dependabot.yml` already handles with `fix(deps)` bumps. A
human-readable list of the bundled versions already ships in every tarball as
`dist/THIRD_PARTY_LICENSES.txt` (`scripts/build-cjs.js:81-86`).

## Design

| Need | How |
|---|---|
| Generate | `@semantic-release/exec`'s `prepareCmd` runs `npm sbom --sbom-format cyclonedx --omit dev --package-lock-only > release/jest-cucumber-fusion-<version>.cdx.json`, after `@semantic-release/npm` has written the version. Runtime dependencies only. |
| View per release | `@semantic-release/github` attaches `release/*.cdx.json` to the GitHub release, labelled "SBOM (CycloneDX)". |
| Stop a known problem shipping | `npm audit --omit dev --audit-level=high` before `Releasing`, on every run except a pull request. |
| Fix | Unchanged: Dependabot's `npm-security` group raises the bump as `fix(deps)`, which releases a patch with a new SBOM. |

## Decisions

- **Fails before the tag.** `prepare` runs before semantic-release creates the tag
  (`semantic-release/index.js:202-208`). A plain redirect keeps `npm sbom`'s exit status (the
  first form, a pipe into `jq`, lost it), so a failed `npm sbom` rejects the exec plugin's prepare
  and stops the release with nothing tagged. The redirect leaves a 0-byte file on the runner,
  which nothing uploads because the release has already stopped.
- **The root component is named after the checkout directory.** `npm sbom` (npm 11.21.0) does
  this; in CI the directory is `jest-cucumber-fusion`, so the root reads `jest-cucumber-fusion`
  without the `@g_package` group. Its `purl` and `bom-ref` are right
  (`pkg:npm/%40g_package/jest-cucumber-fusion`), and tools match on those. Accepted as cosmetic.
- **The audit gate skips pull requests only.** On every pull request, an advisory published
  overnight would turn unrelated work red. On a push or a manual run, where a release can be
  made, it stops the release. An advisory with no patched version blocks every release until
  someone acts; that is accepted as the gate doing its job.
- **Not part of the slim version:** the attestation, the weekly scan, the asset-present check and
  `scripts/write-sbom.js`. See the adversarial review.

## Steps

- [x] First version built and reviewed in three rounds (history below): SBOM script with tests,
      release asset and its check, attestation, weekly scan, audit gate
- [x] Tried and withdrawn: a "Runtime dependencies" table in each release's notes (`66b19f8`,
      reverted in `0040733`). Gearoid judged on 2026-10-14 that it adds no value.
- [x] Adversarial value review (2026-10-15), below
- [x] Slimmed on Gearoid's decision: plain `npm sbom` `prepareCmd`, release asset, audit gate.
      Removed `scripts/write-sbom.js`, its tests, `.github/workflows/sbom-scan.yml`, the asset
      check, the attestation and its permission. Rationale corrected in the workflow and here.
- [x] Local proof of the slim release path (Evidence, slim version)
- [x] Suite (51 of 51 suites, 1,142 passed, 3 skipped), tsd, 7 of 7 baselines, ESLint, type
      check, secretlint, Prettier; commit, push, PR description
- [ ] After merge, on the first `fix` or `feat` release: the SBOM is on the release page

## Adversarial value review (2026-10-15)

Asked by Gearoid ("Let's do an adversarial review since you're unsure if any of this is
needed"). A fresh `nw-platform-architect-reviewer`, with none of the earlier rounds' context,
argued the prosecution against closed criteria declared up front: what fails without each part
given what the repository already had, what each part costs, whether it serves the request, and
keep, cut or simplify. `nw-researcher` checked the outside facts in parallel.

**Verdict: MERGE SLIMMED.**

| Part | Verdict | Reason |
|---|---|---|
| Audit gate | Keep | The only part that stops a vulnerable release; three lines |
| SBOM generation | Simplify | The request itself; a plain redirect fails before the tag as the script did |
| Release asset | Keep | What makes it viewable for each release |
| Asset-present check | Cut | It ran after the tag and the GitHub release and before npm staging, so a failure left a release that never reached npm |
| Attestation | Cut | Same ordering hazard; no consumer tool reads it, and it does not raise OpenSSF Scorecard's Signed-Releases score |
| Weekly scan | Cut | The same four packages from the same lockfile as Dependabot: a second alert stream |

Re-verified against source before acting: the bundled versions already ship in
`dist/THIRD_PARTY_LICENSES.txt` (run `npm run build`: `@cucumber/gherkin@42.0.1 (MIT)` and the
others); the asset check (`integration.yml:166`) and the attestation (`:191`) ran after
`Releasing` (`:157`) and before staging (`:206`).

Outside facts (`nw-researcher`, primary sources; the CRA read through a mirror of the Official
Journal because EUR-Lex did not load):

- **EU Cyber Resilience Act (Regulation (EU) 2024/2847):** no SBOM duty here. Annex I Part II(1)
  binds manufacturers; recital 18 treats free software that is not monetised as outside
  commercial activity; an open-source steward must be a legal person (Art 3(14)), and Art 24
  gives stewards no SBOM duty. Main obligations apply from 11 December 2027 (Art 71(2)).
- **UK:** the Product Security and Telecommunications Infrastructure Act 2022 covers consumer
  connectable products and has no SBOM requirement.
- **OpenSSF Scorecard:** its SBOM check looks for a `.cdx.json` release asset by name and scores
  it 10, but is experimental and off by default (`SCORECARD_EXPERIMENTAL`).
- **Consumer tools:** npm audit, Dependabot, Snyk and deps.dev derive dependencies from
  manifests, lockfiles or the registry; none fetches an author-published SBOM.

## Evidence, slim version (2026-10-15)

- **Success, through the real plugins.** In a copy of the tree, `@semantic-release/npm`'s
  `prepare` and then `@semantic-release/exec`'s, with version 9.9.9: exec logged
  `npm sbom --sbom-format cyclonedx --omit dev --package-lock-only > release/jest-cucumber-fusion-9.9.9.cdx.json`,
  and `release/` held the tarball and the SBOM: CycloneDX 1.5, root version 9.9.9, purl
  `pkg:npm/%40g_package/jest-cucumber-fusion@9.9.9`, four components. `@semantic-release/github`'s
  `globAssets` on the real config returned that file with the label "SBOM (CycloneDX)".
- **Failure, through the same plugins.** With a runtime dependency the lockfile lacks, npm
  failed with `ESBOMPROBLEMS` and the exec plugin's `prepare` rejected (exit 1), which is what
  stops semantic-release before the tag. A 0-byte file was left in `release/`.
- **Not provable locally:** the asset upload to a real GitHub release.

## History: the first version

Everything below records the first version and its three review rounds, as they stood. Where it
describes the script, the attestation, the asset check or the weekly scan, those were removed
in the slim version above.

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
