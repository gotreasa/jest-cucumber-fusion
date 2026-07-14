# A regex step definition binds to a scenario-outline step, once per example row

**Feature-id**: `fix-l2-outline-regex`
**Human directive (verbatim)**: "Let's tackle P2 and P3 items."
**Status**: armed, unexamined

## Intent

A person writing tests with this library may match a Gherkin step either with a plain string
or with a regular expression. They may also write a **Scenario Outline** — one scenario
template with `<placeholder>` tokens and an Examples table, run once per row.

Today those two perfectly ordinary things do not reliably combine. Put a regex step
definition against an outline step and, for some shapes of regex, the library simply cannot
find it: the run fails complaining there is **no step definition** for a step the author
plainly wrote, sitting right there in the file. Two shapes are known to have been affected —
a regex with an alternation group in the fixed part of the step (something like *"the
`<colour>` lamp is (on|off)"*), and a regex with a bounded-quantifier group (something like
*"the access code is (\d{4})"*, a 4-digit code). The same regexes work fine in an ordinary,
non-outline scenario; only outlines break. And the alternation failure depended on *which
letters were inside the group* — one word list broke, another worked — which is nonsense
from a user's point of view and the clearest sign that the author is being punished for
something arbitrary.

The expectation: **a regex step matcher binds to a scenario-outline step just as it binds
anywhere else, and the step runs once per example row with that row's values.** No shape of
ordinary regex is secretly forbidden inside an outline. Whatever a user could write in a
plain scenario, they can write in an outline. And the shapes that already worked keep
working — a fix that buys the broken shapes by breaking the good ones is not a fix.

## Preconditions

Runtime is **Node + Jest**, driven from the command line. This is an npm library, so the
only surface that counts is real `.feature` + `.steps.js` files run through the Jest test
runner. Do **not** verify this by reading or unit-testing the library's internals; you
cannot read source code, and the point is precisely what a library *user* sees.

Set up a scratch project outside the library's own test suite (a temp directory is fine):

- `npm init -y`, then install the library **from this working copy** (e.g.
  `npm install <path-to-this-repo>`) so you are exercising the code as it stands, not the
  published version.
- Point Jest at step files exactly as the README tells a user to:
  `"jest": { "testMatch": ["**/*.steps.js"] }` in `package.json`.
- Write your own `.feature` files (Gherkin, including `Scenario Outline:` with an `Examples:`
  table) and your own `.steps.js` files that `require('@g_package/jest-cucumber-fusion')`,
  register steps with `Given`/`When`/`Then`/`And`/`But` — **using regular expressions as the
  matchers** — and end with `Fusion('some.feature')`. Keep each `.feature` file next to the
  `.steps.js` file that names it. The README's Getting Started and the project's public
  scenario-outline doc show the shape; the content is yours to invent.
- Run with `npx jest` (add `--verbose` to see individual scenario names and how many ran).

That is the whole rig: files you wrote, one command, whatever Jest prints. Anything you
conclude must be visible in that output.

## Charter — what to explore

Build outlines whose steps are matched by regexes, and try to catch the library refusing a
step definition that is unmistakably there. Everything below is a direction to probe, not a
script — invent the Gherkin, the step text, the regexes and the assertions yourself, and
vary them hard.

The core probe: **write a regex step definition, use it in a Scenario Outline, and see
whether it binds at all.** Angles worth attacking, and you should find more:

- **Alternation in the fixed part of the step.** A step that mixes a `<placeholder>` with a
  literal choice group — *"the `<x>` thing is (this|that)"*. Because the old failure was
  letter-dependent, **vary the words inside the group deliberately and widely**: short words,
  long words, words that share letters with the placeholder name or with the surrounding
  step text, words that don't, more than two alternatives, an alternation adjacent to the
  placeholder and one far from it. A fix that works for one word list and not another has
  not fixed anything — it has moved the trap.
- **Bounded quantifiers.** A group with an explicit repetition count — a fixed-length code,
  a fixed-length date part. Try `{n}`, and go looking for its relatives: `{n,}`, `{n,m}`,
  quantifiers on character classes, quantifiers on groups, more than one in the same step.
- **Where the placeholder sits.** Placeholder inside a capture group, outside it, before it,
  after it, two placeholders in one step, a placeholder whose value itself contains regex-ish
  characters (a `+`, a `.`, a `?`, a bracket) supplied from the Examples table.
- **Do the values actually arrive?** Binding is only half the promise. Assert *inside* the
  step that the captured arguments are this row's values — not the previous row's, not the
  raw `<placeholder>` text, not undefined. An outline that binds but feeds every row the same
  value is still broken.
- **Do all the rows run?** Count the scenarios Jest reports against the number of rows in
  your Examples table. Make the rows distinguishable so a skipped or duplicated row is
  visible.
- **Sad path — a step that genuinely has no definition.** Give an outline a step you never
  wrote a definition for. The library must still say so, loudly and understandably. The fix
  must not buy its success by making "no step definition" impossible to report.

Be demanding. You are not trying to confirm a fix; you are trying to find the next regex a
paying user would reasonably write on a Friday afternoon that this library still cannot see.

## Expected observations (the oracle)

- A `.steps.js` file whose step definitions are regexes — including one with an alternation
  group and one with a bounded-quantifier group — binds cleanly to a Scenario Outline: Jest
  runs the scenario **once per row** of the Examples table, and each run receives that row's
  values.
- The captured arguments inside each step are this row's actual values from the Examples
  table, and the assertions you wrote pass or fail *for the reasons you wrote*, not by
  accident.
- Alternation groups behave the same regardless of the words inside them — swapping the word
  list changes nothing about whether the step is found.
- Negative: a well-formed regex step definition that a user has plainly written must NOT be
  reported as missing. If Jest complains there is **no step definition** for a step whose
  matcher is sitting in the file, that is a FAIL of this charter — no matter how exotic the
  regex looks, and no matter that "it works in a plain scenario".
- Negative: an outline must NOT run fewer (or more) times than its Examples table has rows,
  and must NOT feed a row the wrong row's values, or the literal `<placeholder>` text, or
  `undefined`. A green run that quietly executed only the first row is a FAIL.
- Negative: a green Jest exit with **zero scenarios actually executed** (no test files
  matched, the feature silently skipped, the outline collapsed to nothing) is a FAIL, not a
  pass. "I looked and it's fine" and "I never looked" must not produce the same output —
  read the scenario count, don't read the exit code.
- Negative: a step that truly has no definition must still be reported as such. Silence there
  is a FAIL — the fix must not make genuine missing-step errors disappear.

### Regression guard — the shapes that already worked must still work

The broken shapes must be bought with nothing. In the same run, keep working probes for the
regex shapes that were never in question, and confirm they are untouched:

- Regexes in **ordinary, non-outline scenarios** — including the same alternation and
  bounded-quantifier shapes above. These worked before; they must still work.
- **Plain-string** step matchers in a Scenario Outline — the everyday case almost every real
  user is on.
- Regexes in an outline that already worked: simple open captures (a greedy catch-all, a
  digit run), an alternation group whose word list happened to be fine, escaped literal
  characters in a step (the README's own booster example escapes parentheses), anchors at
  the start and end of the pattern.
- A feature file mixing outlines and plain scenarios, string matchers and regex matchers, in
  one run.

Negative: if any previously-working shape now fails to bind, mis-binds, or changes the number
of scenarios it runs, that is a FAIL of this charter even if every newly-fixed shape passes.

If you cannot construct a probe that distinguishes "the regex bound" from "the regex bound by
luck", say so and record INDETERMINATE. Do not record PASS because nothing went visibly
wrong — and do not record PASS on a run where you never confirmed how many scenarios actually
executed.

## Session log

Append-only. Never edit a past row.

| Date | Examiner | Verdict | Observations |
|---|---|---|---|
| | | | |
