# Plan: drop jest-cucumber (build on jest + @cucumber/gherkin)

Living plan. Updated as the work moves; correct anything here that proves wrong.

## Goal

Remove the runtime dependency on `jest-cucumber` and build `Fusion()` directly on `jest` and
`@cucumber/gherkin`. This clears Dependabot alert #1 (`uuid` GHSA-w5hq-g745-h8pq, the only
runtime-scope alert, reachable only through jest-cucumber 4.5.0 and `@cucumber/gherkin@28`) and should
close L5 (empty docstring inside an outline, `docs/feature/review-hardening/plan.md:67`).

- Branch: `worktree-drop-jest-cucumber`, from `master` at `40aa6a5` (2.0.0).
- Issue / tracker: Dependabot alert #1. No Jira item: Gearoid ruled on 2026-10-09 that this
  repository gets none, as it is unrelated to nWave or Brix Consulting. PR: [#16](https://github.com/gotreasa/jest-cucumber-fusion/pull/16) (draft, opened 2026-10-09).
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
- [x] Push branch and open PR. Held on 2026-10-07 ("nothing outward yet"); draft PR #16
      opened 2026-10-09 on Gearoid's go, and every later push on his go.
- [ ] Release 3.0.0 via semantic-release on merge (squash with the PR body's message).

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
- **Dependabot on `master`** (checked 2026-10-09, 6 open). #1 `uuid` (runtime, via
  jest-cucumber and `@cucumber/messages`): absent from this branch's lockfile, so the merge
  removes it. The other 5 are dev-only copies bundled inside the npm CLI 11.21.0 that
  `@semantic-release/npm` (`^11.6.2`) pulls in: `ip-address` 10.5.0 (#33, #34, #59; fixed in
  10.7.1), `brace-expansion` 5.0.9 (#55; 5.0.12), `undici` 6.28.0 (#46, low; 6.28.1). 11.21.0
  is the newest npm 11, and npm 12.2.0 bundles the same three versions, so no release fixes
  them yet; `overrides` cannot reach bundled dependencies. None ships (`files: ["src/"]`); they
  run only in the CI release job. Left open so they close when an npm release bundles the fixes.
- **Node and Jest version matrix** (Gearoid, 2026-10-09: follow-up, not PR #16). Today CI runs
  only Node 24 (`node-version: 24`) with the lockfile's Jest 30. Two by-hand runs exist, both
  with scripts in the job tmp directory, not the repository: the smoke test on 2026-10-08 (Node
  20.20.2, 22.23.3, 24.21.0; Jest 30; 41/41), and the migration matrix (`migrate/jest-matrix.sh`:
  the candidate in consumer projects on their own Jest 27, 29 and 30, Node 22; identical
  results, 8 of 10 suites passing with only the 2 intended refusals failing, 11 passed and 2
  skipped). Corrected 2026-10-09: this entry first said no Jest below 30 was ever tested, which
  was wrong. Gaps: none of this runs in CI (Fusion calls the runner's `describe`/`test` globals,
  `src/test-registration.js:126,138`, so the consumer's Jest is what counts); `jest` is a runtime
  `dependency` (`^30.4.2`), so a Jest 29 consumer gets an unused second Jest (R10); no `engines`
  field. Node 20 reached end of life on 2026-04-30 (from memory, confirm). Scope: a CI matrix
  job, Node 22, 24 and 26 × Jest 29 and 30, running `npm test` with Jest overridden per cell;
  then `jest` moved to `peerDependencies` (`^29 || ^30` only if Jest 29 passes, else `^30`) and
  an `engines` field. Decision for Gearoid: support Jest 29, or declare Jest 30 only (Node-only
  matrix, three cells).

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
- [x] Signed commits. Checked 2026-10-10: `f9f8d42` carries an SSH signature and GitHub
      reports it verified (`reason=valid`), as it does the head `aeb829b`. Locally `%G?`
      shows `N` only because no `gpg.ssh.allowedSignersFile` is configured to verify with.
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
- [x] Branch gaps (Gearoid, 2026-10-09: "add the tests and the Given(42) refusal"). Istanbul
      listed 21 untaken arms in 15 places. 6 were reachable through the public API, each
      proven by a probe: `errors: true`; two duplicated titles (plural message); a file with
      no `Feature:`; `scenariosMustMatchFeatureFile: false` in-process; a step throwing a
      non-Error; a matcher neither string nor RegExp, which was **silently ignored** (0.8.1 the
      same, observed; `undefined` threw a raw `TypeError`). The other 9 are defensive
      `|| []` and parser-shape guards, left as they are.
      - `branch-behaviours.steps.js` pins the 6; the matcher test was RED first.
      - `src/index.js` refuses an unsupported matcher at the call, with a WHY/HOW message, and
        uses one `Object.prototype.toString` regex test (the chained-object check's) in place of
        `constructor === RegExp`. `docs/Migrating.md` gains the version 3 row.
      - Measured: 37 suites, 796 passed, 2 skipped; branch coverage 88.67% to 92.72%
        (`configuration.js`, `test-registration.js` now 100%); 17 of 17 vectors exit 0;
        prettier clean. Remaining branch gaps are exactly the 9 defensive guards.

## Hooks, baselines in CI, secrets (Gearoid, 2026-10-09)

Asked: "wire the baseline scripts into CI, along with the git hooks"; Husky; pre-commit with
lint-staged, commit-msg commitlint, pre-push tests and baselines; secret detection; investigate
the missing ESLint. Before this the repo had no hooks of any kind and no ESLint, ever (none in
its history, b-yond's included). The 6 baseline scripts pass, about 31s together.

- [x] Dev dependencies: husky, lint-staged, @commitlint/cli and config-conventional,
      secretlint with the recommended preset (npm-native, chosen over Yelp's detect-secrets,
      which needs Python on every machine; Koru's assumption, open to Gearoid).
- [x] `npm run test:baseline` runs every `test/specs/baseline/assert-*.js`; `npm run
      lint:secrets` scans the repository.
- [x] `.husky/pre-commit` (lint-staged: secretlint and prettier on staged files),
      `.husky/commit-msg` (commitlint), `.husky/pre-push` (`npm test`, `tsd`, baselines).
- [x] CI `integration` job runs the baselines and the secret scan.
- [x] Each hook proven to block (2026-10-09): commitlint rejected "Added some stuff" (HEAD
      unchanged); lint-staged's secretlint rejected a staged fake `ghp_` token (`pre-commit
      script failed`); the pre-push commands under `set -e` stopped at a failing test, exit 1,
      before the baselines. Clean pre-push takes 40s. The tooling commit `fffe852` itself went
      through the hooks (prettier reformatted `run-all.js`). `npm run lint:secrets` finds
      nothing in the repository and catches a planted token. Only runtime lockfile change:
      `picomatch` 4.0.5 to 4.0.7 (hoisted patch).
- [x] Known and left: 13 earlier commits on this branch have unwrapped bodies (137 to 664
      characters) that commitlint's `body-max-line-length` (100) rejects. Not rewritten: the
      PR squash-merges into a message within 72, and CI does not lint commits.
- [x] Side effect: Husky set `core.hooksPath=.husky/_` in the config shared with the main
      checkout; `master` has no `.husky/` until this merges, so no hooks run there yet.
      lint-staged backs up through the shared stash and drops its entry when done.
- [x] ESLint investigated with a throwaway ESLint 9 probe (recommended plus jest recommended):
      76 files, 106 errors, 2 warnings, zero real defects. 90 `jest/no-standalone-expect` on
      `expect` inside step callbacks; 5 `no-undef` on the Jest globals that
      `src/test-registration.js` uses on purpose; 10 `no-unused-vars` on positional step
      arguments in examples; 1 `expect-expect` on an `expect*` helper; 2 stale disable
      directives. All are configuration. Adoption is Gearoid's call.
- [x] Scanner comparison (Gearoid: "research how good Yelp's detect-secrets is versus
      secretlint"). Synthetic corpus of 19 secret formats and 8 look-alikes: detect-secrets
      1.5.0 caught 17 with 3 false positives (entropy noise), secretlint 13.0.7 caught 14
      with 0. detect-secrets' last release is 1.5.0 of 2024-05-06 (PyPI); secretlint 13.0.7
      is of 2026-10-03 (npm) and needs Node >= 22. `--no-glob` is not needed with v13: a
      token in a staged `[id].planted.js` was blocked. Kept secretlint.
- [x] Custom secretlint patterns (Gearoid, 2026-10-09): a Google API key (`AIza` plus 35)
      and a quoted literal of 8 or more characters assigned to password, passwd or pwd,
      skipping placeholders, `${...}` and the dummies changeme, password, example,
      placeholder, `xxxxxxxx` and `********`. 13 pattern cases behave as intended; the
      corpus score rises to 16 of 19 with 0 false positives; the repository scans clean.
- [x] ESLint adopted (Gearoid, 2026-10-09): `eslint.config.js`, ESLint 9 recommended plus
      the Jest plugin's recommended set for tests. `jest/no-standalone-expect` treats
      Given, When, Then, And and But as test blocks, with two decided allowances: `jest.fn`
      fakes and `afterAll` checks. `expect*` helpers count as assertions; unused positional
      step arguments are allowed in tests; Jest globals are declared for
      `src/test-registration.js` only. Two stale disable comments removed. `npm run lint`
      is clean at `--max-warnings 0`, and a probe proved it still errors on a top-level
      expect, an unused variable in `src/` and an undeclared `describe`. Wired into
      lint-staged (`*.js`) and the CI `integration` job.

## PR #16 adversarial review, smoke and fuzz (Gearoid, 2026-10-09)

Asked: "run an adversarial review, a smoke test and fuzz tests on the PR 16", then "Let's
address all 8". Evidence, all on `be4df4f` from the packed tarball, harnesses in the job scratch
directory (not kept):

- Smoke: suite 37 suites, 796 passed, 2 skipped; lint, tsd and the 6 baselines clean. A fresh
  consumer (Background, Rule, two Examples, tables, docstrings, async and regex steps,
  `setFusionConfiguration`, a template, one deliberate failure) held 10 of 10 on Node 18.19,
  20.17, 22.22 and 24.11 with Jest 30, and on Node 22 with Jest 29.7 and 27.5.
- Fuzz: existing properties on fresh seeds 8,968 of 8,968. Differential against npm 2.0.0
  (both on Jest 29.7): 490 cases, 2,254 tests, zero differences in names, order, status,
  failure text or step arguments; 270 "wild" cases differed only in finding F3. tagFilter
  against an independent evaluator 300 of 300; 120 hostile template returns as specified.
- Adversarial review: a fresh general-purpose agent (Opus), read-only. Its findings are
  hypotheses; F2 and F4 were reproduced by Koru, F6 to F8 rest on its own runs.

Route: direct test-first work, one commit per finding, then one independent reviewer, as in
"Follow-up fixes" above (mechanical fixes against settled decisions).

| ID | Sev | Finding | Fix |
|----|-----|---------|-----|
| F1 | major | `tagFilter: "smoke"` (no `@`) parses, selects nothing, Jest exits 0; 2.0.0 refused it | refuse a tag operand without `@` |
| F2 | major | outline rows repeat one snippet; pasting both throws `Duplicate step definition` | de-duplicate by keyword plus snippet |
| F3 | major (docs) | outline placeholders now substituted in docstrings and table cells in every case; Migrating says unchanged. **Corrected 2026-10-09:** first reported as "2.0.0 left them literal", which overstated it. 2.0.0 substituted them except for a regex-bound step whose own text held no placeholder (probed directly; all 36 wild diffs are that class) | keep the substitution (Cucumber standard; Koru's assumption), add a Migrating paragraph and the BREAKING CHANGE line |
| F4 | minor | per-call `tagFilter: undefined` erases the global value | an `undefined` option means "not set" at every layer |
| F5 | minor | a sticky (`/y`) matcher binds with `undefined` captures (shared `lastIndex`) | reset `lastIndex` before matching and capturing |
| F6 | minor | snippet for step text with a line terminator or lone `\r` does not bind or compile | capture and escape them |
| F7 | minor | `[f].forEach(Fusion)` resolves against the cwd and the message names the caller's directory | skip stack frames with no file name |
| F8 | nit | BigInt or circular values crash the template and configuration refusals | describe them with `util.inspect` |

Each fix went RED first on its new test, for the stated reason, then GREEN with the whole suite.

- [x] F2 + F6 `d8d0d07` fix(snippet): entries keyed on verb plus matcher (keyed on the whole
      snippet, a step with a table and the same step without one would still collide);
      `"([\s\S]*)"` only when the quoted text holds a line terminator, so the familiar `"(.*)"`
      stays for ordinary steps. RED 6 of 326. Snippet property on seed 4242 at 500 runs:
      1,033 of 1,033. My first F2 expectation assumed feature order; Fusion lists plain
      scenarios before outline rows (the 2.0.0 name order), so the expectation was corrected,
      not the code.
- [x] F1 `286d180` fix(tag-filter): operands read off the parsed tree; the refusal keeps the
      `Could not parse tag filter` first line, names the operand as written and suggests
      `@name`. Typings and AdditionalConfiguration say so. RED 2 of 6.
- [x] F4 `fea5d17` fix(configuration): `keysThatAreSet` on both layers and inside `errors`
      (the review found the layer case; the `errors: { key: undefined }` case is the same flaw
      one level down and switched a check off). RED 3 of 3. commitlint warned that a body line
      starting `errors:` reads as a trailer; left, since an amend is a rewrite.
- [x] F5 `b946f0f` fix(step-matching): one `execFromStart` for the match and the captures.
      RED via the `afterAll` assertion, exit 1.
- [x] F7 `b180e9d` fix(feature-source): frames with no file name skipped. RED reproduced the
      review's report exactly (resolved against the working directory).
- [x] F8 `a63357d` fix(refusals): `src/value-description.js`, JSON first (the refusal text
      tests already pin `string "x"`), `util.inspect` on a throw or `undefined`. RED 3 of 3;
      a function case added to cover the `undefined` branch. Package is now 15 files.
- [x] F3 `3608250` docs(migrating): paragraph in "What else changes when coming from version
      2?", and a characterisation test. Not added to the 0.8.1 table: only 2.0.0 was measured.
      The L3 regression test (`fc7e360`) already expected substitution, which is what exposed
      the overstatement above.
- [x] Re-verified on the HEAD tarball: whole suite 43 suites, 826 passed, 3 skipped; 6 of 6
      baselines; tsd; ESLint; line coverage 100%. Smoke 10 of 10 on Node 18, 22, 24 with
      Jest 30 and Node 22 with Jest 27. Property fuzz 818 of 818 (seed 31337, which held the
      F1 failure) and 859 of 859 (seed 4711). Differential against 2.0.0: safe seed 909, 150
      cases, 0 diffs; wild seed 707, 36 diffs, all 36 the documented F3 class.
- [x] Independent review of the batch (general-purpose agent, Opus, read-only): no blocker,
      no major; 6 minors and 3 nits, each with a reproduction it ran. Every one acted on:
  - R1 + R2 `c88c894` fix(snippet): pasting all snippets could still be refused as AMBIGUOUS
    (`(\d+)` beside the decimal capture; greedy `"(.*)"` spanning quotes, the second found by a
    new paste-all property at seed 778), and the header counted entries, not steps. Steps are
    grouped by shape with captures widened per position; the quoted capture is `"([^"]*)"`
    (which also covers line terminators, so the F6 special case went); every step is named,
    folded ones on `nor:` lines. AdditionalConfiguration's example regenerated from real output.
    Paste-all property 0 failures in 4,401 and 4,427 (seeds 777 and 31, 1,200 runs).
  - R3 + R4 `24f24d4` fix(tag-filter): operand named by whole token (`@Smoke and smoke`, `İ`),
    parsed text as fallback (escaped space). Comments no longer say 2.0.0 refused every bare
    operand: it refused a lone word, threw ReferenceError on `@smoke and not Slow` and accepted
    `@nope and smoke` (the review's measurement). `286d180`'s message still says "2.0.0 refused
    it"; correcting it needs a rewrite, so the squash message carries the accurate wording.
  - `1337eeb` test(snippet): the repeated-step guard was untested; `starterCodeFor` was briefly
    removed as dead, then restored because the 2026-10-08 refactor kept it on purpose for
    out-of-repo probes; two raw U+2028 characters I had committed in test source made escapes.
  - R5 `4865f9f` fix(feature-source): caller = first frame whose file is an absolute path or a
    `file:` URL (ES modules), so `node:events`, vm and native frames are skipped. The `file:`
    case was written after the fix, so it was not seen RED; the `node:events` case was.
  - R7 + R8 `3ac16cf`: `lastIndex` reset after use too; `describeValue` never throws.
  - R6 `109e393` docs(architecture): module table and graph; rule 4 ("the core requires
    nothing", stated as checked but checked by no test) now reads "only each other and util"
    and IS checked; a planted `require("path")` failed it. **For Gearoid:** the alternative was
    to keep "requires nothing" literally true by copying the helper into two modules.
  - R9 `51192b8` docs(configuration): `null` clears an option for one call (pinned by a test);
    not added to `index.d.ts`, whose types do not accept `null`.
- [x] Final verification on the HEAD tarball (15 files, 30.7 kB): suite 43 suites, 1,093
      passed, 3 skipped; 6 of 6 baselines; tsd; ESLint; lines and functions 100%. Smoke 10 of
      10 on Node 18 and 22 with Jest 30 and Node 22 with Jest 27. Properties 863 of 863
      (seed 2026). Differential against 2.0.0: seed 1010, 150 cases, 0 diffs; wild seed 808,
      35 diffs, all the documented F3 class.
- [x] PR body and squash message rebuilt (Gearoid: "Update the PR body to reflect the
      changes", 2026-10-09): numbers, the second-round fixes, the F3 breaking-change line, docs
      links on the branch, mutation marked as measured before the fixes. The squash message
      passes commitlint with no warning: two lines that a conventional-commits parser read as
      footers were rewrapped (`errors:` inside BREAKING CHANGE, which would have cut the note
      short, and `alert #1`, now `alert 1`). Stored body re-read: all 7 sections survived.
- [x] Decisions (Gearoid, 2026-10-09): **keep** the shared `value-description` helper and the
      reworded, now enforced rule 4 (he first asked whether the core requires gherkin; it does
      not, only the `feature-source` port does); **keep** `"([^"]*)"` in starter code; **push**.
      Pushed `be4df4f..1728797`; the pre-push hook (tests, tsd, baselines) passed.
- [x] 3.0.0-beta1 (Gearoid staged and approved it, 2026-10-09; dist-tag `3.0.0beta1`, latest
      stays 2.0.0): installed from npm into a throwaway worktree of gotreasa-berlin-clock on
      `main` `19c1327`. Jest step of its `npm test` 14 suites, 152 tests green, every group
      identical test by test to 2.0.0; OpenAPI and InSpec checks green; `publish:pact` not run.
      Worktree and branch removed at Gearoid's request.
- [x] `dd41e66` test: three expect-in-a-loop checks became one assertion over the list of
      offenders each (Gearoid asked whether `test.each` fitted; it does not, one setup per
      test). Each was seen failing on a planted item, naming every offender.
- [x] `f9e8684` test(arch): rules 1 and 4 merged into one allowlist (Gearoid: "it doesn't
      really make sense, since Jest and @cucumber packages are needed"). An adversarial
      review (general-purpose agent, Opus, read-only) found the rules do not keep those
      packages out, only fix where they are required; the swappable-parser rationale false
      (pinned parser, core coupled to Cucumber's shapes); rule 1 blind to path or url outside
      the core; and table drift (`index.js` requires `util`, undocumented). Decision (Gearoid,
      option A): every src module requires exactly its Requires row in Architecture.md. RED
      first on `src/index.js requires util, unlisted`; planted `require ("path")`, computed
      `require(name)` and `require("url")` in index all caught (the old rules caught one).
      Rule 2 kept with its honest reason, registration order.
- [x] `e881ab7` test(arch): rule 2's false alarms fixed (Gearoid: "Fix Rule 2's false
      alarms"). Reproduced first: the text search flagged a core `const it` and a key `test:`
      (`src/keywords.js names it, test`) and missed `globalThis.describe`. ESLint now enforces
      it in `src/` outside test-registration (`no-restricted-globals`, plus
      `no-restricted-properties` on `globalThis`/`global`), scope-aware. The arch test pins
      the config by linting must-refuse and must-allow probes and the real tree; RED was the
      three `globalThis`/`global` probes. Replayed plants: no alarm on the local and key, the
      leak refused by lint and the test. Two Jest snags on the way: ESLint's config loader
      uses a dynamic `import()` (the test requires the config and passes it), and Jest
      injects a `jest` binding that collided with the config's `const jest` (renamed
      `jestPlugin`).
- [x] PR #16 body updated for the merged dependency rule, and `dd41e66`, `f9e8684`, `e881ab7`
      and the plan entries pushed (`b7340b2..8a1f069`, Gearoid's go, 2026-10-09). The prettier
      job then failed twice on a Docker Hub 429 before Prettier ran; the tracked files passed
      locally, which led to the Prettier 3 work below.

## Prettier 3, master merge and the ESM move (Gearoid, 2026-10-09 evening)

- [x] Dependabot version updates were off (the repo is a fork; GitHub leaves them off on forks
      until enabled). Gearoid enabled them; PRs #17 to #22 followed.
- [x] #19 (`prettier_action` 3.3 to 4.6) failed: v4 installs Prettier `latest` (3.9.9), which
      refused the 0-byte `.prettierrc.json` (empty since 2021, `82d6b9c`). Fixed by #23
      (`ci/prettier-3`, Gearoid's option C: Prettier 3, config `{}`, 16-file reformat), which
      also replaced #21. Merged 2026-10-09; Dependabot closed #19 and #21.
- [x] `0212dce` merged `origin/master` into this branch: master's side of the 6 conflicting
      source and test files was #23's reformat alone (all 51 changed lines differ only by a
      trailing comma, checked), so this branch's side was kept and Prettier 3 reapplied (45
      files). The lockfile kept this branch's tree with jest 30.5.2, semantic-release 25.0.9
      and handlebars 4.7.10 (security, #24) carried over. commitlint refused a custom merge
      subject; recommitted with git's standard one.
- [x] **ESM move (Gearoid: "callsites needs to be updated to 4.2.0").** callsites 4 is
      ESM-only and broke Fusion under Jest (`Must use import to load ES Module`, 0 tests,
      measured; #22's integration failed the same way). Decisions (Gearoid): make Fusion ESM,
      inside this PR as part of 3.0.0, spike first, and take the latest @cucumber majors too.
- [x] Spike (throwaway worktree `spike/esm`, not pushed): the source converts mechanically;
      gherkin 42.0.1, messages 34.2.1, tag-expressions 11.0.1 and callsites 4.2.0 work with
      Fusion's code unchanged; messages 34 has no dependencies, so no `uuid` returns. Consumers
      with packed builds: ESM-only breaks every CommonJS consumer (plain jest, Babel on
      node_modules, and Berlin Clock: 0 of 5 BDD suites); ES module steps under Jest's ESM
      mode work (smoke 10/10, with an ExperimentalWarning). A dual build (ESM source plus an
      esbuild-bundled `dist/index.cjs`) passes all of them, Berlin Clock identical to 2.0.0.
      Dual costs measured: package 30.7 kB to 65 kB; the dual-package hazard is real (setup
      `require`, steps `import`: the global config was lost and the file failed); an `exports`
      map blocks `require("…/package.json")` unless listed.
- [x] **Decision (Gearoid): dual ESM + CJS.** Delivered in `2b53ea8` (code and tests) and the
      docs commit after it:
  - [x] Package: `"type": "module"`; gherkin 42.0.1, messages 34.2.1, tag-expressions 11.0.1,
        callsites 4.2.0 pinned exactly; `exports` (import to `src/`, require to
        `dist/index.cjs` with `dist/index.d.cts` typings, `./package.json`); `main` to the
        bundle; `files` with `dist/`. `scripts/build-cjs.js` (esbuild 0.28.2, devDependency)
        runs on `prepack` and `pretest`, maps `import.meta.url` to the bundle's file, and
        writes `dist/THIRD_PARTY_LICENSES.txt` from the files esbuild bundled. Its log goes to
        stderr: on stdout it corrupted `npm pack --json` (caught by the packaged baseline).
  - [x] `src/` to ES modules; global configuration on `globalThis` under
        `Symbol.for("@g_package/jest-cucumber-fusion/global-options")`. RED first: the
        packaged baseline's new mixed consumer (setup `require`, steps `import`) failed with
        the unbound-step refusal, then passed.
  - [x] `eslint.config.cjs`, `commitlint.config.cjs`; ESLint `sourceType: "module"` for `.js`.
  - [x] Fusion's suite under Jest's ESM mode (`npm test` runs
        `node --experimental-vm-modules`). A probe first: `resetModules` plus `import()` gives
        a fresh module and `unstable_mockModule` doubles packages and relative modules;
        `isolateModulesAsync` was avoided (an earlier mock leaked into it). Seven doubling
        files converted by hand; m4 needs its order (double callsites, import the real
        feature-source, double it, import Fusion). The architecture check now reads imports
        (it failed first, reading none, rather than passing vacuously). Child Jest runs in
        the baselines and v5 get `NODE_OPTIONS`. Contract tests restated: the libraries are
        imported; CommonJS reach is the bundle's job.
  - [x] Packaged-consumer baseline: CommonJS, ES module and mixed consumers on the tarball.
  - [x] Docs: Architecture (dual package, pins, imports), Migrating, README, RunningTheExamples.
  - [x] Re-verified on the packed build: suite 43 suites, 1,092 passed, 3 skipped, lines and
        functions 100%; 6 of 6 baselines; tsd; ESLint; secrets. Smoke 10 of 10 (CommonJS) on
        Node 18, 20, 22, 24 with Jest 30 and Node 22 with Jest 29 and 27; the three consumer
        styles and the mixed hazard all pass. Berlin Clock (copy) identical to 2.0.0 in all
        four groups, combined jest 118 of 118. Fuzz: properties 885 of 885, differential 150
        cases 0 diffs, wild 36 diffs all the documented outline class. Package 68.5 kB packed.
  - [x] Worktrees `prettier-3` and `spike-esm` removed with their branches (Gearoid, 2026-10-09;
        neither had a commit of its own, and `ci/prettier-3` was already gone from GitHub).
  - [x] Pushed `8a1f069..aeb829b` (Gearoid's go); the pre-push hook passed, and CI is green:
        integration, prettier (v4.6, no Docker), codecov patch and project.
  - [x] PR body rebuilt for the dual package. A breaking change found while writing it: the
        `exports` map blocks deep imports. `require(".../src/index.js")` worked on 2.0.0 and
        now fails with `ERR_PACKAGE_PATH_NOT_EXPORTED` (measured on both); it is in Breaking
        changes and the squash message, which commitlint passes with no warning. Two counts
        corrected on the way: the differential fuzz is 940 cases over 7 seeds.

## 3.0.0-beta2 (Gearoid, 2026-10-09 and 10)

- [x] Staged with `npm stage publish . --tag beta --access public` from a working-tree-only
      version `3.0.0-beta2` (reverted afterwards; nothing committed). Stage
      `9f602b2c-115b-4696-8291-ca2146a15b47`, 18 files, 68.7 kB, shasum
      `baf83599bd7e15b1f6f9c48c8c89a1126e3674c8`, identical to an independent `npm pack` of
      `aeb829b` (the build is deterministic). Gearoid approved it with 2FA; dist-tag `beta`
      points at it, `latest` stays 2.0.0.
- [x] Berlin Clock: installed `@beta` from npm into a throwaway worktree of `main` `19c1327`
      (the commit of the beta1 run, so its 2.0.0 baseline holds). It resolves to
      `dist/index.cjs` with no config change. BDD 50, unit 85, pact consumer 16 and provider
      1, every group identical test by test to 2.0.0; the Jest step of `npm test` 14 suites,
      152 tests; OpenAPI and InSpec (29) pass; clean `npm ci` passes. `publish:pact` not
      run. Worktree and branch removed at Gearoid's request.

## Review round 4: the whole PR after the ESM move (Gearoid, 2026-10-10)

Asked: "an adversarial review, a smoke test and a fuzz test of all of PR 16", then "Let's
address F1 to F6". Review: general-purpose agent (Opus), read-only. Smoke: fresh `git archive`
CI sequence; CommonJS smoke on 6 Node/Jest combinations; ESM, Babel and mixed consumers;
TypeScript under node16 CJS, node16 ESM and node10. Fuzz: own properties 10,872/10,872;
tag-filter and template properties 890/890; differential 200 cases 0 diffs, wild 36 all
documented; new ESM-source against CJS-bundle differential, 300 cases, 0 diffs (each side's
resolution confirmed). F1 to F3 reproduced by Koru independently.

| ID | Sev | Finding | Fix |
|----|-----|---------|-----|
| F1 | major | step and hook registry is per copy: a `require`d shared CommonJS step library is invisible to an ESM step file (`No step definition matches`, hooks lost) | registry on the shared `globalThis` store with the options |
| F2 | major (docs) | `import` fails on Node 18.19 and 20.9 (gherkin 42 import attributes); Migrating and the squash message claim Node 18 to 24; no `engines` | `engines >=18.14`; docs and squash say ESM needs Node 20.11+ |
| F3 | minor | CommonJS exports are getter-only (esbuild): `jest.spyOn` fails with `Cannot redefine property`; 2.0.0 passed | bundle footer replaces them with plain writable values |
| F6 | minor | husky `prepare` prints `.git can't be found` on stdout outside a git checkout, corrupting `npm pack --json` | run husky only inside a git checkout |
| F4 | nit | stale comments (`configuration.js:9`, `feature-source.js:25`) | reword |
| F5 | nit | architecture scanner misses `process.getBuiltinModule("x")` | read it as a dependency |

Each fix failed first on its test, then passed:

- [x] F1 `925d4ed`: `src/shared-state.js` holds the registry and the global options on
      `globalThis` under `Symbol.for("@g_package/jest-cucumber-fusion@3")` (the major in the
      key), created only when absent. RED: a fourth packaged consumer, a shared CommonJS step
      library with a `Before` hook used by an ES module step file (`No step definition
      matches`). `m2` now also clears the store, since `resetModules` no longer empties it.
- [x] F3 `52d8974`: a bundle footer copies the exports into a plain object. RED:
      `test/specs/packaging/commonjs-exports.steps.js` (getters, `Cannot redefine property`).
- [x] F2 `ee66ab8`: `engines` mirrors Jest 30 (`^18.14.0 || ^20.0.0 || ^22.0.0 || >=24.0.0`),
      pinned by a test; Migrating, README and RunningTheExamples state the ES module floor
      (Node 20.11) and the contributor floor. Measured again: `import` fails on 18.19 and
      20.9, works on 20.11 and 22; `require` works on all four.
- [x] F6 `a0be5d5`: `scripts/prepare-hooks.js` calls husky's function and writes its message
      to stderr. RED: `npm run prepare` outside a git checkout printed `.git can't be found`
      on stdout; hooks still install in a checkout.
- [x] F4 + F5 `82a7a06`: comments refreshed; the scanner reads `getBuiltinModule("x")` and
      flags a computed one (a planted literal passed all 5 checks before, both forms are
      caught after).
- [x] Found while re-verifying, `29faf4d`: the F3 test loads `dist/index.cjs` through Jest's
      loader, so the bundle was counted and line coverage fell to 15%. Coverage now measures
      `src/**/*.js` only; back to 100% of lines.
- [x] Re-verified: fresh `git archive` with NO `.git`: `npm ci`, lint, 45 suites with 1,096
      passed and 3 skipped, tsd, 6 of 6 baselines (the packaged consumer now runs CommonJS, ES
      module, mixed and shared-library consumers), secrets, Prettier. The reviewer's F1 and F3
      repros pass on the packed tarball (19 files, 69.5 kB). CommonJS smoke 10 of 10 on 6
      Node/Jest combinations; ES module, Babel and mixed consumers; TypeScript node16 CJS,
      node16 ESM and node10. Fuzz: ESM against CJS 150 wild cases 0 diffs; against 2.0.0 150
      cases 0 diffs; properties 599 of 599.
- [x] Pushed `aeb829b..c896e80` (Gearoid's go, 2026-10-10); CI green (integration,
      Prettier). PR body rebuilt: a third-review-round section, shared registry, the ES module
      floor (Node 20.11) in gaps, breaking changes and the squash message, `engines`, new
      evidence counts; the body round-trips and every squash line is within 72.

## 3.0.0-beta3 (Gearoid, 2026-10-10)

- [x] beta1 and beta2 are no longer listed on npm (`time` still shows both), and npm never
      reuses a version, so beta3. Staged as for beta2 from `c896e80`: stage
      `b5c4fa71-13ce-47e1-a173-d8314ec6aa3b`, 19 files, 69.5 kB, shasum
      `8d17b23b1ae00d1602ba2fb7bc94eef6fb764105`; version reverted with `npm version`, nothing
      committed. Gearoid approved it with 2FA; `beta` points at it, `latest` stays 2.0.0.
- [x] Berlin Clock: `3.0.0-beta3` installed from npm into a throwaway worktree of `main`
      `19c1327` (Node 24.21, Jest 30.5.2), resolving to `dist/index.cjs`; no `jest-cucumber`,
      and the only `uuid` is 14.0.2 under its own `jest-junit`. BDD 50, unit 85, pact consumer
      16 and provider 1, every group identical test by test to 2.0.0; the Jest step of
      `npm test` 14 suites, 152 tests, exit 0; OpenAPI and InSpec (29) pass. The unit group
      alone misses the 100% line threshold (99.38%) exactly as 2.0.0 does; the provider
      needed the main checkout's gitignored `.env` copied in. `publish:pact` not run.
- [x] Removed the Berlin Clock worktree `.claude/worktrees/fusion-3-beta` and its branch
      `chore/jest-cucumber-fusion-3.0.0-beta3` (0 commits past `19c1327`) at Gearoid's
      request.

## ES module usage in the docs (Gearoid, 2026-10-10)

Asked: "do they describe how to use the CJS versus ESM versions of the package?", then "fix
them on PR #16". README and Migrating explained the split, but:

- [x] Gap 1 (defect), reproduced on the packed tarball: the README's ES module example named
      its file `rocket-launching.steps.mjs` beside its own `testMatch` `**/*.steps.js`, so
      following it gave `No tests found, exiting with code 1`.
- [x] Fixed: a README "Using ES modules" section (Node 20.11; the flag in a `test` script in
      Jest's documented form, not shell `NODE_OPTIONS=`; `"type": "module"` or `.mjs` with its
      `testMatch`; extensions on relative imports; `jest` from `@jest/globals`; an ES module
      `setupFiles` script; TypeScript). ES module forms of both ReusingStepDefinitions
      examples and of the AdditionalConfiguration setup file; Migrating links to the section.
- [x] Guard: `assert-packaged-consumer.js` runs a second consumer set up exactly as the README
      says, through its `npm test` script with `NODE_OPTIONS` removed, and requires 1 passed
      and 1 skipped (`@wip`, filtered by the ES module setup file). Two planted faults (the old
      `.mjs`/`testMatch` mismatch; a script without the flag) each fail it. The snippets it
      does not run (`.mjs` option, side-effect shared import, importing a `.cjs` shared file)
      were run by hand on the tarball: 3 of 3 suites pass.
- [x] Suite 45 suites, 1,096 passed, 3 skipped, 100% lines; 6 of 6 baselines; lint, Prettier.

## A new CommonJS user's walk through the docs, and ESLint (Gearoid, 2026-10-10)

Asked: fix the "Add a your" typo, walk the docs as a new user with a CommonJS project, and
document ESLint with `expect` inside `Then`/`And` (as this repo's `eslint.config.cjs` does).
Walked the README literally in a fresh `npm init` project on the packed tarball:

- [x] W1: the README never said how to run the tests (`npm init`'s `npm test` exits 1;
      `npx jest` worked only because Jest is a dependency). Now: install `jest` too, a
      `"test": "jest"` script, and a "Run the tests" step.
- [x] W2: the steps required `'../../src/rocket'` with no layout and no `Rocket`, so a literal
      follower got `Cannot find module '../../src/rocket'`. Now: a layout tree, a
      `src/rocket.js`, every `//filename:` names its path, and the `Fusion` path is stated as
      relative to the steps file.
- [x] W3: the finished steps file imported `But` unused (`no-unused-vars` under ESLint's
      recommended rules). Removed from the README examples, with a note that `But` exists.
- [x] Typo: "Add a your Cucumber Step definition file" is "Add a Cucumber step definition
      file".
- [x] ESLint: a "Linting with ESLint" section. Measured on the README's own text (each
      `filename:` block extracted into a fresh project): eslint-plugin-jest's
      `flat/recommended` alone reports 3 `Expect must be inside of a test block` on the steps
      file (6 with `Before`/`After` hooks); `additionalTestBlockFunctions` with the five step
      keywords and the two hooks clears them; a real standalone `expect` is still reported;
      `npm test` 1 passed, `npx eslint .` exit 0. For `"type": "module"`: `eslint.config.js`
      fails (`require is not defined`), `eslint.config.cjs` loads, and ES module steps need
      `sourceType: 'module'` (parsing error otherwise). The note says both.
- [x] The rest of the CommonJS flow worked as written: coverage (100% of `rocket.js`) and the
      `setupFiles` global (its `@smoke` filter skips the untagged scenario).

## ESLint as its own CI check (Gearoid, 2026-10-10, option B)

Gearoid: "ESLint needs to be added to the CI since prettier is already there". It already ran
as the Linting step of the required `integration` job; he chose B, its own required check.

- [x] Master has no ESLint (no `lint` script, no config: it arrives with this PR), so the job
      is on PR #16, not a separate PR (a branch off master was tried and removed unused).
- [x] `lint` job in `integration.yml` (checkout, Node 24, `npm ci`, `npm run lint`); the
      Linting step leaves `integration`, which now `needs: lint` so semantic-release never
      releases code that fails it. The auto-merge comment names the three checks.
- [ ] Add `lint` to master's required status checks (ruleset; today `prettier` and
      `integration`). AFTER #16 merges: required earlier, every PR off master (Dependabot's)
      waits for a check master cannot run yet.

## ES modules as the recommended path (Gearoid, 2026-10-10)

Asked: walk the docs as a new user with an ES module project; "I want ESM modules to be the
recommended path but that people can fall back to CJS". Counterargument put first (ES module
steps need Jest's experimental mode, Node 20.11 and an imported `jest`); proceeded, docs only.

- [x] Walk of the CJS-first README as an ES module user, on the tarball: every file needed
      translating from a section at the end (E1); `src/rocket.js` used `module.exports`, so
      the steps failed `does not provide an export named 'Rocket'` (E2); the ESLint config
      failed `require is not defined` (E3); every other guide used `require` (E4).
- [x] README: Getting Started is ES modules (Node 20.11, `"type": "module"` or `.mjs`, the
      flag in the `test` script, `export class Rocket`, imports with `.js`, `jest` from
      `@jest/globals`, the `setupFiles` key shown, an ES module `eslint.config.js`). A new
      "Using CommonJS instead" section gives every CommonJS file in full (package.json,
      `src/rocket.js`, steps, setup script, ESLint), when to choose it, and mixing styles.
- [x] Guides: ReusingStepDefinitions ES module first with a "Written as CommonJS" section;
      AdditionalConfiguration, GherkinTables, StepDefinitionArguments, ScenarioOutlines and
      Language converted to `import` with a note pointing at the CommonJS section (Language's
      renamed keywords become `Given as Gegeven`). The version 2 migration snippets stay
      CommonJS. Migrating links to Getting Started.
- [x] Verified from the README's own text in fresh projects: ES module path `npm test` 1
      passed, its `setupFiles` 1 skipped (the `@smoke` filter), `npx eslint .` exit 0, 3
      `no-standalone-expect` reports without the option, a real standalone `expect` still
      caught; the CommonJS fallback the same (1 passed, 1 skipped, exit 0). Suite 45 suites
      1,096 passed; 6 of 6 baselines; lint; Prettier.
- [x] Guides run as ES modules by a general-purpose subagent (pages copied byte for byte into
      fresh `"type": "module"` projects on the tarball, no Babel): GherkinTables,
      StepDefinitionArguments, ScenarioOutlines (3), both Language examples (renamed keywords
      included, after completing their `...`), the AdditionalConfiguration setup file as an ES
      module and as `.cjs`; all exit 0. Its findings, re-checked against source: Language's
      claim that ES module renaming needs Babel was false (fixed); the CommonJS setup file
      needs `.cjs` in a `"type": "module"` project (said); the version 2 snippet is now
      labelled CommonJS. Rejected: a feature file named `rocket-launching.feature` with title
      "Tagged scenarios" is legal. Left, pre-existing: the `...` fragments in Language,
      trailing spaces and an unused `TodoList` in GherkinTables, a `##` page title.

## Blockers

None. PR #16 is open with CI green and its body current. Next is Gearoid's: take it out of
draft and squash-merge with the PR body's message, which releases 3.0.0 through
semantic-release; Dependabot should then close #22 (callsites 4.2.0) on its own.
