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
- [ ] #46
- [ ] #47

## Not taken, with the reason

- #41, the Dutch word order (`En is de verkoop geregistreerd`, `Maar heb ik ...`): correct.
  After `Dan ontvang ik €8`, a clause joined by `en` or `maar` keeps the inverted order.
- #40, a `// filename:` comment on the CommonJS page's `package.json` keys: they were a
  fragment, not a file, and the page now gives commands instead.
