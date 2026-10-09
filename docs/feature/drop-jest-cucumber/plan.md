# Plan: drop jest-cucumber (build on jest + @cucumber/gherkin)

Living plan. Updated as the work moves; correct anything here that proves wrong.

## Goal

Remove the runtime dependency on `jest-cucumber` and build `Fusion()` directly on `jest` and
`@cucumber/gherkin`. This clears Dependabot alert #1 (`uuid` GHSA-w5hq-g745-h8pq, the only
runtime-scope alert, reachable only through jest-cucumber 4.5.0 and `@cucumber/gherkin@28`) and should
close L5 (empty docstring inside an outline, `docs/feature/review-hardening/plan.md:67`).

- Branch: `worktree-drop-jest-cucumber`, from `master` at `40aa6a5` (2.0.0).
- Issue / tracker: none (Dependabot alert #1; Jira item pending Gearoid's decision). PR: [#16](https://github.com/gotreasa/jest-cucumber-fusion/pull/16) (draft, opened 2026-10-09).
- Size: **L**, estimated 15 to 25 paid turns.

## Decisions (Gearoid, 2026-10-07)

1. Options: implement `tagFilter`, `errors` (boolean or the 3-key object) and `scenarioNameTemplate`.
   Keep `loadRelativePath` as a typed no-op. Drop `runner` from the public types.
2. jest describe and test names stay byte-identical to 2.0.0.
3. Release as **3.0.0** (breaking).
4. Architect it properly first, with diagrams. Open: what replaces jest-cucumber's global config
   (`setJestCucumberConfiguration`), and the missing-step suggestions, which today come out in
   jest-cucumber's `test(..., ({ given }) => ...)` format instead of Fusion's `Given(...)` format
   (`node_modules/jest-cucumber/dist/src/code-generation/scenario-generation.js:7`,
   `step-generation.js:7`). More decisions are expected from the architecture pass.

### Architecture rulings (Gearoid, 2026-10-07, on `design/architecture-pass.md`)

5. **D-A:** global options via a new `setFusionConfiguration(options)` export; merge order
   `defaults < global < per-call`. Breaking (import moves).
6. **D-B:** one Fusion-owned unmatched-step error, always loud, with starter code in Fusion's
   `Given("...", () => {})` idiom. `errors: false` / `stepsMustMatchFeatureFile: false` turn the
   scenario into a visible skipped test, never a silent pass. Fix the stale `errors` docs. Breaking.
7. **D5:** fix `scenarioNameTemplate` so it applies to outline rows too (narrow, accepted exception
   to decision 2; only template users see a change). Breaking.
8. **Pin the CommonJS cucumber line:** gherkin 39.1, messages 32.3, tag-expressions 9.1.
9. **D2:** delete the 155-line outline heuristic; outline steps match their substituted text. A row
   whose value does not fit the definition's regex goes from "runs with no captures"
   (`feature-definition-creation.js:123-131`) to a loud unmatched-step error. Release note.
10. **D6:** drop jest-cucumber's `pending()` source sniff; add no `pending` verb. Release note.
11. **D7 = 7a:** failing-step text stays byte-identical (`Failing step: ... Step arguments: ...
    Error: ...`). A richer message with feature file and line is a later `feat:` (3.1), not 3.0.0.
12. Taken as recommended, no objection raised: D1 (keyword via `astNodeIds`), D3 (argument shape),
    D4 (tag-expressions 9.1 wrapped case-insensitive), D8 (missing-file message plus base dir),
    D10 (seams `src/feature-source`, `src/test-registration`; `l2`/`l4` move to real features),
    value slicing V1 to V7, paradigm procedural.

Why CommonJS (explained 2026-10-07): Fusion is `require()`d by consumers' `.steps.js` under their
Jest, so its format is bounded by what their Jest can load; ESM-only would need Node 24.9+ or Jest's
ESM mode. Going ESM or dual-publishing is a separate, later decision.

## Baseline (measured 2026-10-07 at `40aa6a5`)

- `npx jest --coverage=false`: 21 suites, 392 tests, all green.
- 8 of 21 test files `jest.mock("jest-cucumber", ...)` (corrected from 9: `m4` also mocks
  `callsites`, which the first grep double-counted). The internal seam moves with this change.

## Finding R1: the latest cucumber packages are ESM-only (measured 2026-10-07)

Raised by the architecture pass, then reproduced. Probe scripts in the job tmp dir
(`esm-probe.sh`, `cjs-probe.sh`), outside the repo.

- `@cucumber/gherkin@42`, `@cucumber/messages@34` and `@cucumber/tag-expressions@10+` publish
  ESM only (no `require` export condition).
- Plain Node 22.22 can `require()` them. **Jest 30 on Node 22 cannot**: `Must use import to load
  ES Module` (`jest-runtime/build/index.js:452`); Jest supports `require(esm)` only on Node 24.9+.
  Fusion runs inside the consumer's Jest, so this would break every consumer below Node 24.9.
- The last CommonJS line works: **`@cucumber/gherkin@39.1.0` + `@cucumber/messages@32.3.1`**
  (dual export, deps `reflect-metadata` + `class-transformer`) loads under Jest 30 on Node 22,
  `npm ls uuid` is empty, pickles substitute outline titles (`Selling an hat`) and keep an empty
  docstring as `""` (L5). **`@cucumber/tag-expressions@9.1.0`** is the last dual-published version.
- Cost: pinned to majors upstream has moved past. Moving forward needs Node 24.9+ or ESM.
  This plan's earlier "gherkin 42.x" assumption (from the 2026-10-02 decision) is wrong for CJS.

## Steps

- [x] Clean up merged worktrees (`fork-tidy`, `ci-dependabot`, `undici-security`); fast-forward
      local `master`. `chore/undici-security` needed `-D` (ahead of its own remote, though its tip
      `1b86e7a` is in `master`); deleted with Gearoid's nod.
- [x] Architecture pass (`nw-solution-architect`, read-only): responsibility inventory, C4 and
      sequence diagrams, decision register, proposed value slicing. Written up in
      `design/architecture-pass.md` (UNREVIEWED options paper; 5 Mermaid diagrams render-checked
      with mermaid-cli 11). Koru re-verified R1, #13, #22, #25, #30, D5, D-B, D10 (8 mock files,
      not 9 as the baseline said).
- [x] Gearoid decides the open architecture items (D-A, D-B, D5, CJS pin, D2, D6, D7): all ruled.
- [x] Commit plan and diagrams: `85d54a3` (signed, after two 1Password approval retries).
- [x] `des po` (Request + 5 values via `nw-product-owner`): brief `docs/feature/drop-jest-cucumber/brief.md`.
- [x] `des design --shared`, then per value: design, oracle, craft. All five GREEN.
- [x] `des verify`: candidate `9b2bca97`, 17 of 17 declared vectors exit 0 in a clean checkout.
- [x] Reviewer (`nw-software-crafter-reviewer`): accepted, no blocking finding.
- [x] Examiner (`nw-user-examiner`, source-blind): indeterminate twice, nothing contradicted (below).
- [x] `des integrate`, then signed amend (Gearoid's go) to `e2b1445 feat!: replace jest-cucumber
      with jest + @cucumber/gherkin` with a BREAKING CHANGE body; tree identical to `9b2bca97`.
- [x] Docs: README and `docs/AdditionalConfiguration.md` updated (V5).
- [ ] Push branch and open PR. **Held: Gearoid chose "nothing outward yet" on 2026-10-07.**
- [ ] Release 3.0.0 via semantic-release on merge.

## Delivery log (2026-10-07)

Parked outside the repo while the tree was frozen, applied here after the amend.

- **Values:** V1 walking skeleton (packed-tarball consumer, no jest-cucumber or uuid, names and
  failing-step text byte-identical, L5); V2 unmatched-step refusal with Fusion-idiom snippets,
  `errors: false` as a visible skip, duplicate titles; V3 `tagFilter`; V4 `scenarioNameTemplate`
  on every test; V5 `setFusionConfiguration` and docs.
- **Shared design:** two host review findings (names oracle scoped to Fusion-generated suites;
  hard-coded counts removed) and one DES refusal (missing agreement party), all before binding.
- **Real defects found on the way:** `src/configuration.js` replaced the whole `errors` object
  (V2 fixed: key-wise merge); the crafter's own first cross-layer merge re-enabled a globally
  disabled key (found by probe, fixed in V5); 2.0.0 registers plain scenarios before outline rows,
  not document order (V1 honours it).
- **Examiner evidence:** installed-host captures from the packed candidate, side by side with the
  published 2.0.0: names-only diff empty, failing-step text diff empty, the same outline rows FAIL
  on 2.0.0 (L5) and pass on the candidate, step received `note ["bread",""]`.
- **Paid role turns:** about 24 (architect 10 incl. design rework, PO 1, acceptance designer 4,
  crafter 5, reviewer 1, examiner 2 CLI runs at $0.59 and $0.77). No Jev calls.

## Field traps measured in this delivery (candidates for `koru-nwave-rules` section 4)

1. **Binding a later value's design moves earlier values' records.** Every value's record covers
   its authority section, and every section is appended to the one
   `docs/feature/<id>/architecture/brief.md`, so `des design --value N+1` flips value N to
   `oracle=bytes moved craft=bytes moved`. `des verify` accepted it; no re-record was needed.
2. **Never batch two values' craft in one role turn.** `RecordIdentity` hashes every shared or
   prerequisite agreement-party file that is not the value's own target
   (`des/application/delivery_continuation.py:3290-3333`), so crafting V4 and V5 together moved
   each other's oracle identity (`OracleRecordMoved`). Repaired at zero turns by `des oracle`
   re-records (accepted with `verdict=green`; original RED kept in the native logs).
3. **The examiner packet must carry no package source path**: Jest stack traces do. Capture with
   `jest --noStackTrace` (`ObservationPacketRefused: path_bearing`).
4. **A role with only `Read` cannot expand a glob.** Give literal paths in reviewer briefs.
5. **Role notifications truncate long results.** Recover JSON manifests verbatim from the
   subagent transcript (`json.JSONDecoder().raw_decode` from the marker), never from the summary.

## Open items and follow-ups

- **Examiner indeterminate items** (no consumer-side capture; each asserted by an acceptance
  oracle that `des verify` ran green): And/But binding; hooks once per test; Rule with its own
  Background; `stepsMustMatchFeatureFile: false` alone; table/docString parameter in snippets;
  outline rows never duplicates; malformed tag filter refusal; excluded unbound scenario skipped
  once; excluded step functions never run; template on a tag-skipped test; throwing or non-string
  template refusal; non-object setter refusal; second setter call replaces.
- **Reviewer notes for the oracle owner** (not blocking): N1 the arch spec's scanner desyncs on a
  quote inside a regex literal (`src/code-suggestion.js:33`; code verified clean); N2 stale
  "eight names" prose in that spec; N3 the duplicate-count digit window in
  `assert-validation-report.js`; N4 a hard-coded population literal in the V4 oracle; N5 the m5/m3
  doubles re-implement the `errors` decision; J4 unbound-step de-duplication is unobserved.
- **Reviewer's updated verdict** (same `accepted`, plus it verified the V4/V5 RED logs) could not
  be recorded: DES keeps one result per sealed input.
- Later releases: richer failing-step message with feature file and line (3.1); `jest` as a
  peerDependency (R10); Node 24.9+ or ESM to follow the cucumber majors.
- **ES module and TypeScript examples** (Gearoid, 2026-10-09: follow-up PR after #16 merges).
  The old "examples are provided in both ECMAScript and TypeScript" line was never true: `master`
  has no `.ts` or `.mjs` file under `test/`. A probe (job tmp `esm-ts-probe.sh`) shows a native
  `.steps.mjs` file passes under `NODE_OPTIONS=--experimental-vm-modules jest`, with a relative
  feature path (Jest hands `callsites` a plain path, not a `file://` URL) and with an
  `import.meta.url` path. A `.ts` steps file was not run (no `ts-jest` or Babel preset installed).
  Scope: one tested `.steps.mjs` and one `.steps.ts` example, a second Jest project wired into
  `npm test`, an "ES modules and TypeScript" section in `RunningTheExamples.md`, and a fix to
  `docs/Language.md:77`, which says ES module syntax needs a transform such as Babel (the
  probe ran native ESM with `--transform '{}'`).

## Post-delivery probes (2026-10-08, on `b4b15b6`, disposable copies only)

- **Mutation (Stryker 9.6.1, all 10 `src/*.js`): FAIL, 464 / 609 = 76.2% against 80%.**
  Run 1 (Jest runner) was invalid evidence: it lost the active mutant in the oracles' child Jest
  runs (proven on `configuration.js:78`: killed by hand, reported Survived) and filed 247
  collection-time detections as RuntimeError. Run 2 used the command runner over the acceptance
  set (whole suite plus the four behavioural report scripts): 463 killed, 1 timeout, 145
  survived, 0 runtime errors. Of the survivors, 74 are WHY/HOW message prose that oracles do not
  pin by design; most of the rest are defensive `|| []` fallbacks. Real gaps, smallest missing
  observation each: malformed Gherkin never fed to Fusion (`feature-source.js:72`; `:80`, the
  compile refusal, is likely unreachable after a successful parse); header-only data table never
  delivered (`step-argument.js:20`, which on inspection is an equivalent mutant: Gherkin cannot
  produce a zero-row table). **Corrected 2026-10-08:** this list first named case-only
  duplicate titles at `feature-source.js:137`; Stryker's two survivors there are drop-`.trim()`
  and `toUpperCase`, both equivalent, so that was not a gap. Unbound-step de-duplication
  unobserved (`code-suggestion.js:110-114`); asterisk and empty keyword refusals unobserved
  (`keywords.js:38,50`); a non-Error throw from a step (`test-registration.js:70`); template
  returning "" or throwing a non-Error (`scenario-name.js:82,92`); `setFusionConfiguration(null)`
  (`configuration.js:57`); multi-digit capture in snippets (`code-suggestion.js:18`).
- **Smoke: 41 / 41 pass** on Node 20.20.2, 22.23.3 and 24.21.0 (13 consumer journeys each, plus
  plain `require` outside Jest) and two TypeScript consumer checks.
- **Fuzz:** existing P1 to P5 at 2,000 cases: 15,928 / 15,928 pass. New F2 (tag filter vs model,
  20,000), F3 (672 keywords across 80 dialects, exhaustive), F4 (tables and docstrings, 500), F5
  (template vars, 500), F6 (errors merge vs model, 20,000) pass. **F1 (refusal, paste snippet,
  bind) fails 243 / 500: two real snippet defects, both inherited from jest-cucumber's generator,
  not regressions:** a decimal or signed number gets `(\d+)` so the snippet does not match its own
  step (`3.14`, `-5`, `.5`); a `/` is not escaped, so the snippet is invalid JavaScript
  (`a ratio of 1/2`). Cause: `src/code-suggestion.js:18-21,31`.
- **Packaging:** no `files` field. The published 2.0.0 shipped a 10.4 MB `codecov` binary from
  the CI checkout; 3.0.0 will too unless `files` is added. The candidate tarball also ships the
  whole `test/` tree (111 files).

## Follow-up fixes (Gearoid: "Yes, do the next steps", 2026-10-08)

Route: direct test-first work plus one independent reviewer and a targeted mutation re-run, not a
DES loop (mechanical fixes against settled decisions; the fuzz property is the oracle; the gap
tests pin behaviour that already holds, so their proof is killing the named survivors).

- [x] RED: `snippet-binds.steps.js` (9 named examples + 150 seeded property cases: refusal,
      paste, bind) failed 86 of 235, only for decimal/signed/leading-dot numbers and `/` in a
      regex snippet; integers and quoted strings already passed. `package-files.steps.js`
      failed on non-runtime files.
- [x] GREEN: `src/code-suggestion.js` keeps `(\d+)` for unsigned integers and suggests
      `([-+]?\d*\.?\d+)` for any other detected number; `/` is escaped. `package.json`
      `files: ["src/"]`: 14 files, 79.6 KB (2.0.0: 57 files, 10.6 MB). Snippet tests 318/318.
- [x] Gap tests (`refusal-edges.steps.js`, green on arrival as characterisation): malformed
      Gherkin refused by name with nothing registered; case-only duplicate titles one entry
      "declared 3 times"; header-only table delivers `[]` (its guard at `step-argument.js:20`
      is unreachable from Gherkin, an equivalent mutant, so this pins the promise only).
- [x] Verify: 17 of 17 vectors exit 0; prettier clean on 96 project files; fuzz F1 500/500
      (was 243 failing).
- [x] Targeted Stryker (command runner, full acceptance set): `feature-source.js:72` parse
      refusal now KILLED; `:80` compile refusal still survives (likely unreachable after a
      successful parse); `:137` survivors are drop-`.trim()` and `toUpperCase`, both equivalent
      (removing the case folding, which Stryker does not generate, fails the new test: measured
      by hand).
- [x] Independent review (`nw-software-crafter-reviewer`): accepted, no blocking finding. Acted
      on: N1 U+2028/U+2029 still broke a regex snippet (reproduced: `Invalid regular expression:
      missing /`; fixed by `\u` escapes, example added); N2 test comment over-claimed `:80`
      (reworded); N3 the arity check was self-referential (named examples now pin the exact
      snippet text); N6 `npm pack` ran twice (memoised; CI is ubuntu-only, so Windows does not
      apply); N8 the 86 RED failures reconcile as 79 property + 6 examples + 1 packaging.
      Noted, not acted on: N4 derived survivors (dedup, pluralisation, docstring/table params in
      snippets); N7 README's relative `docs/` links dangle inside `node_modules` (npmjs.com
      rewrites them).
- [x] Re-run Stryker on `src/code-suggestion.js`: every targeted survivor killed (`:18` all 10
      regex mutants including the multi-digit split, `:25`, `:26`, `:30` all 4); file score
      89 / 107 = 83.2% (was 77.8%). Left: dedup at `:129-133` (J4) and pluralisation at `:156`.
- [x] Final: 17 of 17 vectors exit 0; whole suite 32 suites, 771 tests; prettier clean.
- [ ] Signed commits.
- **Open, for Gearoid:** about 150 em dashes in code comments and test prose (new `src/`
      modules and oracles from this delivery, plus older PR #7 regression tests). The ban lists
      config, rule, reference, plan and docs files; code comments are not named, and the rules
      say converge opportunistically, never in a sweep. Not swept.

## Refactor (Gearoid, 2026-10-08: `/nw-refactor`, all of `src/`, RPP L1-L6, same branch)

Rulings: scope all 11 `src/` modules; depth L1-L6; recast em dashes in the `src/` comments the
pass touches (tests untouched, so theirs remain); land on this branch before the PR.
Constraints: behaviour-preserving; tests NOT changed (a test needing a change means the refactor
altered behaviour, so revert); procedural paradigm (ruled); the architecture law test (only
`feature-source` reaches `@cucumber/*`, `fs`, `callsites`; only `test-registration` names a Jest
global; exactly nine public exports); public API and 2.0.0-compatible names and texts unchanged.

- [x] Baseline metrics (ESLint complexity rules on a copy of `src/`): 1,203 lines; 51 functions
      with complexity >= 2, sum 142; max complexity 7 (`scenario-name.js`, the only one over 5);
      longest function 29 lines; max depth 2; max params 5 (`step-matching.js`). Already lean,
      so the burden of proof is on change.
- [x] Architect pass (`nw-solution-architect`, read-only): 18 findings, 11 explicit
      "leave alone"s, nothing earns a change at L6 (every candidate sits where the bound design
      put it). `des code-fact` degraded to noisy text search for JavaScript (AST adapter is
      Python-only), so caller facts rest on exhaustive grep plus whole-file reads. Plan kept in
      the job tmp dir. Koru dropped F7 (keep the `starterCodeFor` export: the fuzz harness uses
      it). Open for Gearoid: F4, the stale `src/index.d.ts` header (0.6, old author and URL),
      untouched because `index.d.ts` is under the byte-identical constraint.
- [x] `nw-software-crafter` `/nw-refactor` as one batch (F1, F3, F6, F9, F10, F12, F13, F14,
      F16, F17): suite green on the first run, nothing reverted, no test touched (host-checked:
      only `src/*.js` changed, `index.d.ts` untouched). Metrics after: max complexity 7 to 5,
      functions over 5: 1 to 0, max params 5 to 3, `scenario-name.js` longest function 29 to
      17, complexity sum 142 to 141, functions >= 2: 51 to 54 (extracted helpers), lines 1,203
      to 1,208 (code -17, explanatory comments +22). 17 of 17 vectors exit 0 (host re-run).
      Only em dash left in `src/` is `index.d.ts:46` (frozen). Note: `prettier --check .`
      fails only on DES logs under `.nwave/` (no `.prettierignore` entry; pre-existing).
- [x] Re-verify on the committed refactor (HEAD `0b241c5`, Gearoid: "Do 1 and 2"):
      - 17 of 17 vectors exit 0.
      - Full Stryker, command runner: BEFORE (`66c9c73`) 617 mutants, 477 killed, 2 timeouts,
        138 survived = 77.6%; AFTER (`0b241c5`) 605 mutants, 470 killed, 0 timeouts, 135
        survived = 77.7%. Every file within a fraction of a point; `index.js` 82.7 to 83.6,
        `scenario-name.js` 64.2 to 64.8. 12 fewer mutants because `matchAll` removed the regex
        clone. The first AFTER attempt was stopped by Claude Code at 55% on low host memory;
        cause: each of 6 Stryker workers ran Jest with its default 11 workers. Re-run at 3
        Stryker workers with `jest --maxWorkers=2` completed in 22 minutes.
      - Fuzz: new-surface properties 3,002 of 3,002 real checks (F1 500/500; F3 again fails
        only the harness's own `> 1000` completeness flag, `failures: []`); existing P1-P5 at
        2,000 cases 15,928/15,928; `snippet-binds` at 1,000 property cases 2,020/2,020.
      - Smoke 41/41 on Node 20.20.2, 22.23.3, 24.21.0 plus TypeScript; tarball 14 files,
        26.8 KB packed.
- [x] F4 (Gearoid: go): `src/index.d.ts` header now names this package and repository,
      keeps the original author's credit, drops the frozen 0.6 version and the unchecked
      minimum TypeScript version; last `src/` em dash recast. `0b241c5`, tsd green.
- [x] Independent review (`nw-software-crafter-reviewer`): accepted, 7 notes, none blocking.
      All ten executed findings observably identical (checked `matchAll` vs the `exec` loop on
      `lastIndex`, global flag, empty and non-string input; F9 traversal and rule-child visit;
      F10 first-resolvable `astNodeId`; F16 read order). Only unreachable differences: a
      different `TypeError` site for a non-string step text, and one extra stack frame. No
      mutant newly survivable; nothing judged churn. Left as a note: `isFunctionForScenario`
      keeps its old name (F17 was scoped to the lines F16 moved).
- [x] Signed commits: `37dccbe` refactor, `0b241c5` types header. Push stays Gearoid's call.

## Codecov on PR #16 (Gearoid, 2026-10-09: "There are failures from codecov in the PR body")

- [x] RCA (`nw-troubleshooter`, re-verified on the host): `codecov/patch` (94.48%) and
      `codecov/project` both fail against Codecov's default target, the base's 100%. 18 lines
      uncovered, 352 of 370 locally, matching Codecov exactly. Three causes: (A) 8 lines in
      `configuration.js` ran only in the v5 child Jest runs and the baseline scripts, which
      Istanbul never sees; (B) 5 lines in `keywords.js` and `scenario-name.js` that no test
      reached; (C) 5 defensive arms the real parsers never trigger.
- [x] Fix, Gearoid chose "Unit tests + narrow mock" for C. No gate weakened, no
      `codecov.yml`, no ignore pragma. Three test files:
      - `global-configuration-in-process.steps.js` (A): the refusal of a string, `null` and an
        array; a global `tagFilter`; replace semantics; `errors` merged per key; `errors:
        undefined`.
      - `unpinned-refusals.steps.js` (B): the asterisk step refusal; a template returning `""`;
        a template throwing a non-Error.
      - `defensive-arms.steps.js` (C): `tagFilterFor` with a parser that throws a string;
        `stepArgumentFrom` with an empty docString and an empty argument; `bucketForKeyword`
        with no dialect name; `feature-source` loaded once with only `gherkin.compile`
        overridden (`jest.isolateModules` + `jest.doMock`), to throw and to return a pickle step
        whose `astNodeIds` name no step.
- [x] Measured: line coverage 100% in every `src/` file (was 95.13%); suite 36 suites, 790
      passed, 2 skipped (the tag-filtered scenario and the unbound scenario with the step check
      off, both by design); 17 of 17 vectors exit 0; `tsd` green; prettier clean.
      Branch-only partials remain (for example `feature-source.js` 165-183); they did not count
      in Codecov's line figure before and are not addressed.

## Blockers

None. Draft PR #16 is open; pushing new commits is Gearoid's call.
