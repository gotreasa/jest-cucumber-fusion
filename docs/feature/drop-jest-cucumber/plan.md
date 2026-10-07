# Plan: drop jest-cucumber (build on jest + @cucumber/gherkin)

Living plan. Updated as the work moves; correct anything here that proves wrong.

## Goal

Remove the runtime dependency on `jest-cucumber` and build `Fusion()` directly on `jest` and
`@cucumber/gherkin`. This clears Dependabot alert #1 (`uuid` GHSA-w5hq-g745-h8pq, the only
runtime-scope alert, reachable only through jest-cucumber 4.5.0 and `@cucumber/gherkin@28`) and should
close L5 (empty docstring inside an outline, `docs/feature/review-hardening/plan.md:67`).

- Branch: `worktree-drop-jest-cucumber`, from `master` at `40aa6a5` (2.0.0).
- Issue / tracker: none yet. PR: none yet.
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

## Blockers

None. Waiting on Gearoid's go to push and open the PR.
