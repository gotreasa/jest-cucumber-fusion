/**
 * Regression test — H1: regex first-match shadowing.
 * RCA: docs/feature/review-hardening/discuss/rca.md (H1, HIGH — only silent-wrong-result bug).
 *
 * findMatchingStep (src/index.js:168-188) uses Object.keys(...).find(...) → the FIRST
 * registered definition that matches a step wins. Register a broad regex before a specific
 * one for the same keyword and the broad (wrong) handler is bound silently with the wrong
 * captured args; jest-cucumber's re-validation is still satisfied, so the scenario passes.
 * jest-cucumber's own automatic binding raises an ambiguity error here — this wrapper
 * suppresses it.
 *
 * LOCKED FIX CONTRACT (DELIVER implements; this test asserts it): when MORE THAN ONE step
 * definition matches a step, Fusion must THROW an ambiguity error (naming the step text /
 * competing matchers) rather than silently taking the first.
 *
 * MECHANISM / caveat: the wrapper's step matching (findMatchingStep) runs inside the scenario
 * callback that Fusion hands to jest-cucumber's defineFeature — it is NOT reachable
 * synchronously through Fusion's return value, and an ambiguous feature can never resolve to
 * a green jest-cucumber scenario (post-fix it throws by design). So we drive the REAL wrapper
 * (Fusion + real src/index.js) and substitute ONLY the external collaborator jest-cucumber
 * (the non-deterministic test-runner port) with a double that captures the scenario callback,
 * then invoke that callback synchronously and assert it throws. This is the "drive the SUT
 * through its public surface, fake only external ports" mandate applied to this JS wrapper.
 *
 * CURRENT STATUS: RED — findMatchingStep does not throw on ambiguity, so the captured callback
 * completes without error and toThrow fails ("received function did not throw").
 */

const mockState = { capturedCallback: null, feature: null };

jest.mock("jest-cucumber", () => ({
  loadFeature: jest.fn(() => mockState.feature),
  defineFeature: jest.fn((feature, callback) => {
    mockState.capturedCallback = callback;
  }),
}));

const { Given, Fusion } = require("../../../../src");

// Broad definition registered FIRST — this is the one that shadows.
Given(/^I have (.*)$/, () => {});
// Specific definition registered SECOND — the handler the author actually intends.
Given(/^I have (\d+) apples$/, () => {});

describe("H1 — ambiguous step definitions", () => {
  test("a step matching two definitions is rejected as ambiguous, not silently shadowed", () => {
    // The feature file is never read (loadFeature is faked); this is the parsed shape the
    // wrapper consumes. The step "I have 3 apples" matches BOTH definitions above.
    mockState.feature = {
      title: "Ambiguous step matching",
      scenarios: [
        {
          title: "counting apples",
          steps: [
            {
              keyword: "given",
              stepText: "I have 3 apples",
              stepArgument: undefined,
            },
          ],
        },
      ],
      scenarioOutlines: [],
    };

    // Drive the real wrapper; the faked jest-cucumber captures the scenario callback.
    Fusion("../ambiguous-step-shadowing.feature");

    const runScenarioMatching = () => {
      // capturedCallback = (testFn) =>
      //   matchJestTestSuiteWithCucumberFeature(scenarios, beforeEach, afterEach, testFn)
      mockState.capturedCallback((_title, scenarioBody) => {
        // scenarioBody performs the wrapper's step matching (findMatchingStep) synchronously.
        scenarioBody({
          given: () => {},
          when: () => {},
          then: () => {},
          and: () => {},
          but: () => {},
        });
      });
    };

    // Locked contract: ambiguity must throw. Pre-fix this does NOT throw (silent first-match).
    // Match the full contract signature (not a loose /ambig/i) so an incidental "ambiguous"
    // in some unrelated error can't satisfy the assertion.
    expect(runScenarioMatching).toThrow(
      /Ambiguous step definition.*matches \d+ step definitions/i
    );
  });
});
