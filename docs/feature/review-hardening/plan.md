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
| L3 | P2 | **NEW (found 2026-07-13, not in the original RCA)** — the capture-injection path drops a docstring. `injectVariable` appends the step argument only when `Array.isArray(stepArgs)`, so a docstring (a non-array step argument) is silently discarded; the greedy `/<.*>/` pass-through branch forwards it. A step's docstring therefore reaches the step function or not depending on which matching branch it took. | forward the step argument regardless of its type (docstring, data table, or captures); regression test both branches |
| L4 | **P1** | **NEW (found 2026-07-13 by Vera, not in the original RCA)** — a regex step-matcher containing **escaped parentheses** crashes the whole suite when used in a scenario **outline**: `TypeError: Cannot read properties of null (reading 'index')` at `src/index.js:337`. The guard tests `regStepFuncLeft` for truthiness but then dereferences `regEscapedStepFunc`, a *different* variable, without a null check. The identical regex works in a plain scenario. **Verified PRE-EXISTING, not a regression** — reproduced identically with the L2 fix absent (`a3b6c3e`) and present. Worse than L2(a)/(c): those fail loudly with "no step definition", this one is an uncaught TypeError that stops the suite running at all. Repro: `Given(/I call the function (\w+\(\))/, …)` against an outline step `Given I call the function <func>`. | null-guard `regEscapedStepFunc` before dereferencing `.index`; regression test both the outline and plain-scenario paths |

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
- [x] **Cycle 3 (P2 — M3) DONE.** Folded into fork-tidy/PR #7 rather than a follow-up PR (decision below). 55 jest tests + tsd green.

## Decisions — Cycle 3 (2026-07-13)

- **P2/P3 fold into PR #7, not a follow-up PR.** Supersedes the "follow-up PR/release" note above, which assumed #7 would land first. Gearoid is still building on #7, so all hardening ships in one semantic-release bump — same rationale as the P0+P1 scope decision.
- **M3 contract (Gearoid):** reset step definitions AND hooks **after** each `Fusion()` has loaded its feature. A second `Fusion()` in the same module starts empty and must re-register its own steps. (Alternatives rejected: throw on a second `Fusion()` — collides with `m4-callsite-resolution.steps.js:74`, which asserts it must not throw; document-the-constraint-only — leaves the footgun armed for consumers.)
- **M3 implementation shape (Gearoid):** the literal trailing reset is only ~9 lines but yields **49/52** — it breaks `m1-before-hooks-clobber`, `hook-error`, and `ambiguous-step-shadowing`, whose fakes *defer* `defineFeature`'s callback until after `Fusion()` returns. The real port is synchronous (`node_modules/jest-cucumber/dist/src/feature-definition-creation.js:182,234-237`), so those three fakes are unfaithful. Chose to **thread the registry explicitly** (`registryForThisFeature` → `featureRegistry` param through the matching pipeline) instead of reading the module global, making the wrapper independent of *when* the port invokes its callback. Against the real port this is observationally identical to the trailing reset.
- **Reset is UNCONDITIONAL (orchestrator adjudication).** A code-review finding showed the reset sat at the end of `Fusion()`, so any throw skipped it and left the registry dirty — the M3 defect class on the sad path. Implemented as `try/finally`. Three throw routes verified against source and covered by tests D/E/F: `loadFeature` (missing feature file, `src/index.js:111`); `findMatchingStep` on an **ambiguous** step (`errors:true` default); an unmatched step (`errors:false`). *(An unmatched step on the `errors:true` default does NOT throw from the wrapper — it returns `null`; jest-cucumber's own step-count validation is what fails loudly.)*

## Review — Cycle 3 (M3)

**Verdict: APPROVED.** Test review APPROVED; code review APPROVED; Vera (user-examiner) PASS. Two findings were rejected as false positives, with evidence:

- **REJECTED — code-review D1 "post-`Fusion()` registration is orphaned" (raised BLOCKER).** Claim: after the reset, a `Given()` called post-`Fusion()` writes to an empty registry and is never used. **Refuted:** that is the supported path for feature two, and it is directly asserted — `m3-singleton-reset.steps.js:187-199` registers a step *after* the first `Fusion()` and asserts the second `Fusion()` binds it (`toHaveBeenCalledTimes(1)`). The reviewer's secondary claim (a `Before()` between two `Fusion()` calls clobbers feature two's hooks) is also false: hooks are arrays since M1 and are reset to `[]`, so the call populates feature two's fresh array — covered by test B.
- **REJECTED — Vera's first verdict, FAIL on "critical hook leak".** Her probe reset counters in the module body (**collection** time) but read them inside a step (**execution** time), so F1's hook firing during F1's *own* scenario was indistinguishable from a leak. **Refuted by reproduction:** an accumulating fire-count probe against a real `file:` install shows the pre-fix code firing `F1-BEFORE` **twice** during feature two (`["F1-BEFORE","F1-BEFORE","F2-BEFORE"]`) and the fixed code firing it **once** (`["F1-BEFORE","F2-BEFORE"]`). The leak is real, and the fix eliminates it. Vera re-derived her own corrected probe and returned **PASS, zero flags**.
- **Correction logged against the test author's comment.** The designer predicted that mutating the registry in place (instead of rebinding) would break test A. It does not — M3's fake is synchronous, so collection completes before `finally` runs. What in-place mutation actually breaks is the three *deferred*-fake files (`m1-before-hooks-clobber`, `hook-error`, `ambiguous-step-shadowing`). Right instruction, wrong stated guard; the crafter proved both by mutation probe.

Signed: Koru (orchestrator), 2026-07-13.

## Review — Cycle 4 (L2 + L1)

**Verdict: APPROVED.** Code review APPROVED; test review CONDITIONALLY_APPROVED (conditions met, see below); Vera FAIL — **the flag is real but out of scope, disposed as backlog item L4** (a named, owned residue, not a silent ship).

**Scope outcome — two of three L2 sub-defects were real; one was rejected with evidence:**

- **L2(a) REAL, fixed.** A literal capturing group in the fixed part of an outline step never bound: `(on|off)` failed, `(on|down)` worked. The discriminator was whether the group happened to contain a char from `[sSdDwWbB*]` — nonsense from a user's point of view. Fixed by OR-widening the predicate with `holdsCapturingGroup`. The widening was deliberate: *replacing* the old predicate would have narrowed it and regressed two live shapes — a non-capturing `(?:th|d|nd|rd|st)` group (`scenario-outlines.steps.js:104`) and escaped literal parens `\(n\)` (`:12`).
- **L2(c) REAL, fixed — and worse than the RCA judged.** The outline-detector character class held a bare `0` where `0-9` was meant, so *every* bounded quantifier (`(\d{4})`) was unreachable in an outline. The RCA's "no observed impact" was optimistic; impact was total for that shape.
- **L2(b) REJECTED with executed evidence.** The greedy `/<.*>/` does fire and does skip the wrapper's capture injection — but it skips it in favour of handing the RegExp to jest-cucumber, which re-matches and spreads `matches.slice(1)` (`feature-definition-creation.js:120-131`). On **captures** the two branches deliver identically, so there is no user-visible wrong behaviour to encode. Rejection is scoped to captures only — the branches are **not** equivalent in general (see L3).
- **L1 done.** Dead commented `FusionAll`/`walkthroughDirectory` block removed, plus a trailing commented `module.exports.FusionAll` that pointed at a function no longer defined anywhere. No live references remain (grepped).

**Findings rejected, with evidence:**

- **REJECTED — test review "fixture written against jest-cucumber 3.0.2, unvalidated against 4.5.0" (MED).** False. The installed version *is* 4.5.0 (E1 was resolved in an earlier cycle), and the cited `parsed-feature-loading.js:146-151` exists in the installed 4.5.0 and shows exactly the outline shape the fake mirrors. The reviewer trusted the stale E1 note in this RCA instead of checking `node_modules`.
- **REJECTED — test review "missing @story tag / user-stories.md traceability" (LOW).** This repo has no `user-stories.md`; it is a bug-fix flow, not a wave feature. The RCA citation *is* the traceability, as the reviewer itself conceded.
- **ACCEPTED — test review "the (b) rejection claim is overstated" (HIGH).** Upheld: the comment claimed the branches "deliver identical arguments" while also noting they differ on docstrings. Both cannot be true. The claim is now scoped to captures, and the docstring difference is tracked as **L3**.
- **ACCEPTED — test review "orthogonality of the two fixes is unguarded" (MED).** Upheld: (a) and (c) have independent discriminators and were fixed together, with nothing pinning the crossover shapes. Two crossover CONTROL tests added (`(\w{4})` — a bounded quantifier whose group *does* hold a legacy-detector char; `(v1|v2)` — a literal alternation holding none). *Orchestrator error, corrected by the designer:* I specified `(yes|no)` as the second control, but `yes` contains an `s`, which IS in `[sSdDwWbB*]` — it was already visible to the legacy detector and would have guarded nothing. The designer kept the property and swapped the example.

**Vera's flag (disposed, not dismissed):** a regex matcher with **escaped parentheses** in a scenario outline crashes with an uncaught `TypeError` at `src/index.js:337`. I reproduced it against `a3b6c3e` (L2 fix absent) and the fixed tree — **identical crash in both**, so it is pre-existing and not caused by this change. Blocking a strict improvement on an unrelated pre-existing crash would be wrong; tracked as **L4 (P1)** and to be fixed in its own cycle.

Signed: Koru (orchestrator), 2026-07-13.

## Caveat on nWave setup — RESOLVED
Earlier note said no `nwave` CLI was available. **Correction (2026-07-10):** `des` (`~/.claude/bin/des`) and `nwave-ai` are installed, and global `~/.claude/settings.json` registers the DES PreToolUse hooks. The edit/write gate self-skips unless `.nwave/des/deliver-session.json` exists (none here), and freshness auto-skips on this developer checkout — so config is honoured and enforcement is available, but the bug-fix flow runs without the DELIVER-session gates engaging.
