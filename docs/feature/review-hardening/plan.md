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
- **Scope for this PR (confirmed 2026-07-10): P0 + P1** (H1, T1, H2, M1, M2, M4, M5). Folded into the fork-tidy branch/PR #7 so all "house in order" + hardening work ships as **one** semantic-release patch (avoids a release per PR). P2/P3 deferred.
- Rigor **thorough**; order P0 first (H1 + T1 — the negative tests harden every later fix), then the P1 items.
- Bug-fix flow (RCA → regression test → fix), not greenfield waves; RCA is `discuss/rca.md`.
- **H1 contract:** when >1 step definition matches a step, **throw an ambiguity error** (mirrors Cucumber / jest-cucumber's automatic binding) rather than silently taking the first insertion-order match. Converts the silent-wrong-result into a loud failure; the current suite has no overlapping defs so nothing regresses.
- **Execution vehicle:** nWave agents dispatched in DISTILL→DELIVER cadence — `nw-acceptance-designer` (RED regression tests) → `nw-software-crafter` (opus, GREEN fix) → `nw-*-reviewer` double gate → orchestrator adjudication → commit. No DELIVER `deliver-session` started, so DES PreToolUse edit gates stay inert (bug-fix flow, not the full atdd_pure carpaccio machinery).

## Status
- [x] nWave config scaffolded (`.nwave/des-config.json`: thorough, application).
- [x] Feature folder + seeded RCA (`discuss/rca.md`).
- [x] Plan committed (this file); scaffold cherry-picked onto fork-tidy branch.
- [x] **E1 done:** `npm ci` in the worktree → local `node_modules` on jest-cucumber **4.5.0** (was resolving up to the main checkout's stale 3.0.2); 38 tests green on 4.5.0 = trustworthy baseline.
- [x] **Cycle 1 (P0) DONE** — commit `085859d`. H1 (throw on ambiguous step defs) + T1 negative suite. 42 tests green; code APPROVED, tests APPROVED_WITH_NOTES (notes applied).
- [x] **Cycle 2a (P1 runtime) DONE** — commit `0c17fb9`. M1 (hooks-as-arrays), M2 (dup-matcher throw), M4 (callsites robustness), M5 (errors:false-only throw). 49 tests green; both reviewers APPROVED_WITH_NOTES. M5 adjudicated to errors:false-scope after a probe showed the unconditional throw shadowed jest-cucumber's native default-path error (refuting the reviewers' "unreachable" assumption) — default-path transparency preserved.
- [x] **Cycle 2b (H2) DONE** — commit `3b6f168`. `.d.ts` StepChain return type + overloads; tsd type test (`test-d/index.test-d.ts`) wired via a `test-d` script + a CI Type-checking step that gates the release. crafter-reviewer APPROVED. `npm run test-d` green; void-revert reproduces 7 tsd errors (test genuinely guards H2).
- [x] **P0 + P1 COMPLETE.** All seven items (H1, T1, H2, M1, M2, M4, M5) landed on the fork-tidy branch (PR #7). Full suite: 49 jest tests + tsd, all green. **P2/P3 deferred** (M3 singleton-reset; L1 dead code; T2/T3 weak assertions; L2 outline edge cases) — plus the pre-existing prettier debt in `scenario-outline2.steps.js` (a T3 file). These are a follow-up PR/release.

## Caveat on nWave setup — RESOLVED
Earlier note said no `nwave` CLI was available. **Correction (2026-07-10):** `des` (`~/.claude/bin/des`) and `nwave-ai` are installed, and global `~/.claude/settings.json` registers the DES PreToolUse hooks. The edit/write gate self-skips unless `.nwave/des/deliver-session.json` exists (none here), and freshness auto-skips on this developer checkout — so config is honoured and enforcement is available, but the bug-fix flow runs without the DELIVER-session gates engaging.
