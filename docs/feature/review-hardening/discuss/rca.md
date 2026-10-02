# RCA — review-hardening

**Source:** nWave repository review (3 reviewer agents: crafter / troubleshooter / acceptance-designer), adjudicated against source 2026-07-09.
**Target:** `src/index.js` (404 lines) + `src/index.d.ts` + test suite under `test/specs/features/`.
**Discipline:** every reviewer finding is a hypothesis; each below was re-verified against source (`path:line`) or by executed reproduction. False positives are recorded with the disproving evidence.

## Rejected (false positives)

| Claim | Verdict / evidence |
|---|---|
| Unmatched step → silent false PASS (rated CRITICAL ×2) | **Rejected for default config.** jest-cucumber validates step *count* and throws (`node_modules/jest-cucumber/dist/src/validation/step-definition-validation.js:38-52`); the wrapper registers steps 1:1, so a miss throws loudly. Real **only** with `errors:false` (see M5). |
| String-pattern step defs broken (line 23 uncovered) — BLOCKER | **Rejected.** String patterns used throughout `test/.../basic-scenarios.steps.js:7,11,15,24,41` and pass. Line 23's uncovered branch is the *neither-regex-nor-string* path. |
| Module state leaks across test FILES (CRITICAL, file1→file2 repro) | **Rejected as stated.** Jest gives each test file a fresh module registry — no cross-file leak. The real, narrower issue is within one file (M3). |
| ReDoS via user regex | **Dismissed.** Regexes are the test author's own step definitions (trusted), not untrusted input. |

## Confirmed — production code (`src/index.js`)

- **H1 (HIGH) — regex first-match shadowing.** `findMatchingStep` (`src/index.js:171`) uses `.find()` → first insertion-order match wins. A broad regex registered before a specific one runs the wrong handler with wrong captured args, and the test still passes (jest-cucumber's re-validation is satisfied). Insertion-order-dependent. jest-cucumber's automatic binding raises an ambiguity error here; this wrapper suppresses it. *Only silent-wrong-result bug in the set.*
- **H2 (HIGH, DX) — `.d.ts` return-type drift.** `src/index.d.ts:13-17` types `Given/When/Then/And/But` as `void`, but they return the chain object, and the library's own test relies on it: `test/.../reuse-definition.steps.js:16-20` does `Then(And(…))`. TS consumers of that pattern get a compile error.
- **M1 (MED) — Before/After single-slot clobber.** `src/index.js:7-8,75-80` assign (not append); a second `Before` overwrites the first, and the slot leaks across features within one file.
- **M2 (MED) — duplicate matcher-source overwrite.** `src/index.js:16-28` keys by regex `.source`/string; re-registering the same key clobbers silently.
- **M3 (MED) — module singleton never reset.** `src/index.js:1-9`. Safe across files (jest isolation); within one file, multiple `Fusion()`/features accumulate defs and clobber hooks. Latent under the current one-Fusion-per-file layout.
- **M4 (MED) — brittle `callsites()[1]`.** `src/index.js:85` assumes `Fusion` is exactly one frame from the step file; any re-export/wrapper retargets the feature path (reproduced), and a shallow stack makes `[1]` undefined → `.getFileName()` throws (the `|| ""` guards the wrong thing).
- **M5 (MED) — `errors:false` re-opens silent-skip.** `Fusion` forwards options (`src/index.js:82-93`); with `errors:false`, an unmatched step is silently dropped and remaining args index-shift.

## Confirmed — tests

- **T1 (MED) — no negative/sad-path tests.** Nothing asserts a failure (undefined step, ambiguous match, hook error, missing feature file). This gap is *why* H1/M1/M4 went unnoticed. Uncovered lines 159-180 = no-match path; 86-96 = `Fusion`/load path.
- **T2 (LOW) — weak/tautological assertions.** `basic-scenarios.steps.js:42` `expect("people").not.toBe("haters")`; `reuse-definition.steps.js:18` `toBeDefined()` only.
- **T3 (LOW) — Given asserts instead of sets up** (`scenario-outline2.steps.js:13-15`); defensive early-returns that can silently skip (`:33-35`).

## Confirmed — hygiene / low

- **L1** — dead commented `FusionAll`/`walkthroughDirectory` block (`src/index.js:~364-387`).
- **L2** — outline edge cases: literal capturing group at fixed position fails loudly (`evaluateStepFuncEndVsScenarioEnd:~312-325`, pathological); greedy `/<.*>/` disables the wrapper's own capture injection (benign today); digit-class typo `0` vs `0-9` in the outline detector regex (`~243/250`, no observed impact).

## Environment finding (not a code bug)

- **E1** — local `node_modules` stale: `jest-cucumber@3.0.2` installed vs `4.5.0` declared/locked. Local `npm test` exercised the wrong version; CI (`npm ci`) uses 4.5.0. Resync (`npm install`) and re-verify version-sensitive items (M5, the silent-skip mechanism) against 4.5.0.
