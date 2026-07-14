/**
 * Regression test — L4: escaped parentheses in a step matcher crash a scenario outline.
 * Backlog: docs/feature/review-hardening/plan.md (L4). NOT in the original RCA — found on the real
 * surface by the user-examiner (2026-07-13), and VERIFIED PRE-EXISTING: reproduced identically with
 * and without the L2 fix (a3b6c3e and b69b6a3), so it is not a regression from recent work.
 *
 * THE DEFECT. A step matcher whose source contains ESCAPED parens — `/I call the function (\w+\(\))/`,
 * i.e. "capture a word followed by a literal ()" — blows the whole suite up with an uncaught
 *     TypeError: Cannot read properties of null (reading 'index')
 * at src/index.js:337, reached via findMatchingStep -> isFunctionForScenario ->
 * isPotentialStepFunctionForScenario. The IDENTICAL matcher against a PLAIN scenario works fine (the
 * CONTROL below pins that), so the crash is specific to the outline path.
 *
 * MECHANISM — the guard tests one variable and dereferences ANOTHER (src/index.js:324-338).
 * Two execs of the same group-locator run against two DIFFERENT strings:
 *   regEscapedStepFunc — exec'd on the source with `\(`/`\)` UNESCAPED to bare parens;
 *   regStepFuncLeft    — exec'd on the RAW source.
 * The guard then reads:  if (regStepFuncLeft && regEscapedStepFunc.index == ...)
 * — truthiness checked on regStepFuncLeft, `.index` read off regEscapedStepFunc. Nothing forces the
 * two to be null together, and escaped parens are exactly the shape that splits them. Executed proof
 * for `/I call the function (\w+\(\))/`:
 *   raw source        "I call the function (\w+\(\))"  -> regStepFuncLeft    = "(\)"  at index 25  (truthy)
 *   unescaped source  "I call the function (\w+())"    -> regEscapedStepFunc = null
 * The locator's character class holds no `(`, so on the raw source it can still close a group across
 * the backslash ("(\)"), while on the unescaped source the inner "()" leaves no class character
 * between the parens and it matches nothing at all. regStepFuncLeft passes the guard, regEscapedStepFunc
 * is null, `.index` throws.
 *
 * LOCKED FIX CONTRACT (asserted here). A step matcher containing escaped parentheses must bind inside
 * a scenario outline exactly as it already does in a plain scenario, and the bound step must then run
 * ONCE PER EXAMPLE ROW with THAT ROW'S OWN value. Both halves are load bearing and are asserted
 * separately, because they fail apart: a fix that merely null-guards the dereference stops the crash
 * (half i) while leaving the definition unbound (half ii) — the outline is then reported as having no
 * step definition, which is what the NEGATIVE test's second trap catches. The fix that landed does not
 * null-guard: it removes the disagreement, locating the group over a MASKED source so an escaped paren
 * can never be read as a group boundary at all.
 *
 * MECHANISM OF THE TEST: drive the REAL wrapper (Given + Fusion + real src/index.js) and fake ONLY
 * the external jest-cucumber port, as l2/m3 do. No src internals are stubbed. Observation points, both
 * on the library's own surface:
 *   - jest-cucumber's `given` verb: the wrapper calls verb(expression, fn) ONLY once findMatchingStep
 *     has FOUND a definition (src/index.js:222-232), so a verb call is the witness that the definition
 *     bound, and the matcher it was handed is the contract the fix must honour.
 *   - the wrapper's own unmatched-step error under `{ errors: false }` (src/index.js:222-224, the M5
 *     fix): the library's loud, self-owned signal that a step was treated as undefined.
 * The faked feature mirrors jest-cucumber 4.5.0's real parsed shape: a scenario outline carries the
 * TEMPLATE steps (placeholder intact — this is what the wrapper matches definitions against) alongside
 * the concrete example scenarios (parsed-feature-loading.js:145-154). And the real runner collects the
 * step matchers ONCE from the template, then defines one jest test PER EXAMPLE ROW, each re-matching
 * THAT ROW'S concrete step text against the handed-over matcher and spreading matches.slice(1) into the
 * step function (feature-definition-creation.js:113-131, 205-212) — which is exactly what
 * runOutlineRowsAsJestCucumberWould replays below. That fidelity is what makes half (ii) real: a fix
 * that bound a rewritten matcher, or that pre-captured one row's value for every row, fails here.
 *
 * CURRENT STATUS: GREEN. Authored RED against the unfixed wrapper (the outline crashed with the
 * TypeError above before any binding was attempted) and turned green by the fix. Now the standing
 * guard, and its discrimination was verified against BOTH failure modes before being handed over:
 *   - pre-fix code                -> RED, crashedOnTheNullDereference: true
 *   - crash-only null-guard       -> RED, treatedAsHavingNoDefinition: true
 *     (i.e. `regEscapedStepFunc &&` bolted onto the guard: the TypeError is silenced, the definition
 *     still never binds, and the wrapper reports `No step definition matches: "I call the function
 *     <func>"`. A test that only asserted "does not crash" would have PASSED that counterfeit.)
 * The CONTROL (the same matcher, plain scenario) was GREEN before the fix and stays green: the fix may
 * not buy the outline case by breaking the plain one.
 */

const mockState = { feature: null, verbs: null };

jest.mock("jest-cucumber", () => ({
  loadFeature: jest.fn(() => mockState.feature),
  defineFeature: jest.fn((feature, scenariosDefinitionCallback) => {
    // Real jest-cucumber runs the scenarios callback synchronously (inside describe), and each
    // scenario's steps callback synchronously within it. Model exactly that, so all step matching
    // completes inside Fusion().
    scenariosDefinitionCallback((_scenarioTitle, stepsDefinitionCallback) => {
      stepsDefinitionCallback(mockState.verbs);
    });
  }),
}));

const givenStep = (stepText) => ({
  keyword: "given",
  stepText,
  stepArgument: undefined,
});

// A one-step scenario outline in jest-cucumber's parsed shape: `steps` holds the TEMPLATE step (the
// <placeholder> still in place — what the wrapper matches definitions against), while `scenarios`
// holds one concrete scenario per example row (what jest-cucumber actually runs).
const outlineFeature = (templateStepText, concreteStepTexts) => ({
  title: "L4 escaped parens in an outline",
  scenarios: [],
  scenarioOutlines: [
    {
      title: "Function with parens in step text",
      steps: [givenStep(templateStepText)],
      scenarios: concreteStepTexts.map((concreteStepText, row) => ({
        title: `Function with parens in step text (example ${row + 1})`,
        steps: [givenStep(concreteStepText)],
      })),
    },
  ],
});

// The same step, as a PLAIN scenario — no outline, no placeholder. This is the shape that already
// works today, and the CONTROL pins it.
const plainFeature = (concreteStepText) => ({
  title: "L4 escaped parens in a plain scenario",
  scenarios: [
    {
      title: "Function with parens in step text",
      steps: [givenStep(concreteStepText)],
    },
  ],
  scenarioOutlines: [],
});

// Load a feature through the REAL Fusion; the faked port returns the feature staged here.
const fuse = (Fusion, feature, options) => {
  mockState.feature = feature;
  Fusion(`${feature.title}.feature`, options);
};

// Replay the bound step the way jest-cucumber really runs an outline: the matcher is collected ONCE
// from the template step, then each example row re-matches ITS OWN concrete step text against that
// matcher and spreads matches.slice(1) into the step function
// (node_modules/jest-cucumber/dist/src/feature-definition-creation.js:120-131, 205-212).
const runOutlineRowsAsJestCucumberWould = (givenVerb, concreteStepTexts) => {
  const [boundMatcher, boundStepFn] = givenVerb.mock.calls[0];
  concreteStepTexts.forEach((concreteStepText) => {
    const matches = concreteStepText.match(boundMatcher);
    boundStepFn(...(matches ? matches.slice(1) : []));
  });
};

// Load the feature ONCE under the wrapper's loud unmatched-step detection, and return the message
// that escaped ("" if nothing did). `{ errors: false }` disables jest-cucumber's own step-count
// validation, which makes the WRAPPER the loud gate on an unmatched step (src/index.js:222-224, the
// M5 fix); its error names the step it could not match, so the message is a precise witness of "this
// step was treated as undefined".
//
// ONE invocation, one captured outcome — deliberately NOT a thunk handed to several
// `expect().not.toThrow()` calls. Each `.not.toThrow()` INVOKES the thunk, and Fusion() now resets
// the step registry unconditionally (src/index.js:156-161, the M3 fix), so a second invocation would
// run against an EMPTY registry and report `No step definition matches` no matter how correct the
// wrapper is — an assertion that can never pass. Capturing a single outcome removes the ordering
// question entirely.
const messageEscapingFusion = (Fusion, feature) => {
  try {
    fuse(Fusion, feature, { errors: false });
    return "";
  } catch (escaped) {
    return escaped.message;
  }
};

describe("L4 — a step matcher with escaped parentheses in a scenario outline", () => {
  // "capture a word followed by a literal ()" — the escaped parens are the whole defect.
  const FUNCTION_CALL = /^I call the function (\w+\(\))$/;
  const TEMPLATE = "I call the function <func>";
  const ROWS = [
    "I call the function process()",
    "I call the function validate()",
  ];

  beforeEach(() => {
    jest.resetModules();
    mockState.feature = null;
    mockState.verbs = {
      given: jest.fn(),
      when: jest.fn(),
      then: jest.fn(),
      and: jest.fn(),
      but: jest.fn(),
    };
  });

  test("the definition binds the outline step, and the step runs once per example row with that row's own value", () => {
    const { Given, Fusion } = require("../../../../src");
    const stepFn = jest.fn();
    Given(FUNCTION_CALL, stepFn);

    // Before the fix this line never returned: the guard dereferenced a null regEscapedStepFunc and
    // the TypeError escaped Fusion(), taking the suite with it.
    fuse(Fusion, outlineFeature(TEMPLATE, ROWS));

    // (i) NO CRASH — and the definition was FOUND: the verb is called only for a step whose
    // definition matched (src/index.js:222-232).
    expect(mockState.verbs.given).toHaveBeenCalledTimes(1);
    // ...and it is handed the definition's OWN regex, so jest-cucumber can still capture from it per
    // row. A "fix" that bound a rewritten matcher would fail here.
    expect(mockState.verbs.given).toHaveBeenCalledWith(
      FUNCTION_CALL,
      expect.any(Function)
    );

    // (ii) IT ACTUALLY BINDS: the bound step runs once per example row, and each row's OWN value
    // arrives in the step function. A fix that null-guards the crash but leaves the step unbound
    // never reaches this (the verb was never called); a fix that binds but pre-captures a single
    // row's value for every row fails the per-row assertions.
    runOutlineRowsAsJestCucumberWould(mockState.verbs.given, ROWS);

    expect(stepFn).toHaveBeenCalledTimes(2);
    expect(stepFn).toHaveBeenNthCalledWith(1, "process()");
    expect(stepFn).toHaveBeenNthCalledWith(2, "validate()");
  });

  test("NEGATIVE — the outline step is not crashed on, and is not treated as having no definition", () => {
    const { Given, Fusion } = require("../../../../src");
    Given(FUNCTION_CALL, () => {});

    const escaped = messageEscapingFusion(
      Fusion,
      outlineFeature(TEMPLATE, ROWS)
    );

    // Two DISTINCT wrong outcomes, both armed, asserted as one object so a failure names which one
    // fired and prints the message verbatim (a chain of separate expects would short-circuit on the
    // first and hide the second):
    //   crashedOnTheNullDereference — the pre-fix behaviour: an uncaught TypeError out of the step
    //     matcher (src/index.js, the guard that tested one variable and dereferenced another).
    //   treatedAsHavingNoDefinition — what a lazy crash-only null-guard would buy: the throw is gone
    //     but the definition never binds, so the wrapper reports
    //     `No step definition matches: "I call the function <func>"`. This trap is the whole reason
    //     the NEGATIVE test is not redundant with the positive one.
    // `escapedMessage: ""` is the blanket: nothing else may escape Fusion() either.
    expect({
      crashedOnTheNullDereference: /Cannot read properties of null/.test(
        escaped
      ),
      treatedAsHavingNoDefinition: /No step definition matches/.test(escaped),
      escapedMessage: escaped,
    }).toEqual({
      crashedOnTheNullDereference: false,
      treatedAsHavingNoDefinition: false,
      escapedMessage: "",
    });
  });

  test("CONTROL — the same matcher in a PLAIN scenario binds and runs with the step's value (green today; must stay green)", () => {
    const { Given, Fusion } = require("../../../../src");
    const stepFn = jest.fn();
    // Byte-for-byte the matcher that crashes the outline above. On the plain path isFunctionForScenario
    // never reaches isPotentialStepFunctionForScenario (src/index.js:272-279), so the null deref is
    // never executed and this already works. The fix must not trade this away to buy the outline.
    Given(FUNCTION_CALL, stepFn);

    fuse(Fusion, plainFeature("I call the function test()"));

    expect(mockState.verbs.given).toHaveBeenCalledTimes(1);
    runOutlineRowsAsJestCucumberWould(mockState.verbs.given, [
      "I call the function test()",
    ]);
    expect(stepFn).toHaveBeenCalledWith("test()");
  });
});
