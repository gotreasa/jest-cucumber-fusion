# Plan: act on the reviews of pull requests #40 to #47

Living plan. Updated as the work moves; correct anything here that proves wrong.

## Goal

On 2026-10-11 Gearoid asked for an adversarial review and a gSmith pedagogy review
(`gsmith-pedagogy-reviewer`) of each open pull request, #40 to #47: sixteen reviews. He then
asked for every finding to be fixed bottom-up, #45 to be closed and the stray `master` branch
deleted. No Jira for this repository.

## Done outside the pull requests

- [x] The remote `master` (`6a12de8`, an older "chore: enable nWave", superseded by `f92e598` on
      `main`) deleted, with Gearoid's approval. While it existed, semantic-release ranked it first
      and treated `main` as a secondary channel.
- [x] #45 closed: `main`'s `f92e598` already activates nWave.

## Where each fix goes

The documentation pull requests are stacked: #40, #41, #42, #43, then #46. A fix goes on the
lowest branch from which the line it corrects stays unchanged to the top of the stack, so that
merging each branch into the next cannot conflict. Each branch is then merged into the next.

## Steps

- [x] #44: `release.branches` names `main` alone; the push trigger says it ships a release; the
      required-check comments name the `compat` checks; the nWave entries in `.prettierignore`
      are anchored and explained; `main` merged in so its `prettier` check is real evidence;
      description corrected. Left as a follow-up: the `prettier` job checks out `head_ref`.
- [x] #40: the Gherkin primer says each feature file holds one `Feature`; the upgrade line says
      CommonJS step files keep `require`, and a line points Cucumber users at what differs; the
      first run points at Troubleshooting when Jest prints only a summary; the
      `Unexpected token 'with'` entry gives the measured Node versions; `After` hooks time out
      as `Before` hooks do; the CommonJS page has its own set-up commands (run in a fresh
      project: 1 passed), needs "no experimental flag", and says to delete the `@jest/globals`
      import when converting; the ESLint comments say hooks run in `beforeEach`/`afterEach`;
      the TypeScript page shows the `StepArgument` import and the `@jest/globals` import
- [x] #41: the login example is "My account", and its email comes from the shared file, not a
      repeated literal; the checkout feature uses the shared `Given I am logged in` too, so the
      step really is shared; the shared checkout file is `basket-steps.js`, no longer one
      character from `checkout.steps.js`; the order assertion reads `orders[ 0 ]`; the TypeScript
      table assertion has actual and expected the right way round; the Cucumber Expressions
      examples use a step from Getting Started; the sample refusal names its feature's steps;
      the outline page says it is the shop owner's side, and how `(.*)` captures. Doc-example
      baseline 7 of 7
- [x] #42: Migrating says CommonJS keeps its module format, that 0.8.1 refused only a tagged
      `Rule:`, which version 2 rows were run under 0.8.1 (change 2, the spaces-only filter) and
      how change 3 differed there, which Jest versions were run (CI runs 30 only), the measured
      Node versions, and scopes the cost section to 0.8.x, with the tag-filter warning in the
      lead; the `.cjs` caveat holds before Node 24.9 only; Troubleshooting gives both causes of
      `Must use import` and `Cannot use import statement`, quotes `jest is not defined` without
      its prefix, and splits the empty-file, no-`Feature:` and wrong-path cases; the README
      says why ES modules are recommended and gives the CommonJS Node floor, points from
      `expect` to the `jest` exception, gives the keyword import its own bullet and Coverage its
      own heading; the index says the TypeScript page's examples were run by hand; ESLint is
      scoped to JavaScript; Language and the TypeScript `Order` example say why they are what
      they are; `session` reset noted; the long JSDoc line reflowed. 103 links, 0 broken;
      doc-example baseline 7 of 7
- [x] #43: the guide says a `BREAKING CHANGE:` footer releases a major and `feat!` alone releases
      nothing (re-run on the locked commit-analyzer: `feat!` null, footer major, `perf` patch,
      `revert` null), quotes real commits, needs Node 22.22.1 for contributors, has a fork step,
      an issue-first step and what happens after a pull request, says how squash titles and
      bodies decide the release and that only the hook checks commit messages, defines the
      baselines, and scopes the documentation section; conduct reports have a route in the
      issue chooser, SUPPORT and CONTRIBUTING, and the code of conduct says the maintainer is
      the moderator; SECURITY covers `scripts/prepare-hooks.js`, dates provenance from 3.0.2,
      names version 1, has a fallback route and promises no response time; the issue forms
      lost `render` on mixed code, gained a Jest configuration field, a search prompt and a
      version field on questions (schema check: all four parse); the earlier plan is corrected
- [x] #46: Background teaches the feature `Background` alone, and the Background inside a Rule
      moved to the Rule page, which now uses `Scenario:` and says `Example:` is the same;
      Rule moved after Scenario outlines in the reading order, the Next links and both tables;
      the absolute-path example uses `import.meta.url`, in a `test/steps/` layout, and the
      exports table mentions absolute paths; the folder loop is shown as code that builds the
      folder's full path; the account example resets `session` in a hook; a JSON docstring
      example, and the indentation rule stated exactly; "Run one scenario" shows the `@wip` tag,
      says `-t` is a regular expression, gives the PowerShell form and the global-filter caveat;
      `*` is in "nearly every" language; delivery charges in euro; the index names Hooks in the
      reading order and calls the other pages reference pages. Doc-example baseline 9 of 9;
      the absolute path and the folder loop run under Jest 29.7.0 (3 passed); 144 links, 0 broken
- [x] #47 (`5905c37`, its own branch off `main`): the copied "which is nice" definitions removed
      from `scenario-outlines.steps.js`; the starting price asserted (the reviewer's `$7`
      mutation now fails); comments on why the three regular expressions stay apart; the
      feature says what it proves and that its title and rows are verbatim. Name baseline 9 of 9
- [x] Pull request descriptions: a "Review round 3" section on #40 to #43, #46 and #47, and the
      statements the reviews contradicted corrected (#42's "could not read `Rule:`", #43's
      "official text unchanged", #41's `master`, #47's "taken from")

## Follow-ups, not done here

- The `prettier` job checks out `github.head_ref`, so it never checks a pull request's merge
  with `main` (#44 description).
- The doc-example baseline installs only Jest 30, never runs unnamed snippets and does not check
  the test counts the pages state.
- The merge commit `cb27cca` on #42's branch kept git's `# Conflicts:` lines after its trailers.
- GitHub reported 8 Dependabot alerts on `main` (1 high, 6 moderate, 1 low) on 2026-10-11.

## Not taken, with the reason

- #46, the doc-example baseline gaps (Jest 30 only, no check of stated test counts, unnamed
  snippets never run): real, but the reviewer found them outside this pull request's change.
  A follow-up, not a documentation fix.
- #41, a two-row table in the TypeScript gift order: the example now says why it uses an
  `Order`; a second row would need a different class for one sentence's gain.

- #41, the Dutch word order (`En is de verkoop geregistreerd`, `Maar heb ik ...`): correct.
  After `Dan ontvang ik €8`, a clause joined by `en` or `maar` keeps the inverted order.
- #40, a `// filename:` comment on the CommonJS page's `package.json` keys: they were a
  fragment, not a file, and the page now gives commands instead.
