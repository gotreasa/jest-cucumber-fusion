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

## Follow-on: concrete examples (PR stacked on #40)

Asked by Gearoid on 2026-10-11 ("follow the guidance from jest-cucumber's own CONTRIBUTING.md").
That guidance asks for examples that are concrete and easily understood, without humour or
cuteness, built on widely understood workflows such as a shopping basket, logging in or a bank
deposit. The real people in the examples (Elon Musk, Neil deGrasse Tyson, Rick Astley) came from
jest-cucumber's own examples, through the b-yond repository (`4c8ddfa`, 2019-12-23).

Scope, chosen by Gearoid: the user-facing pages only. The test fixtures keep their wording,
because `test/specs/baseline/test-names-2.0.0.txt` is a recorded run of 2.0.0 that proves 3.x
names their tests the same; renaming them would destroy what it proves.

- [x] README, CommonJS: a shopping basket; TypeScript: a gift order (a capture, a docstring and
      a table); Step definition arguments: a plain deposit; Gherkin tables: no joke task;
      Scenario outlines: a shop's catalogue; Language: a coffee mug sold in Dutch; Re-using step
      definitions: a shared login step, and checkout steps behind an accessor
- [x] Configuration options' sample refusal and the README's output samples re-captured from
      real runs of the new examples, not edited by hand
- [x] TypeScript's strict-mode claim re-measured on the basket: it adds `TS7006` (the `add`
      parameter), now stated
- [x] RunningTheExamples calls the suite a test suite of regression fixtures, and says why some
      keep old wording
- [x] Doc-example baseline 7 of 7; CommonJS, TypeScript, ESLint and coverage examples run by
      hand; 83 links, 0 broken; suite, baselines, lint, typecheck, Prettier

## Follow-on: fresh reviews (PR stacked on #41)

Gearoid asked on 2026-10-11 for a second adversarial review and gSmith pedagogy review, run
with no context from earlier rounds, and then for all of it to be acted on, a contributor guide
included. Adversarial: no blockers, 8 should-fix, about 12 nits. Sage: NEEDS_REVISION, for
structure only.

Verdicts: every should-fix confirmed, except that Architecture's "pinned to gherkin 39" was
partly right (the pin existed in PR #16's pre-squash commits `9b2bca9` and `e2b1445`, but no
released version had it), so it was reworded rather than removed.

- [x] Should-fix: the Language page's code is `src/shop.js`, so building every page into one
      project no longer breaks the outline page (checked: 12 passed, 1 skipped); the `.cjs`
      mixing caveat; `Rule` tags in tag selection (page and `tagFilter` JSDoc); Migrating's
      0.8.1 rows; async steps and the whole-scenario timeout; two ES module troubleshooting
      entries; the Architecture pin wording
- [x] Nits: `npm pkg set` replaces the duplicate-key warning; the coverage reason; optional
      captures arrive as `undefined`; a side-effect shared import registers once; title case;
      setup-script style and the untagged-skip warning; ESLint's hook wording; no `BeforeAll`;
      the records note
- [x] Sage: set-up as commands with `node --version`; keyword binding explained by its failure
      before the rules; a complete Hooks file; a reading order and "Next" links; Hooks first;
      Migrating leads with version 2; an option table and Legacy options; TypeScript gains
      "Converting Getting Started" (run in both set-ups, `tsc` clean); "who this is for" lines
- [x] Not taken: Architecture's design-rationale narrative stays (it is the reason for the dual
      package); the README's one-line "Upgrading" pointer stays; the CommonJS ESLint config is
      still shown in full, now introduced by its three differences
- [x] Checks: doc-example baseline 7 of 7; all pages in one project; CommonJS, TypeScript,
      ESLint and coverage by hand; 102 links, 0 broken; suite, tsd, baselines, lint,
      typecheck, Prettier
- [x] Contributor guide: `CONTRIBUTING.md`, its own PR stacked on #42. Issues are turned off on
      the repository, so it asks for a failing-test pull request as the way to report a problem
