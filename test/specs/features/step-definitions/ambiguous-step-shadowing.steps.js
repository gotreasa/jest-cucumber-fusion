/**
 * Regression test — H1: regex first-match shadowing.
 * RCA: docs/feature/review-hardening/discuss/rca.md (H1, HIGH — only silent-wrong-result bug).
 *
 * findMatchingStep used Object.keys(...).find(...) → the FIRST registered definition that
 * matches a step wins. Register a broad regex before a specific one for the same keyword and
 * the broad (wrong) handler is bound silently with the wrong captured args, and the scenario
 * still passes.
 *
 * LOCKED FIX CONTRACT (DELIVER implements; this test asserts it): when MORE THAN ONE step
 * definition matches a step, Fusion must THROW an ambiguity error (naming the step text /
 * competing matchers) rather than silently taking the first.
 *
 * MECHANISM: drive the REAL wrapper (Fusion + real src/index.js) and substitute BOTH driven
 * ports — src/feature-source.js stages the feature that used to be staged through the external
 * intermediary, and src/test-registration.js is doubled on the half that models its
 * SYNCHRONOUS collection: the real port binds every step of every scenario through
 * src/step-matching before it registers anything, so the double does the same by calling the
 * real src/step-matching. The ambiguity refusal under observation is therefore production
 * code, raised where production raises it — on the way out of Fusion(), at collection.
 *
 * CURRENT STATUS: GREEN (guard) — authored RED, when findMatchingStep did not throw on
 * ambiguity and the first matching definition was bound silently.
 */

import { jest } from "@jest/globals";
// Not doubled, so the static import is the real matcher.
import { findMatchingStep } from "../../../../src/step-matching.js";

const mockState = { feature: null, boundSteps: null };

// Registered before Fusion is imported: a static import would load the real ports first.
jest.unstable_mockModule("../../../../src/feature-source.js", () => ({
  resolveFeaturePath: jest.fn((featureFileToLoad) => {
    // The real port always answers with an absolute path; so does this one.
    expect(typeof featureFileToLoad).toBe("string");
    return `/staged/${featureFileToLoad}`;
  }),
  loadFeature: jest.fn(() => mockState.feature),
}));

jest.unstable_mockModule("../../../../src/test-registration.js", () => ({
  registerFeature: jest.fn((loadedFeature, featureRegistry) => {
    // Model the real port faithfully: bind every step up front, through the real matcher,
    // before anything is registered.
    expect(loadedFeature).toBeDefined();
    expect(featureRegistry).toBeDefined();

    loadedFeature.scenarios.forEach((scenario) =>
      scenario.steps.forEach((step) =>
        mockState.boundSteps.push(findMatchingStep(featureRegistry, step)),
      ),
    );
  }),
}));

const { Given, Fusion } = await import("../../../../src/index.js");

// Broad definition registered FIRST — this is the one that shadows.
Given(/^I have (.*)$/, () => {});
// Specific definition registered SECOND — the handler the author actually intends.
Given(/^I have (\d+) apples$/, () => {});

describe("H1 — ambiguous step definitions", () => {
  test("a step matching two definitions is rejected as ambiguous, not silently shadowed", () => {
    mockState.boundSteps = [];
    // The feature file is never read (the feature-source port is doubled); this is the loaded
    // shape the wrapper consumes. The step "I have 3 apples" matches BOTH definitions above.
    mockState.feature = {
      title: "Ambiguous step matching",
      scenarios: [
        {
          title: "counting apples",
          steps: [
            {
              keyword: "given",
              stepText: "I have 3 apples",
              stepArgument: null,
            },
          ],
        },
      ],
    };

    // Locked contract: ambiguity must throw, on the way out of Fusion(), at collection. Match
    // the full contract signature (not a loose /ambig/i) so an incidental "ambiguous" in some
    // unrelated error cannot satisfy the assertion.
    expect(() => Fusion("../ambiguous-step-shadowing.feature")).toThrow(
      /Ambiguous step definition.*matches \d+ step definitions/i,
    );

    // NEGATIVE: neither competing definition was bound. Shadowing IS binding one of them, so a
    // refusal that still bound the first would be the defect wearing a louder coat.
    expect(mockState.boundSteps).toEqual([]);
  });
});
