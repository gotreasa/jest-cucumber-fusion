# Plan — review-hardening

**Feature id:** `review-hardening`
**Goal:** Fix the correctness, API-typing, and test-coverage issues surfaced by the repository review, working the nWave way (bug-fix flow: failing regression test in DISTILL → fix in DELIVER, per item).
**Deliverable type:** `application` (published npm library `@g_package/jest-cucumber-fusion`).
**Rigor:** `thorough` (opus agent + double sonnet review) — chosen because this is a published library with a silent-wrong-result bug (H1).
**Workflow mode:** `atdd_pure` (classic is deprecated, ADR-028) — to be applied when the DELIVER waves run.

## Source of truth
- Adjudicated findings: [`discuss/rca.md`](./discuss/rca.md) (root-cause work already done — do NOT re-run RCA).
- Code under change: `src/index.js`, `src/index.d.ts`; tests under `test/specs/features/`.

## Lifecycle links (fill as they come into being)
- GitHub issue: _n/a (fork; tracked via this plan + PR)_
- Jira work item (WorkToBeDone): _TBD — create + link before DELIVER_
- PRs: nWave setup + plan → _this PR_; fix passes → _TBD_

## Backlog (prioritised)

Each item is a bug-fix mini-cycle: **DISTILL** (author a failing regression test that encodes the defect) → **DELIVER** (minimal fix, refactor, green) → review gate.

| ID | Pri | Finding (rca.md) | Fix approach |
|----|-----|------------------|--------------|
| H1 | **P0** | regex first-match shadowing (`index.js:171`) — silent wrong handler/args | detect >1 matching definition → prefer most-specific (longest matcher) or throw an ambiguity error mirroring jest-cucumber |
| T1 | **P0** | no negative/sad-path tests | add: undefined step (throws), ambiguous match (H1 guard), hook error, missing feature file, `errors:false` behaviour |
| H2 | P1 | `.d.ts` return-type drift (`void` vs chain) | declare a `StepChain` return type for Given/When/Then/And/But; add a `tsd` type test |
| M1 | P1 | Before/After single-slot clobber | store hooks as arrays; run all in order |
| M2 | P1 | duplicate matcher-source overwrite | warn (or throw) on re-registering an identical matcher within a step type |
| M4 | P1 | brittle `callsites()[1]` | resolve the feature path from the first stack frame outside the package (or an explicit base dir); guard undefined frame |
| M5 | P1 | `errors:false` silent-skip | when validation is disabled, still fail on an unmatched step rather than index-shift args |
| M3 | P2 | module singleton not reset | reset `stepsDefinition` per feature, or document the one-Fusion-per-file constraint |
| L1 | P3 | dead `FusionAll` commented block | delete |
| T2/T3 | P3 | weak assertions; Given-asserts | strengthen assertions; move setup out of Given |
| L2 | P3 | outline literal-group / greedy `<.*>` / digit-class typo | targeted fixes with regression cases |
| E1 | env | stale local `node_modules` (3.0.2 vs 4.5.0) | `npm install` to resync; re-verify M5 + silent-skip mechanism on 4.5.0 |

## Decisions
- Rigor **thorough**; first DELIVER pass scoped to **P0 (H1 + T1)** — highest value, and the negative tests harden every later fix.
- Bug-fix flow (RCA → regression test → fix), not greenfield waves; RCA is `discuss/rca.md`.

## Status
- [x] nWave config scaffolded (`.nwave/des-config.json`: thorough, application).
- [x] Feature folder + seeded RCA (`discuss/rca.md`).
- [x] Plan committed (this file).
- [ ] **Next:** resync `node_modules` (E1) so DISTILL/DELIVER run against the shipped 4.5.0.
- [ ] **Next:** DISTILL — author failing regression tests for H1 + the T1 negative suite.
- [ ] DELIVER — implement H1 fix; green; review gate.
- [ ] Iterate P1 → P3.

## Caveat on nWave setup
`.nwave/des-config.json` was authored directly using the exact structure the `/nw-rigor` skill documents (no `nwave` CLI is available on this machine to run `nwave install`). Wave skills read this config; full DES **hook enforcement** (PreToolUse TDD gates) is normally wired by `nwave install` — run that if/when the CLI is available to guarantee the enforcement layer, not just the config.
