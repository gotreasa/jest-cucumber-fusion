# A second feature in the same steps file only ever uses the steps it was given

**Feature-id**: `fix-m3-singleton-reset`
**Human directive (verbatim)**: "Let's tackle P2 and P3 items" — P2 being defect M3.
**Status**: armed, unexamined

## Intent

A person writing tests with this library can put more than one feature in a single
`.steps.js` file — register some steps and hooks, call `Fusion()` for the first feature,
then register different steps and hooks and call `Fusion()` again for the second.

Today that quietly betrays them. Leftovers from the first feature are still lying around
when the second one runs: the second feature can match step definitions the author never
wrote for it, and `Before`/`After` hooks belonging to the first feature fire again on the
second feature's scenarios. The tests go green — or behave — for reasons the author did not
write and cannot see. A test that passes for an unwritten reason is worse than a failing
one, because nobody investigates it.

The expectation: **every `Fusion()` call starts from a clean slate.** Whatever the second
feature does, it does with the steps and hooks registered for *it*, and nothing else. The
first feature's leftovers are gone. And this holds even when the first `Fusion()` call blew
up — a missing feature file, a Gherkin step with no matching definition — because that is
exactly when a half-built pile of leftovers is most likely to be left behind.

## Preconditions

Runtime is **Node + Jest**, driven from the command line — this is an npm library, so the
only surface that counts is real `.feature` + `.steps.js` files run through the Jest test
runner. Do **not** verify this by reading or unit-testing the library's internals; you
cannot read source code, and the point is what a library *user* sees.

Set up a scratch project outside the library's own test suite (a temp directory is fine):

- `npm init -y`, then install the library under test. Install it **from this working copy**
  (e.g. `npm install <path-to-this-repo>`) so you are exercising the fixed code, not the
  published version.
- Point Jest at step files, exactly as the README tells a user to:
  `"jest": { "testMatch": ["**/*.steps.js"] }` in `package.json`.
- Write your own `.feature` files (Gherkin) and your own `.steps.js` files that
  `require('@g_package/jest-cucumber-fusion')` and use `Given`/`When`/`Then`/`And`/`But`,
  the `Before`/`After` hooks, and `Fusion('some.feature')` — per the README's Getting
  Started. Keep the `.feature` file next to the `.steps.js` file that names it.
- Run them with `npx jest` (add `--verbose` if you want to see individual scenario names).

That is the whole rig: files you wrote, one command, whatever Jest prints. Anything you
conclude must be visible in that output.

## Charter — what to explore

Build a step file that holds **two features at once** and see whether the second one is
honest. Everything below is a direction to probe, not a script — invent the actual Gherkin,
the actual step text, and the actual assertions yourself, and vary them.

The core probe: make the second feature's *correctness depend on the first feature's
leftovers being gone*. A few angles worth attacking, and you should find more:

- **Steps that were never registered for feature two.** Give feature one a step definition,
  then have feature two's Gherkin use a sentence that only feature one's definitions could
  match. If the library is clean, feature two has no definition for that sentence and must
  say so loudly. If it is dirty, feature two happily runs a step its author never wrote.
- **Hooks that should have retired.** Have feature one's `Before`/`After` hooks leave a
  visible trace — bump a counter, push to an array, write something the second feature's
  assertions can read. Then assert, inside feature two, that only feature two's own hooks
  ran. Count them. A hook firing twice, or firing at all when it belongs to the other
  feature, is the bug wearing a disguise.
- **Steps that collide by name.** Register the *same* Gherkin sentence in both features with
  different behaviour. Feature two must get feature two's behaviour — never feature one's,
  and never both.
- **Order and quantity.** Three features in one file. Two features in one file plus a
  perfectly ordinary single-feature file alongside it — the fix must not break the ordinary
  case, which is what almost every real user is doing.
- **The unhappy first act (required, see the sad path below).** Make the first `Fusion()`
  call fail, then check the second one is still clean.

Be demanding. You are not trying to confirm the fix; you are trying to catch the second
feature using something it was never given. Ask what a paying user would try on a Friday
afternoon and hit that.

## Expected observations (the oracle)

- A step file containing two features runs, and the second feature's scenarios execute
  using only the step definitions registered for that feature. The result Jest prints for
  feature two is explainable *entirely* by the code written between the first `Fusion()`
  call and the second.
- Hook traces are exact: for a scenario in feature two, only feature two's `Before`/`After`
  hooks leave a mark, and each leaves it exactly once. Counters agree with what the author
  wrote — not double, not carried over.
- The plain single-feature-per-file case is unchanged: an ordinary steps file still passes
  and still reports the same scenarios it always did.
- **Negative**: the second feature must NOT silently pass by matching a step definition that
  belongs to the first feature. If feature two's Gherkin contains a sentence with no
  definition of its own, Jest must fail or otherwise refuse it — a green run there is a
  FAIL of this charter, not a pass. Test-suite green is not the oracle; green *for the
  reasons you wrote* is.
- **Negative**: a hook registered only for feature one must NOT fire during feature two's
  scenarios. Any trace of it (an extra count, an unexpected side effect, an assertion that
  only passes because someone else set something up) is a FAIL.
- **Negative**: if the first `Fusion()` call fails, the tool must NOT pretend the second
  feature is fine by feeding it the wreckage — see the sad path.

### Sad path — the guarantee must survive a failed first `Fusion()`

Break the first feature on purpose, two ways, in separate runs:

1. Point the first `Fusion()` at a `.feature` file that does not exist.
2. Give the first feature a Gherkin step with no matching step definition.

In both cases the first feature is *expected* to fail — that is fine, and its failure should
be reported clearly enough that a non-technical reader can tell **which** feature broke and
**why** (a missing file should look like a missing file; a missing step should look like a
missing step). The point of the probe is what happens to the second feature afterwards.

- The second feature in the same file must still run against a clean slate: only its own
  steps, only its own hooks, no scraps left behind by the crash.
- **Negative**: the second feature must NOT inherit the failed first feature's leftovers —
  no orphan hooks firing, no step definitions bleeding through, no cascade where the second
  feature fails (or passes) *because* the first one broke rather than on its own merits.
- **Negative**: the tooling must NOT go silent about the first feature's failure. A run where
  the first feature quietly disappears and Jest reports overall success is a FAIL — the
  failure must be visible and attributable, not swallowed in the name of cleaning up.

If you cannot construct a probe that would distinguish "clean slate" from "leftovers
present" — say so and record INDETERMINATE. Do not record PASS because nothing went
visibly wrong; a bug whose whole nature is silence will not announce itself.

## Session log

Append-only. Never edit a past row.

| Date | Examiner | Verdict | Observations |
|---|---|---|---|
| 2026-07-13 | nw-user-examiner | FAIL | Hook leakage: Feature One's Before hook fires during Feature Two's scenario execution. Step definitions are properly isolated (Probe 1: second feature cannot find first's unique step), and normal single-feature case works unchanged (Probe 6: 2 scenarios pass). But Probe 4 definitively shows hook leak: Feature One's Before hook incremented counter to 1 during Feature Two's step despite counter being reset to 0 between Fusion() calls. Sad path works when wrapped in try/catch (Probe 5). Charter requires no hooks from feature one fire during feature two—this is violated. |
