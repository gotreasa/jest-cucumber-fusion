# Type-test hardening (follow-up to PR #60)

**Source:** the adversarial review of PR #60 (https://github.com/gotreasa/jest-cucumber-fusion/pull/60),
run 2026-11-16. Each item below was reproduced or confirmed from source before work began.
**Branch:** `test/60-type-test-hardening`, from `main` at d7a1208. **PR:** not opened yet.
**Route:** working directly, test first, with an independent review of the finished diff.
No Jira for this repository.

## Items

| # | Finding | Planned fix | Status |
|---|---|---|---|
| 1 | `prepack` runs the build, and the build reads `test-d/index.test-d.ts`, so the release depends on a test file | Move the twin write out of `scripts/build-cjs.js` into its own script, run by `pretest-d` only | done |
| 2 | Nothing checks which declaration file the twin resolves: `exports.require.types` pointed at `src/index.d.ts` passes 32 of 32 (58 of 58 after this branch's additions) | A Jest packaging test that asks TypeScript to resolve the package from a `.cts` and a `.ts` file and checks each answer | done |
| 3 | `npx tstyche` with no twin passes one file and exits 0 | `index.test-d.ts` opens with a reference directive naming its twin: a missing twin is ts(6053), exit 1. The generator drops the line from the twin (ts(1006)). A stale twin still runs old assertions through `npx tstyche`; the docs now name `npm run test-d` as the supported command | done, stale case documented not prevented |
| 4 | Every `StepChain` assertion compares against the imported `StepChain`, so a rewrite of that type passes | Spell the shape out literally in at least one assertion | done |
| 5 | No assertions on `Before`/`After`, `errors`, `scenarioNameTemplate` | Add them, then check each mutant is killed | done |
| 6a | The twin write sits before the licence notices | Resolved by item 1 | done |
| 6b | `toRaiseError()` accepts any error | Pin each to its diagnostic | done |
| 6c | `.gitignore:79` is one level; tstyche matches all levels | Widen to `test-d/**/*.test-d.cts` | done |
| 6d | "cannot drift" / "never stale" hold only through `npm run test-d` | State the supported command in the docs; fix `docs/RunningTheExamples.md:35`, which still says ES module only | done |

## Log

- 2026-11-16: plan written. tstyche 7.2.5 has no plugin or pre-run hook, so it cannot generate the
  twin itself (`node_modules/tstyche/dist/api.d.ts`, `ConfigFileOptions`).
- 2026-11-16: all items done. Red first: the build test failed with ENOENT on a checkout copy
  without `test-d/`; the resolution test failed under the reviewer's M14 (`require.types` pointed
  at `src/index.d.ts`). Mutants re-run on `dist/index.d.cts` only, all killed: M7 (StepChain field
  renamed), M9 (Before/After deleted), M10 (scenarioNameTemplate `any`), M11 (errors `string`), M1
  (step verbs `void`), V1 (template vars lose `featureTags`). Pinning: removing `tagFilter` makes
  `{ tagFilter: 42 }` raise ts(2353), which the pinned `toRaiseError(2322)` now rejects.
- Checks: `npm test` 52 suites, 1147 passed, 3 skipped; `npm run test-d` 58 of 58; lint,
  typecheck, `test:baseline` 7 of 7 pass. `prettier --check .` flags only `.nwave/config.json`,
  an untracked local nWave file, as on `main`.
- 2026-11-16: independent review of bb94021 (nw-software-crafter-reviewer). Outcomes:
  - BLOCKING, confirmed and fixed: `npm test` failed on a fresh checkout, which CI and pre-push
    run before `test-d`, because the twin test read the gitignored twin that only `pretest-d`
    writes. Reproduced with the twin deleted (ENOENT). The twin tests now run the generator in a
    temporary copy, and a second test checks a source without the reference is refused with no
    twin written. Fresh state, CI order: `npm test` 52 suites, 1148 passed, 3 skipped; `test-d`
    58 of 58. A generator that keeps the reference now fails `npm test` alone.
  - False claim, confirmed: "44 type assertions" (bb94021 message, item 2 above) was the count on
    PR #61's branch. On this branch's parent it is 32; the table is corrected here. The commit
    message still says 44.
  - Rejected: "`.nwave/config.json` does not exist". It exists on disk, untracked, and prettier
    flags it.
  - Fixed: the build test's `node_modules` link is now a `"junction"`, which needs no privilege
    on Windows. CI runs on ubuntu-latest only, so this matters for local Windows runs.
  - Not acted on: ten further `dist` mutants the reviewer listed but did not run. Two it expected
    to survive (`Fusion(feature: string | RegExp)`, optional `setFusionConfiguration` options) are
    widenings no current assertion targets.
- Next: PR.
