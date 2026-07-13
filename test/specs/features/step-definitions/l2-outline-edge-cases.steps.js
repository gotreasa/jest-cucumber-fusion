/**
 * Regression test — L2: scenario-outline matching edge cases.
 * RCA: docs/feature/review-hardening/discuss/rca.md (L2, LOW).
 *
 * L2 named THREE sub-defects. Two were real and reachable through the public surface and are
 * pinned below; the third was a FALSE POSITIVE and is deliberately NOT tested (evidence below).
 * Both real ones are now FIXED — these tests were authored RED and are the standing guards.
 *
 * (a) REAL, FIXED — LITERAL CAPTURING GROUP AT A FIXED POSITION.
 *     When an outline step is matched, isPotentialStepFunctionForScenario consumes the step regex
 *     placeholder-by-placeholder and hands whatever is LEFT OVER to
 *     evaluateStepFuncEndVsScenarioEnd. That function USED to treat the leftover as a regex only
 *     if it held a capturing group containing one of [sSdDwWbB*]; otherwise it fell back to a
 *     plain string `endsWith`. A literal alternation group in the FIXED part of the step —
 *     `(on|off)` — holds none of those characters, so " lamp is (on|off)".endsWith(" lamp is on")
 *     === false and the definition never bound. The discriminator was nothing but the group's
 *     SPELLING: the identically shaped `(on|down)` (a 'd' and a 'w') took the regex branch and
 *     bound — see the CONTROL test. FIX: `holdsCapturingGroup` recognises a real capturing group
 *     by its PRESENCE rather than its spelling.
 *
 * (c) REAL, FIXED — DIGIT-CLASS TYPO `0` vs `0-9` IN THE OUTLINE DETECTOR.
 *     The regex that locates a capturing group inside the step definition spelled its character
 *     class `[a-zA-Z0!|,:?*+.^=${}><\\-]` — the digit `0` alone, where `0-9` was meant. So it
 *     could not span a group whose source contains a digit 1-9:
 *         /\([a-zA-Z0!|,:?*+.^=${}><\\-]+\)/.exec("the access code is (\\d{4})")  -> null
 *         /\([a-zA-Z0-9!|,:?*+.^=${}><\\-]+\)/.exec("the access code is (\\d{4})") -> "(\d{4})"
 *     The group went undetected, the placeholder was never reconciled against it, and the
 *     definition never bound. Braces were NOT the cause — `{` and `}` are both in the class, and
 *     `(\d{0})` was detected; only the digit 1-9 broke it. Every bounded quantifier was therefore
 *     unreachable in an outline: `(\d{4})` failed where `(\d+)` bound (CONTROL test). FIX: the
 *     class carries `0-9`.
 *
 * (b) REJECTED — GREEDY /<.*>/ (src/index.js:426) is not an L2 defect; no test written.
 *     The rejection is narrow and is ONLY about CAPTURE ARGUMENTS. It is not a claim that the two
 *     branches are equivalent in general — they are not (see the docstring difference below).
 *
 *     The greedy test really does fire on a plain scenario step whose text merely CONTAINS angle
 *     brackets (e.g. "the token is '<not an outline var>' with amount 42" — a strict /<[\w]*>/
 *     would not fire, the greedy one does), and it really does skip the wrapper's own capture
 *     injection. But it skips it in favour of handing the RegExp to jest-cucumber, which then
 *     re-matches that same regex against that same step text at run time and spreads
 *     matches.slice(1) into the step function
 *     (node_modules/jest-cucumber/dist/src/feature-definition-creation.js:120-131). So on CAPTURES
 *     — and only on captures — the two branches deliver identically. Executed proof: such a step
 *     still receives its capture ("42") and its data table ([{ fruit: "apple" }]). There is no
 *     user-visible wrong behaviour on captures to encode, so a test here would pin an internal
 *     branch rather than an outcome. RCA's "benign today" stands, at that scope.
 *
 *     The branches DO differ on DOCSTRINGS, and that difference is a separate REAL bug — in the
 *     INJECTION path, not in the greedy test. injectVariable appends a step argument only when
 *     `Array.isArray(stepArgs)` (src/index.js:441), and a docstring is a string, so the injection
 *     path silently DROPS it while the pass-through branch forwards it (observed: `undefined` vs
 *     "hello world"). That is tracked as backlog item L3 in docs/feature/review-hardening/plan.md.
 *     It is not an L2 concern and is deliberately NOT tested here — L2's scope is not widened.
 *
 * LOCKED FIX CONTRACT (asserted here): a scenario-outline step must bind its step definition
 * whatever the SPELLING of the capturing groups in that definition — a literal alternation group
 * sitting in the fixed part of the step, and a bounded-quantifier group, must both match, and the
 * bound step must then run with the example row's values. The CONTROL tests pin the cases that
 * already worked, so a fix may not trade one for the other.
 *
 * MECHANISM: drive the REAL wrapper (Given + Fusion + real src/index.js) and fake ONLY the
 * external jest-cucumber port, as m1/m3/m5 do. No src internals are stubbed. Two observation
 * points, both belonging to the library's own surface:
 *   - jest-cucumber's `given` verb: the wrapper calls verb(expression, fn) ONLY once
 *     findMatchingStep has FOUND a definition (src/index.js:222-232), so a verb call is the
 *     witness that the definition bound, and the arguments it was called with are the contract
 *     the fix must honour.
 *   - the wrapper's own unmatched-step error under `{ errors: false }` (src/index.js:222-224,
 *     the M5 fix): the library's loud, self-owned signal that a step was treated as undefined.
 *     That is the NEGATIVE assertion — the wrong behaviour must not be produced.
 * The faked feature mirrors jest-cucumber's real parsed shape: a scenario outline carries the
 * TEMPLATE steps (placeholder intact) alongside the concrete example scenarios
 * (node_modules/jest-cucumber/dist/src/parsed-feature-loading.js:146-151), and a bound step is
 * invoked with the CONCRETE step text re-matched against the handed-over matcher
 * (node_modules/jest-cucumber/dist/src/feature-definition-creation.js:120-131).
 *
 * The production symptom was loud, and was reproduced end-to-end against real jest-cucumber with
 * real .feature files before these tests were written — both (a) and (c) blew the suite up at
 * collection with jest-cucumber's own validation:
 *     Scenario "Lamp colour" has 1 step(s) in the feature file, but 0 step definition(s) defined.
 *
 * CURRENT STATUS: GREEN. Authored RED against the unfixed wrapper (the definition never bound, so
 * the `given` verb was never called and the step was reported as having no definition) and turned
 * green by the fix. They are now the regression guards: (a) and (c) have INDEPENDENT
 * discriminators and were fixed by two INDEPENDENT edits, so the "(a)+(c) crossover" block below
 * guards the shapes that straddle both — a future narrowing of either fix must not pass here.
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

// A one-step scenario outline in jest-cucumber's parsed shape: `steps` holds the TEMPLATE step
// (the <placeholder> still in place — this is what the wrapper matches definitions against),
// while `scenarios` holds the concrete example rows (what jest-cucumber runs).
const outlineFeature = (templateStepText, concreteStepText) => ({
  title: "L2 outline edge cases",
  scenarios: [],
  scenarioOutlines: [
    {
      title: "an outline",
      steps: [
        {
          keyword: "given",
          stepText: templateStepText,
          stepArgument: undefined,
        },
      ],
      scenarios: [
        {
          title: "an outline (example row)",
          steps: [
            {
              keyword: "given",
              stepText: concreteStepText,
              stepArgument: undefined,
            },
          ],
        },
      ],
    },
  ],
});

// Load a feature through the REAL Fusion; the faked port returns the feature staged here.
const fuse = (Fusion, feature, options) => {
  mockState.feature = feature;
  Fusion(`${feature.title}.feature`, options);
};

// Run the step the wrapper bound, the way jest-cucumber runs it: re-match the CONCRETE
// (example-substituted) step text against the matcher the wrapper handed over, and spread
// matches.slice(1) into the step function.
const runBoundStepAsJestCucumberWould = (givenVerb, concreteStepText) => {
  const [boundMatcher, boundStepFn] = givenVerb.mock.calls[0];
  const matches = concreteStepText.match(boundMatcher);
  boundStepFn(...(matches ? matches.slice(1) : []));
};

// The wrapper is the loud gate on an unmatched step only when jest-cucumber's own validation is
// disabled (`{ errors: false }`, the M5 fix). Its error message names the step it could not
// match, which makes it a precise witness of "this step was treated as undefined".
const fusionUnderLoudUnmatchedStepDetection = (Fusion, feature) => () =>
  fuse(Fusion, feature, { errors: false });

describe("L2 — scenario-outline step matching", () => {
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

  describe("(a) a literal capturing group at a fixed position", () => {
    const TEMPLATE = "the <colour> lamp is on";
    const CONCRETE = "the red lamp is on";
    // `(on|off)` sits in the FIXED part of the step, not at the placeholder.
    const LAMP = /^the (\w+) lamp is (on|off)$/;

    test("the definition binds the outline step, and the step runs with the example row's values", () => {
      const { Given, Fusion } = require("../../../../src");
      const stepFn = jest.fn();
      Given(LAMP, stepFn);

      fuse(Fusion, outlineFeature(TEMPLATE, CONCRETE));

      // The verb is called only for a step whose definition was FOUND.
      expect(mockState.verbs.given).toHaveBeenCalledTimes(1);
      // ...and it must be bound with the definition's own regex, so jest-cucumber can still
      // capture from it. A "fix" that bound a rewritten matcher would fail here.
      expect(mockState.verbs.given).toHaveBeenCalledWith(
        LAMP,
        expect.any(Function)
      );

      runBoundStepAsJestCucumberWould(mockState.verbs.given, CONCRETE);
      expect(stepFn).toHaveBeenCalledWith("red", "on");
    });

    test("NEGATIVE — the outline step is not treated as having no definition", () => {
      const { Given, Fusion } = require("../../../../src");
      Given(LAMP, () => {});

      // Today the wrapper reports: No step definition matches: "the <colour> lamp is on".
      expect(
        fusionUnderLoudUnmatchedStepDetection(
          Fusion,
          outlineFeature(TEMPLATE, CONCRETE)
        )
      ).not.toThrow(/No step definition matches/);
    });

    test("CONTROL — the same shape binds today when the literal group happens to contain a detector character", () => {
      const { Given, Fusion } = require("../../../../src");
      const stepFn = jest.fn();
      // `(on|down)` differs from `(on|off)` only in spelling — its 'd' and 'w' are in the
      // [sSdDwWbB*] class at src/index.js:394, so the leftover takes the regex branch, not
      // endsWith. This is the case that already works; the fix must not trade it away.
      Given(/^the (\w+) lamp is (on|down)$/, stepFn);

      fuse(Fusion, outlineFeature(TEMPLATE, CONCRETE));

      expect(mockState.verbs.given).toHaveBeenCalledTimes(1);
      runBoundStepAsJestCucumberWould(mockState.verbs.given, CONCRETE);
      expect(stepFn).toHaveBeenCalledWith("red", "on");
    });
  });

  describe("(c) a bounded-quantifier capturing group", () => {
    const TEMPLATE = "the access code is <code>";
    const CONCRETE = "the access code is 1234";
    // `{4}` puts a digit 1-9 in the group's source, which the detector's char class cannot span.
    const ACCESS_CODE = /^the access code is (\d{4})$/;

    test("the definition binds the outline step, and the step runs with the example row's value", () => {
      const { Given, Fusion } = require("../../../../src");
      const stepFn = jest.fn();
      Given(ACCESS_CODE, stepFn);

      fuse(Fusion, outlineFeature(TEMPLATE, CONCRETE));

      expect(mockState.verbs.given).toHaveBeenCalledTimes(1);
      expect(mockState.verbs.given).toHaveBeenCalledWith(
        ACCESS_CODE,
        expect.any(Function)
      );

      runBoundStepAsJestCucumberWould(mockState.verbs.given, CONCRETE);
      expect(stepFn).toHaveBeenCalledWith("1234");
    });

    test("NEGATIVE — the outline step is not treated as having no definition", () => {
      const { Given, Fusion } = require("../../../../src");
      Given(ACCESS_CODE, () => {});

      // Today the wrapper reports: No step definition matches: "the access code is <code>".
      expect(
        fusionUnderLoudUnmatchedStepDetection(
          Fusion,
          outlineFeature(TEMPLATE, CONCRETE)
        )
      ).not.toThrow(/No step definition matches/);
    });

    test("CONTROL — the same shape binds today with an unbounded quantifier", () => {
      const { Given, Fusion } = require("../../../../src");
      const stepFn = jest.fn();
      // `(\d+)` holds no digit 1-9 in its source, so the detector spans it. Already works.
      Given(/^the access code is (\d+)$/, stepFn);

      fuse(Fusion, outlineFeature(TEMPLATE, CONCRETE));

      expect(mockState.verbs.given).toHaveBeenCalledTimes(1);
      runBoundStepAsJestCucumberWould(mockState.verbs.given, CONCRETE);
      expect(stepFn).toHaveBeenCalledWith("1234");
    });
  });

  // (a) and (c) have INDEPENDENT discriminators and were fixed by two independent edits: the
  // group-locator character class gained its digits (`0` -> `0-9`, src/index.js:320,327 — the (c)
  // seam), and evaluateStepFuncEndVsScenarioEnd gained holdsCapturingGroup (src/index.js:394-406 —
  // the (a) seam). Neither RED test above pins a shape that crosses the two, so nothing stops a
  // future narrowing of one fix on the argument that "the other detector already covers it".
  // These two GREEN controls are the standing guards on that crossover.
  describe("(a)+(c) crossover — standing guards", () => {
    test("CONTROL — a bounded quantifier whose group DOES hold a legacy-detector character still binds", () => {
      const { Given, Fusion } = require("../../../../src");
      const stepFn = jest.fn();
      // `(\w{4})` is a crossover: its `4` means only the widened `0-9` class can span it (the (c)
      // seam), yet its `w` is in the legacy [sSdDwWbB*] set — so it LOOKS like a shape the old
      // detector already handled, and it is not. Narrowing the digit fix to "only \d groups need
      // it" would silently unbind this.
      Given(/^the access code is (\w{4})$/, stepFn);

      fuse(
        Fusion,
        outlineFeature("the access code is <code>", "the access code is ab12")
      );

      expect(mockState.verbs.given).toHaveBeenCalledTimes(1);
      runBoundStepAsJestCucumberWould(
        mockState.verbs.given,
        "the access code is ab12"
      );
      expect(stepFn).toHaveBeenCalledWith("ab12");
    });

    test("CONTROL — a literal alternation holding NONE of the legacy-detector characters still binds", () => {
      const { Given, Fusion } = require("../../../../src");
      const stepFn = jest.fn();
      // `(v1|v2)` holds none of [sSdDwWbB*], so the legacy detector is blind to it and only
      // holdsCapturingGroup can see it (the (a) seam). It sits in the FIXED tail, which is the only
      // placement that actually reaches evaluateStepFuncEndVsScenarioEnd — a group at the
      // PLACEHOLDER is consumed earlier by the group-locator and would exercise the (c) seam
      // instead. Its digits also keep it outside the legacy set's reach entirely.
      Given(/^the (\w+) release is (v1|v2)$/, stepFn);

      fuse(
        Fusion,
        outlineFeature("the <channel> release is v1", "the beta release is v1")
      );

      expect(mockState.verbs.given).toHaveBeenCalledTimes(1);
      runBoundStepAsJestCucumberWould(
        mockState.verbs.given,
        "the beta release is v1"
      );
      expect(stepFn).toHaveBeenCalledWith("beta", "v1");
    });
  });
});
