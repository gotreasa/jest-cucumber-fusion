# Plan: act on the documentation reviews of 2026-10-11

Living plan. Updated as the work moves; correct anything here that proves wrong.

## Goal

Act on two reviews of the documentation on PR #38 (branch `docs/landing-page`), run on
2026-10-11: an adversarial review that ran every example against the packed package, and a
gSmith pedagogy review (`gsmith-pedagogy-reviewer`, verdict NEEDS_REVISION). Gearoid chose
"everything, including the restructure", and the type fix as its own `fix:` PR.

- Branch: `docs/landing-page`, reviewed as PR #38 (merged), delivered as PR #40. No Jira for
  this repository.
- Type fix: PR #39 (`fix/tagfilter-null-type`), separate, merged; releases 3.0.4.

## Verdicts on the review findings

Every finding below was checked against the source or the text before being accepted.

| Group | Findings | Verdict |
|---|---|---|
| A. Wrong or overclaiming | `Migrating.md:94` "none should need a change" (Rule tags and a spaces-only filter change which tests run); `:90` "complete the list" before another list; "every example runs" (the baseline runs 6 pages, ES module blocks with a filename only); hooks "receive no arguments" (a declared parameter is Jest's `done`, `test-registration.js:132`); the TypeScript `jest.config.js` beside the Getting Started `jest` key (Jest refuses both); README `.mjs` advice incomplete; `Fusion` "once" | all confirmed |
| B. Missing facts | Cucumber Expressions unsupported; `*` keyword refused; hooks must be registered before `Fusion`; header-only table gives `[]`; plain scenarios register before outline rows; a file with no `Feature:` gives Jest's "must contain at least one test"; the gates beyond `npm test` | all confirmed |
| C. Teaching gaps | Gherkin primer; hooks note; regex and tags used before introduced; real `npm test` output; "If you know Cucumber"; start from nothing | accepted |
| D. Restructure | README 572 lines: CommonJS, TypeScript and ESLint to their own pages; coverage and global configuration to short pointers; duplicated listings cut | accepted |
| E. Nits | ESLint 10 Node range; 80 dialects; Dutch `Stel`; "CMD line"; Architecture "module-level registry" and "Jest 30"; `docs/feature/README.md` "kept as written"; RunningTheExamples `$` prompts; Migrating "the same" row and docs-changelog sentence | accepted |
| F. Types | `tagFilter?: string` refused `null`; stale "module registry" JSDoc | PR #39 |

Not taken, with the reason:

- Renaming the example domain away from real people (a nitpick): the examples are inherited, and
  the reviewers judged them engaging; changing every page's data is churn without a fault.
- Moving Architecture's 2026-10-09 spike narrative into the delivery records: it is the reason
  the package is a dual ES module and CommonJS package, which is what an architecture page is for.
- A wider rewrite of the guide pages' prose style beyond the listed tells.

Found while doing the work: the `.trim()` on docstrings was a no-op (Gherkin already strips the
delimiters and indentation; a step receives `"ignition"`, measured), so it was removed rather
than explained.

## Constraints found before starting

- `test/specs/baseline/assert-doc-examples.js` runs only the named, ES module blocks of six
  pages (`PAGES`), in a project laid out as the README's Getting Started. A section headed
  "Written as CommonJS" is cut off. Its filename pattern accepts the README's `###filename:`.
- Guide pages link into the README by anchor: `#getting-started` (10), `#using-commonjs-instead`
  (7), `#typed-step-definitions` (1). Every one must be repointed after the move.
- `assert-packaged-consumer.js` names README sections ("Using TypeScript", "Getting Started")
  in comments and failure messages; keep them in step.

## Steps

- [x] A: accuracy fixes
- [x] B: missing facts
- [x] E: nits
- [x] D: new pages `docs/CommonJS.md`, `docs/TypeScript.md`, `docs/ESLint.md`; README cut from
      572 to about 220 lines, the ES module path only; anchors repointed; consumer-baseline
      wording updated
- [x] C: teaching material in the new README (Gherkin primer, start from nothing, one complete
      steps file, real `npm test` output captured from a run, Hooks, "If you know Cucumber",
      "Where next")
- [x] README added to the doc-example baseline (7 of 7 pages pass), and the "runs as written"
      claim in `docs/README.md` now names exactly what the baseline runs
- [x] The new pages' examples, which the baseline does not run (CommonJS, TypeScript ES module
      and CommonJS, both ESLint configs, the coverage advice), run by hand in fresh projects
      from the packed branch: all pass
- [x] Every relative link and anchor resolves: 82 checked by script, which caught a planted
      broken anchor; suite, baselines, lint, Prettier
- [x] Commit and push. #38 had been squash-merged while this work ran, so it went up as a new
      PR, #40, after merging `master` (its three conflicting files were unchanged on `master`
      since this branch's own earlier commit)
