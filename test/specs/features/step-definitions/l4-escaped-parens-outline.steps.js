/**
 * Regression test — L4: escaped parentheses in a step matcher crash a scenario outline.
 * Backlog: docs/feature/review-hardening/plan.md (L4). NOT in the original RCA — found on the real
 * surface by the user-examiner (2026-07-13), and VERIFIED PRE-EXISTING: reproduced identically with
 * and without the L2 fix (a3b6c3e and b69b6a3), so it was not a regression from recent work.
 *
 * THE DEFECT. A step matcher whose source contains ESCAPED parens — /I call the function (\w+\(\))/,
 * i.e. "capture a word followed by a literal ()" — blew the whole suite up with an uncaught
 *     TypeError: Cannot read properties of null (reading 'index')
 * inside the outline matching heuristic. The IDENTICAL matcher against a PLAIN scenario worked fine
 * (the CONTROL scenario in the feature file pins that), so the crash was specific to the outline
 * path: the heuristic's guard tested one variable and dereferenced ANOTHER, and escaped parens were
 * exactly the shape that made the two disagree. On the raw source its group locator could close a
 * group across the backslash ("(\)"), while on an unescaped copy of the same source the inner "()"
 * left nothing for it to match at all — truthy on one, null on the other, `.index` read off the null.
 *
 * LOCKED FIX CONTRACT (asserted here). A step matcher containing escaped parentheses must bind
 * inside a scenario outline exactly as it already does in a plain scenario, and the bound step must
 * then run ONCE PER EXAMPLE ROW with THAT ROW'S OWN value. Both halves are load bearing and fail
 * apart: a fix that merely null-guarded the dereference stopped the crash while leaving the
 * definition unbound.
 *
 * WHAT IS LEFT TO PIN, now that the heuristic is deleted. The crash lived in code that existed only
 * to guess whether a definition could own a step whose text still held `<placeholders>`. A compiled
 * Examples row now arrives at the matcher with its value already substituted, so an outline step
 * binds by ordinary matching and the whole heuristic is gone. The promise that outlasts it is the
 * OUTCOME: this matcher binds in an outline, per row, with that row's own value — and it still binds
 * in a plain scenario.
 *
 * MECHANISM: the real public surface over a real committed feature file,
 * test/specs/features/l4-escaped-parens-outline.feature. No double of any kind — this file needed
 * one only because the old matcher was fed TEMPLATE text and deferred its captures, and neither is
 * true any more. Two observation points, both consumer-visible:
 *   - the argument the Given step was actually called with, asserted by a Then step of the SAME row,
 *     which is what makes the per-row half real: a binding that pre-captured one row's value for
 *     every row passes the first row and fails the second;
 *   - collection itself. Both wrong outcomes the NEGATIVE test used to arm are now loud at load: a
 *     TypeError out of the matcher, and a definition that never binds (a refusal naming the step it
 *     could not match). Either one fails this suite before a single test runs.
 *
 * CURRENT STATUS: GREEN. Authored RED against the unfixed heuristic (the outline crashed before any
 * binding was attempted), kept green by the fix, and now kept green by the deletion of the thing
 * that needed fixing.
 */

const { Given, Then, Before, Fusion } = require("../../../../src");

// The arguments the step under observation was ACTUALLY called with. A rest param records them
// exactly as they arrived — count and order included — so the Then can assert the whole list.
let argumentsTheStepReceived;

Before(() => {
  argumentsTheStepReceived = null;
});

// Byte-for-byte the matcher that used to crash the outline. One definition binds all three
// steps of the feature file: the plain scenario and both Examples rows.
Given(/^I call the function (\w+\(\))$/, (...argumentsGivenToTheStep) => {
  argumentsTheStepReceived = argumentsGivenToTheStep;
});

Then(/^the function step received "(.+)"$/, (callFromThisRowOrScenario) => {
  // WHAT: the single capture the step received, as this row or scenario wrote it.
  // WHY:  the escaped parens are the whole defect. A null-guard-only fix left the definition
  //       unbound, and a fix that bound a rewritten matcher, or captured one row's value for
  //       every row, would deliver the wrong text here while still looking bound.
  // HOW:  match the definition against the row's SUBSTITUTED step text and take its group.
  expect(argumentsTheStepReceived).toStrictEqual([callFromThisRowOrScenario]);
});

Fusion("../l4-escaped-parens-outline.feature");
