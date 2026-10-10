# Plan: triage the mutation survivors

Living plan. Updated as the work moves; correct anything here that proves wrong.

## Goal

Triage every mutant that survives Stryker on `master`, follow-on from the delivered
[drop jest-cucumber plan](../drop-jest-cucumber/plan.md). Each survivor gets one verdict:

- **Equivalent**: the mutation cannot change observable behaviour. Accepted, with the reason.
- **Wording**: a change to message prose that tests deliberately do not pin word for word.
  Accepted, unless the change alters what the reader is told to do.
- **Gap**: behaviour no test pins. A test is added, test first; if the test shows a defect,
  it is fixed as a `fix:`.

- Branch: `test/mutation-survivor-triage`, from `master` at `63cfdcf` (after 3.0.1, #31, #32).
- Asked by Gearoid on 2026-10-10 ("Triage the mutation survivors"). No Jira (ruled for this
  repository on 2026-10-09).
- Baseline: Stryker 9 on `2e65a36` scored 85.65% (722 of 843 killed, 121 survived: 72
  StringLiteral, 21 ConditionalExpression, 11 ArrayDeclaration, 17 other).

## Method

Stryker 9, command runner over the behaviour suite (`--testPathIgnorePatterns /packaging/
/arch/`: those pack or lint the tree, and the architecture test linted Stryker's own sandbox),
3 workers, on a copy of the repository outside it. Survivors are listed with
`file:line [mutator] original -> replacement` and read against the source.

## Steps

- [x] Re-run Stryker on `63cfdcf`: 85.68%, 724 killed, 121 survived, 0 timeouts (PR #30's
      `cause` tests had killed two more than on `2e65a36`)
- [x] Verdict for every survivor (below): 19 gap, 39 equivalent, 63 wording; none unclassified
- [x] Tests for the gaps: `test/specs/features/step-definitions/mutation-survivors.steps.js`
      and one U+2029 row in `snippet-binds.steps.js`. They pass on the unmutated code; the
      re-run below shows each one kills its mutant.
- [x] Re-run Stryker on the branch: **87.93%**, 743 killed, 102 survived, 0 timeouts. All 19
      gap mutants killed; all 39 equivalent and 63 wording mutants survive as expected
      (mutants matched across runs by file, line, column, mutator and replacement).
- [x] Suite (49 suites, 1,128 passed, 3 skipped), 7 of 7 baselines, tsd, lint, Prettier
- [ ] Commit, push, PR (a `test:` change: releases nothing)

## Verdicts

Ids are from the `63cfdcf` run.

### Gap: a test added (19 mutants, 11 behaviours)

| Mutants | Where | Behaviour now pinned |
|---|---|---|
| #646, #647 | `step-argument.js:33-34` | a table row is an ordinary object a step can change and delete from (read-only properties would throw in an ES module) |
| #315, #317 | `feature-source.js:197` | one duplicated title is reported in the singular ("1 title is") |
| #173 | `configuration.js:64` | `errors: null` means "no change", not a refusal |
| #423 | `index.js:44` | `Given(null, fn)` is refused as "given null", not "object null" |
| #443, #444, #445 | `index.js:83` | the missing-function refusal shows the consumer's call with a function added |
| #484 | `index.js:152` | a chain passed together with a function is refused, not silently chained |
| #672, #673, #674 | `step-matching.js:36-37` | the ambiguity refusal names both matching definitions |
| #786, #788 | `test-registration.js:85` | an error with its own stack keeps it |
| #789 | `test-registration.js:85` | an error with no stack is rethrown as itself |
| #800 | `test-registration.js:96` | a thrown object with a `message` is reported by it |
| #100, #33 | `code-suggestion.js:161, :64` | a `docString` parameter is suggested when only a later step of the shape has one; U+2029 is escaped in starter code (only U+2028 was pinned) |

### Equivalent: accepted (39 mutants)

- **Fallbacks Gherkin never takes** (#274, #333, #356, #369, #537, #554, #631, #637, #640,
  #641, #691, #760, and the `""` literals #246, #377): `x || []`, `if (!header)`, the empty
  title of a feature-less file, `dirname` of an empty caller. `@cucumber/gherkin` always
  supplies the arrays, a table always has a header row, a feature-less file registers nothing,
  and `path.dirname` gives `"."` for both. Each mutant runs only on input that cannot occur.
- **Two guards covering each other** (`keywords.js` #525, #526, #527, #529, #531, #542): line
  38 refuses `*` and the empty keyword, and line 46 skips `*` in the bucket search, so an
  unmatched keyword is refused either way.
- **Values that are overridden or only compared** (#147, #148: `errorsAcross` replaces the
  defaults' `errors`; #59, #60, #48, #51: the shape key and the quoted kind are compared, never
  shown, and `captureFor` ignores quoted values; #296, #297: case-insensitive compare of names
  Gherkin already trims).
- **Checks that cannot differ** (#336: Gherkin lists a node's own id first; #454: the bucket
  always exists; #486, #488: a RegExp never carries `stepSentence`; #659: missing `isBound` is
  falsy like `false`; `tag-filter.js` #725, #727, #729, #730, #732: tag-expression nodes hold
  no primitive children besides `value`; #739: empty split tokens never match an operand).

### Wording: accepted (63 mutants)

The WHY and HOW prose of the refusals (`code-suggestion.js` #132-#139, `configuration.js`
#177, #178, #200-#206, `feature-source.js` #257, #321-#328, #344, #345, `index.js` #428, #430-#432,
#440-#442, #498, #499, `scenario-name.js` #571-#576, #584-#586, #596, #604, #605, #615, #616,
`tag-filter.js` #704-#707, #713, #714, #717), the joiners between "nor:" lines and between
listed keywords (#124, #320, #522), and how a thrown template or parser error is quoted
(#582, #711). The suite pins each refusal's first line and its meaning, deliberately not every
word: these mutants change wording, never what a reader is told to do.

### Noticed, not changed

Two unbound steps with the same text are named once, from the first one, so if only the second
carries a docstring the starter code omits the `docString` parameter
(`Given("the note", () => {});`). The suggestion still binds both steps; the docstring arrives as
an unnamed extra argument. A usability point, left for a decision.
