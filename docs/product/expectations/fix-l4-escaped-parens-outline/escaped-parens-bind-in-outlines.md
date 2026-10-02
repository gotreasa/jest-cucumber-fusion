# A step whose wording contains brackets works in a scenario outline, not just a plain scenario

**Feature-id**: `fix-l4-escaped-parens-outline`
**Surface**: the published library `@g_package/jest-cucumber-fusion` — real `.feature` + `.steps.js` files, run by Jest.
**Human directive (verbatim)**: "Let's tackle P2 and P3 items."

## Intent

A test author writes Gherkin steps in whatever English their domain actually uses — and real domain
English contains brackets. "the booster(s) should land back on the launch pad". "I call the function
`doThing()`". When they match such a step with a regular expression, the brackets have to be escaped
so the regex treats them as literal characters rather than a capture group.

Today that works in an ordinary scenario and **detonates** in a scenario outline. The author moves
the very same step into a `Scenario Outline` with an `Examples:` table — no change to the step
definition, no change to its wording — and the whole Jest suite dies. Not "1 test failed". Not "no
step definition found". The suite **fails to run at all**. Every other test in the file goes down
with it, and nothing in the output points at the outline as the culprit.

That is a trap with no warning sign on it. A user cannot predict that a legal step definition becomes
a suite-killer purely because of the block it happens to sit under. What they should get instead is
boring: the step binds inside the outline exactly as it binds in a plain scenario, and the outline
runs once per row of the Examples table, each row carrying its own value. Nothing crashes. The author
never has to know the word "escaped".

## Preconditions

This is a **Node.js / npm** project and the surface is **Jest**. Nothing here is a unit test of the
library's internals — the examiner never opens `src/`, and never imports anything but the package's
public entry point.

Set up a scratch consumer project (a throwaway directory, or a scratch folder inside a checkout that
already has `node_modules` — either is fine, so long as `require`ing the library resolves to the
build under test):

- Point Jest's `testMatch` at `**/*.steps.js`, per the library's own README.
- Author real `.feature` files (Gherkin) and matching `.steps.js` files that register step
  definitions with the library's `Given` / `When` / `Then` / `And` / `But` and end with a `Fusion(...)`
  call naming the feature file.
- Run them with `npx jest` (add `--verbose` if you want to see which scenarios executed; you will).

The library's own `README.md` and `docs/ScenarioOutlines.md` are the only reference needed to write
those files — they show the plain-scenario shape and the outline shape (`<placeholder>` tokens plus an
`Examples:` table, one run per row). Everything else on this page is *what to look for*, not what to type.

## What to explore

Build your own probes. The shape to hunt is: **a step definition whose matcher is a regular expression
containing escaped brackets — `\(` and `\)` — used inside a Scenario Outline whose Examples table
supplies the varying part.** A function-call phrasing is the natural one (`I call the function
someName()`, matched by something like `/I call the function (\w+\(\))/`), but any domain wording with
literal brackets in it will do; pick your own and make the step actually assert on the value it
captured, so a silently-empty binding cannot pass by accident.

Then push on it, the way a paying user would:

- More than one Examples row — does *each* row run, with *its own* value, or does row 2 quietly reuse row 1's?
- The escaped brackets appearing in different positions in the step wording — captured, adjacent to a
  `<placeholder>`, or sitting in the literal (non-varying) part of the sentence.
- More than one such step in the same outline; a Given, a When and a Then all wearing brackets.
- Mixing: an outline that has both a bracket-bearing step and an ordinary one.
- Nastier-but-legal regex neighbours: escaped brackets alongside other escaped metacharacters
  (`\$`, `\.`, `\?`), and steps whose *Examples values themselves* contain brackets.

Interrogate the output as much as the exit code. The interesting question is not only "did it pass"
but "did it actually **run** what I wrote, and did each row get its own value" — a suite that skips
everything, binds nothing, or runs one row where three were promised is a failure wearing a green coat.

## Expected observations (oracle)

Positive:

- Running `npx jest` over a scratch project containing a bracket-bearing regex step inside a Scenario
  Outline **completes a real test run**: Jest reports the suite as having run, and the scenario shows
  once per Examples row.
- The value the step captured is the value from *that row* — the assertions the examiner wrote against
  each row's data pass, and row N does not see row N−1's data.
- The identical step definition, used in an ordinary (non-outline) `Scenario`, still works exactly as
  it did before. (Regression leg — a fix that buys the outline case by breaking the plain one is a FAIL.)
- Ordinary regex step definitions with no brackets at all still bind and run inside outlines, once per
  row, unchanged. (Second regression leg.)

Negative:

- Negative: the suite must NOT crash. A crash — Jest reporting "Test suite failed to run", a thrown
  error before any scenario executes, a non-zero exit with zero tests reported — is a **worse and
  categorically different** failure than a failed assertion, and must be recorded as such. If the run
  dies before it can even attempt the scenarios, the verdict is FAIL regardless of anything else on the
  page. The examiner must state explicitly which of the two she saw.
- Negative: a green exit code with **zero scenarios executed** is a FAIL, not a PASS. The examiner must
  confirm from the run's own output (test/scenario counts, `--verbose` names) that the outline's
  scenarios genuinely ran, one per Examples row — the promised row count, no fewer. Silence is not success.
- Negative: the run must NOT report the step as unmatched / undefined ("no step definition found",
  a pending or skipped step). Binding-by-not-binding is not a fix; it is the crash traded for a shrug.
- Negative: no row may pass on a captured value of `undefined`, an empty string, or another row's
  value. If the examiner's assertions are strict about each row's data and they still pass, that's the
  proof; if a probe passes only because nothing was asserted, the probe was too weak — tighten it and re-run.
- Negative: the fix must NOT have been bought at the plain scenario's expense. If the same escaped-paren
  regex that works in an outline now misbehaves, crashes, or goes unmatched in an ordinary `Scenario`,
  the verdict is FAIL even if every outline probe is green.

## Session log

| Date | Examiner | Verdict | Observations |
|---|---|---|---|
| 2026-07-13 | nw-user-examiner | PASS | 19 scenarios executed (3 outline rows + 1 plain + 15 edge/complex rows). Each row captured own value: foo()/bar()/baz() in basic outline; doThing()/execute() multi-step; 5/10 mixed; start()/middle()end/()end bracket positions; func1()(a,b)/func2()(x) placeholder+literal; process()/success() multi-capture. Exit code 0, no crash, no undefined steps, all assertions pass. Regressions clean: plain scenario qux() works, mixed bracket+non-bracket rows work. No flags. |
