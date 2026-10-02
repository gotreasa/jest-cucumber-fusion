/**
 * Regression test — L3: a step's Gherkin argument is delivered or dropped depending on which
 * matching branch the step took.
 *
 * THE DEFECT. `injectVariable` (src/index.js:439-484) forwards the step's Gherkin argument to the
 * user's step function only when that argument is an ARRAY (src/index.js:476):
 *     if (Array.isArray(stepArgs) && stepArgs.length > 0) {
 *       dynamicMatchThatAreVariables.push(stepArgs);
 *     }
 * But an ARRAY is only one of the two shapes jest-cucumber parses a step argument into
 * (node_modules/jest-cucumber/dist/src/parsed-feature-loading.js:57-63, parseStepArgument):
 *     data table -> an ARRAY of row objects
 *     docstring  -> a STRING (astStep.docString.content)
 *     neither    -> null
 * So the type test silently drops every docstring. jest-cucumber's own step-invocation path makes no
 * such distinction — it forwards whatever the argument is on a plain not-null/not-undefined test
 * (feature-definition-creation.js:129-130):
 *     if (stepArgument !== undefined && stepArgument !== null) { args.push(stepArgument); }
 *
 * WHY IT IS A BRANCH BUG, NOT A FLAT ONE. injectVariable has three exits, and only ONE of them runs
 * the type test:
 *   (1) NO stepRegExp — a plain-STRING step matcher (src/index.js:448-457). Returns a pass-through
 *       wrapper `(...args) => stepFn(...args)`; jest-cucumber supplies the argument itself, so the
 *       docstring ARRIVES.
 *   (2) stepRegExp present but no match, or the sentence still holds `<...>` (src/index.js:461-468).
 *       Pass-through wrapper again — the docstring ARRIVES. This is the branch an OUTLINE takes: its
 *       TEMPLATE step text still carries `<...>` when the wrapper matches definitions against it.
 *   (3) stepRegExp AND a real match — the CAPTURE-INJECTION branch (src/index.js:470-483). This one
 *       builds the argument list BY HAND and calls the step with `stepFn(...dynamicMatchThatAreVariables)`
 *       (arity 0, so jest-cucumber's own args are discarded entirely). Here, and only here, the
 *       Array.isArray guard runs — and the docstring is SILENTLY DROPPED.
 * Whether a docstring reaches the step function therefore depends on how the step happened to be
 * matched. That is the defect.
 *
 * LOCKED FIX CONTRACT (DELIVER implements; this file asserts it). A step's Gherkin argument reaches
 * the step function whatever its shape and whichever branch matched it, positioned AFTER the regex
 * captures — i.e. the capture branch forwards on the same not-null/not-undefined test jest-cucumber
 * itself uses, not on a type test. A step with NO argument still receives ONLY its captures.
 *
 * MECHANISM OF THE TEST. This drives the REAL surface end to end: a real .feature file, the real
 * Fusion(), the real jest-cucumber port. Nothing is faked — a fake of the port is exactly what would
 * have hidden this bug, because the bug lives in what the wrapper hands the port and in what the port
 * then hands back. The step under observation in each scenario records the ACTUAL arguments it was
 * called with (a rest param, so nothing is lost or coerced), and the Then asserts the recorded list
 * with `toStrictEqual` — which pins VALUE, POSITION and COUNT in one assertion. No `toBeDefined()`,
 * no "does not throw": a rocket that never launched must not pass here.
 *
 * COUNTERFEIT FIXES, AND THE SCENARIO THAT KILLS EACH:
 *   push the argument unconditionally            -> a no-argument step gains a phantom `null`
 *                                                   -> killed by "does not receive a phantom extra argument"
 *   drop `Array.isArray` but keep `.length > 0`  -> a non-empty docstring arrives, an EMPTY one is
 *                                                   still dropped ("" is falsy)
 *                                                   -> killed by "receives empty incident notes"
 *   push the argument BEFORE the captures        -> killed by the ordered toStrictEqual in every scenario
 *   special-case strings and break arrays        -> killed by "receives the crew table"
 *   make the whole thing pass-through and lose
 *   the captures                                 -> killed by every scenario (captures are asserted too)
 *
 * CURRENT STATUS (against unfixed src/index.js):
 *   RED   — "receives the incident notes attached to it" (the defect: the docstring is dropped)
 *   RED   — "receives empty incident notes attached to it" (the same defect, empty-string shape)
 *   GREEN — "matched on its exact wording" (the CONTROL: pass-through branch, already correct — the
 *           fix must not regress it)
 *   GREEN — "a step of an outline ..." x2 rows (the CONTROL for the OTHER pass-through branch, the
 *           outline one — also already correct, and the shape most exposed to a fix that rewires how
 *           captures are collected)
 *   GREEN — "receives the crew table" (the shape the Array.isArray guard was written for)
 *   GREEN — "does not receive a phantom extra argument" (the counterfeit trap)
 */

const { Before, When, Then, Fusion } = require("../../../../src");

// The arguments the step under observation was ACTUALLY called with. A rest param records them
// exactly as they arrived — count and order included — so the Then can assert the whole list rather
// than picking at one that happens to be there.
let argumentsTheStepReceived;

Before(() => {
  argumentsTheStepReceived = null;
});

const recordTheArguments = (...argumentsGivenToTheStep) => {
  argumentsTheStepReceived = argumentsGivenToTheStep;
};

// Matched by a pattern WITH a capture, and carrying a docstring: the capture-injection branch
// (src/index.js:470-483) — where the docstring is dropped today.
When(
  /^I file an incident for rocket "(.+)" with the following notes:$/,
  recordTheArguments
);

// Matched by its exact wording — a plain STRING matcher, so the pass-through branch
// (src/index.js:448-457). The CONTROL: the same docstring, delivered correctly today.
When(
  "I file an incident for the flagship rocket with the following notes:",
  recordTheArguments
);

// Matched by a pattern WITH captures, and carrying a data table: the capture-injection branch again,
// on the one argument shape it does forward. Non-regression.
When(/^I assign (\d+) crew to rocket "(.+)":$/, recordTheArguments);

// Matched by a pattern WITH a capture, carrying NOTHING. The counterfeit trap: the step must receive
// its capture and nothing else — no phantom `null` appended.
When(/^I ground rocket "(.+)"$/, recordTheArguments);

Then(
  /^the incident step should have received the rocket "(.+)" and then the notes "(.+)"$/,
  (rocket, notes) => {
    // THE DEFECT, pinned: the capture AND the docstring, in that order, and nothing else. Today the
    // recorded list is ["Falcon"] — the docstring never arrives.
    expect(argumentsTheStepReceived).toStrictEqual([rocket, notes]);
  }
);

Then(
  /^the flagship incident step should have received only the notes "(.+)"$/,
  (notes) => {
    // CONTROL: on the pass-through branch jest-cucumber hands the docstring over itself
    // (feature-definition-creation.js:129-130), so it already arrives as the sole argument. Green
    // today; the fix must keep it green — and must not start double-delivering it.
    expect(argumentsTheStepReceived).toStrictEqual([notes]);
  }
);

Then(
  /^the crew step should have received the count "(\d+)" and the rocket "(.+)" and then the crew table$/,
  (crewCount, rocket) => {
    // NON-REGRESSION: the array shape the Array.isArray guard was written for. Captures first, then
    // the table. A fix that forwards docstrings by special-casing strings must not lose this.
    expect(argumentsTheStepReceived).toStrictEqual([
      crewCount,
      rocket,
      [
        { Name: "Ada", Role: "pilot" },
        { Name: "Grace", Role: "engineer" },
      ],
    ]);
  }
);

Then(
  /^the grounding step should have received only the rocket "(.+)"$/,
  (rocket) => {
    // NEGATIVE / counterfeit trap: a step with no Gherkin argument gets its captures and NOTHING
    // else. `toStrictEqual` fails on a trailing null or undefined, so a fix that pushes the argument
    // unconditionally — the laziest way to make the RED scenarios pass — dies right here.
    expect(argumentsTheStepReceived).toStrictEqual([rocket]);
  }
);

Then(
  /^the incident step should have received the rocket "(.+)" and then empty notes$/,
  (rocket) => {
    // THE DEFECT again, in the shape that discriminates the sloppy fix from the correct one. Gherkin
    // parses an empty docstring to "" (verified against jest-cucumber 4.5.0's parser), which is a
    // STRING and therefore must be forwarded — but it is FALSY, so a fix that merely deletes
    // `Array.isArray(stepArgs) &&` and keeps `stepArgs.length > 0` still drops it. jest-cucumber's own
    // test is `!== undefined && !== null`; nothing weaker matches it.
    expect(argumentsTheStepReceived).toStrictEqual([rocket, ""]);
  }
);

Then(
  /^the outline incident step should have received the rocket "(.+)" and then its own notes$/,
  (rocket) => {
    // NON-REGRESSION on the THIRD branch — the outline pass-through (src/index.js:461-468). The
    // matcher here is the SAME definition the first scenario registered; only the branch differs,
    // because an outline's TEMPLATE step text still holds `<...>`, so `/<.*>/.test(scenarioSentence)`
    // sends it to the pass-through wrapper and jest-cucumber delivers the argument itself.
    //
    // Two things are pinned per example row:
    //   (a) the docstring ARRIVES on this branch at all — the contrast that makes L3 a branch-asymmetry
    //       defect rather than a flat one;
    //   (b) it arrives SUBSTITUTED for THIS row: Gherkin replaces `<rocket>` inside docstring content
    //       on an outline (parsed-feature-loading.js:110-116), so the Falcon row must receive
    //       "Falcon shut down..." and the Vega row "Vega shut down...". A fix that pre-captured one
    //       row's argument for every row, or that let the raw "<rocket>" through unsubstituted, dies
    //       here.
    // This is the shape most exposed to the alternative fix (delete the hand-rolled capture list and
    // let jest-cucumber re-capture per row): that route changes outline behaviour, and nothing else in
    // the suite watches a docstring on an outline.
    expect(argumentsTheStepReceived).toStrictEqual([
      rocket,
      `${rocket} shut down engine 3 at T+42 seconds`,
    ]);
  }
);

Fusion("../l3-step-argument-delivery.feature");
