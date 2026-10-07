/**
 * Regression test — L2: scenario-outline matching edge cases.
 * RCA: docs/feature/review-hardening/discuss/rca.md (L2, LOW).
 *
 * L2 named THREE sub-defects. Two were real and reachable through the public surface and are
 * pinned below; the third was a FALSE POSITIVE and is deliberately NOT tested (evidence below).
 *
 * (a) REAL — LITERAL CAPTURING GROUP AT A FIXED POSITION.
 *     The outline matching heuristic consumed the step regex placeholder-by-placeholder and
 *     handed whatever was LEFT OVER to a comparison that treated the leftover as a regex only
 *     if it held a capturing group containing one of [sSdDwWbB*]; otherwise it fell back to a
 *     plain string `endsWith`. A literal alternation group in the FIXED part of the step —
 *     `(on|off)` — holds none of those characters, so " lamp is (on|off)".endsWith(" lamp is on")
 *     === false and the definition never bound. The discriminator was nothing but the group's
 *     SPELLING: the identically shaped `(on|down)` (a 'd' and a 'w') took the regex branch and
 *     bound.
 *
 * (c) REAL — DIGIT-CLASS TYPO `0` vs `0-9` IN THE OUTLINE DETECTOR.
 *     The regex that located a capturing group inside the step definition spelled its character
 *     class `[a-zA-Z0!|,:?*+.^=${}><\\-]` — the digit `0` alone, where `0-9` was meant. So it
 *     could not span a group whose source contains a digit 1-9, which made EVERY bounded
 *     quantifier — `(\d{4})` — invisible to it and therefore unbindable in an outline, while
 *     `(\d+)` (no digit in its source) bound.
 *
 * (b) REJECTED — the greedy /<.*>/ capture-injection bypass was not an L2 defect; no test
 *     written. On CAPTURES the two branches delivered identically, so there was no
 *     user-visible wrong behaviour to encode. The docstring asymmetry it did have was tracked
 *     and fixed separately as L3 — see l3-step-argument-delivery.steps.js.
 *
 * WHAT IS LEFT TO PIN, now that the heuristic is deleted. All of (a) and (c) lived in code that
 * existed only to guess whether a definition could own a step whose text still held
 * `<placeholders>`. A compiled Examples row now arrives at the matcher with this row's value
 * already substituted, so there is nothing to guess and the whole heuristic is gone. The
 * promise that outlasts it is the OUTCOME both sub-defects broke, and that is what this file
 * asserts: whatever the spelling of the capturing groups in a definition, an outline step binds
 * it, and the bound step runs with the example row's values.
 *
 * MECHANISM: the real public surface over a real committed feature file,
 * test/specs/features/l2-outline-edge-cases.feature. No double of any kind — this file needed
 * one only because the old matcher was fed TEMPLATE text and deferred its captures, and
 * neither is true any more. Two observation points, both consumer-visible:
 *   - the arguments the Given step was actually called with, asserted by a Then step of the
 *     same row, which is the contract the fix had to honour;
 *   - collection itself. An unbound step is a refusal out of Fusion() naming the step it could
 *     not match, which fails this suite loudly at load — so "the definition binds" needs no
 *     separate negative assertion. That refusal IS the negative.
 *
 * CURRENT STATUS: GREEN. Authored RED against the unfixed heuristic (the definition never
 * bound, so the suite blew up at collection), kept green by the fix, and now kept green by the
 * deletion of the thing that needed fixing.
 */

const { Given, Then, Before, Fusion } = require("../../../../src");

// The arguments the step under observation was ACTUALLY called with. A rest param records them
// exactly as they arrived — count and order included — so the Then can assert the whole list.
let argumentsTheStepReceived;

Before(() => {
  argumentsTheStepReceived = null;
});

const recordTheArguments = (...argumentsGivenToTheStep) => {
  argumentsTheStepReceived = argumentsGivenToTheStep;
};

// (a) `(on|off)` sits in the FIXED part of the step, not at the placeholder, and holds none of
// the characters the old leftover detector recognised.
Given(/^the (\w+) lamp is (on|off)$/, recordTheArguments);

// (c) `{4}` puts a digit 1-9 in the group's source, which the old group locator could not span.
Given(/^the access code is (\d{4})$/, recordTheArguments);

// (a)+(c) crossover: `(\w{4})`'s `4` means only the widened class could span it, yet its `w`
// is in the legacy [sSdDwWbB*] set — so it LOOKS like a shape the old detector handled, and it
// was not. Narrowing the digit fix to "only \d groups need it" would have unbound this.
Given(/^the door code is (\w{4})$/, recordTheArguments);

// (a)+(c) crossover: `(v1|v2)` holds none of the legacy characters, so only a presence test
// could see it, and its digits keep it outside that set's reach entirely.
Given(/^the (\w+) release is (v1|v2)$/, recordTheArguments);

Then(
  /^the lamp step received "(.+)" and "(.+)"$/,
  (colourFromThisRow, state) => {
    // WHAT: the two captures the lamp step received, in order.
    // WHY:  (a) made this definition unbindable in an outline purely because of how its second
    //       group was spelled. The captures are the contract: a binding that dropped the fixed
    //       group's capture, or bound a rewritten matcher, reads as a passing suite with the
    //       wrong arguments.
    // HOW:  match the definition against the row's SUBSTITUTED step text and take its groups.
    expect(argumentsTheStepReceived).toStrictEqual([colourFromThisRow, state]);
  }
);

Then(/^the access step received "(.+)"$/, (codeFromThisRow) => {
  // WHAT / WHY / HOW: as above, for (c) — the bounded-quantifier group's capture.
  expect(argumentsTheStepReceived).toStrictEqual([codeFromThisRow]);
});

Then(/^the door step received "(.+)"$/, (codeFromThisRow) => {
  // WHAT / WHY / HOW: as above, for the first crossover shape.
  expect(argumentsTheStepReceived).toStrictEqual([codeFromThisRow]);
});

Then(
  /^the release step received "(.+)" and "(.+)"$/,
  (channelFromThisRow, release) => {
    // WHAT / WHY / HOW: as above, for the second crossover shape.
    expect(argumentsTheStepReceived).toStrictEqual([
      channelFromThisRow,
      release,
    ]);
  }
);

Fusion("../l2-outline-edge-cases.feature");
