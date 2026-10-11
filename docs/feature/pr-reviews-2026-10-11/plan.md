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
- [ ] #41
- [ ] #42
- [ ] #43
- [ ] #46
- [ ] #47

## Not taken, with the reason

- #41, the Dutch word order (`En is de verkoop geregistreerd`, `Maar heb ik ...`): correct.
  After `Dan ontvang ik €8`, a clause joined by `en` or `maar` keeps the inverted order.
- #40, a `// filename:` comment on the CommonJS page's `package.json` keys: they were a
  fragment, not a file, and the page now gives commands instead.
