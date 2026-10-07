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
- [ ] Commit plan and diagrams (before `des po`: the tree is frozen from `des po` to `des integrate`).
- [ ] `des po` (Request + values via `nw-product-owner`).
- [ ] `des design --shared`, then per value: design, oracle, craft.
- [ ] `des verify`, reviewer, examiner (with captured observations), `des integrate`.
- [ ] Signed amend of the integrate commit to `feat!:` with BREAKING CHANGE (needs Gearoid's go).
- [ ] Docs: README and `docs/AdditionalConfiguration.md` updated for the new config path.
- [ ] PR, then release 3.0.0 via semantic-release on merge.

## Blockers

None.
