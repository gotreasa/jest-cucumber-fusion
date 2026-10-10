/**
 * Regression test — M5: `errors:false` re-opens the silent-skip.
 * RCA: docs/feature/review-hardening/discuss/rca.md (M5, MED).
 *
 * Fusion used to forward `errors` to the intermediary. With `{ errors: false }` the
 * intermediary skipped ITS step-count validation — so the wrapper's own
 * `if (!foundMatchingStep) return;` became the only gate, and it dropped an unmatched step
 * silently (remaining args then index-shift).
 *
 * LOCKED FIX CONTRACT, as ruled: validation can be switched off, but never switched into
 * SILENCE. The defect this file was written against was silence — the step vanished and the
 * scenario passed. The cure is no longer a throw on the errors:false path: the scenario holding
 * the unbound step is registered as a SKIPPED test, under its own unannotated name, while the
 * scenarios that do bind keep running. With the check left on, the unmatched step is still a
 * refusal. Both halves are asserted below, because silence is reachable from either if the
 * wrong one is implemented.
 *
 * MECHANISM: drive the REAL wrapper (Fusion + real src/index.js) and substitute BOTH driven
 * ports — src/feature-source.js stages the feature that used to be staged through the external
 * intermediary, and src/test-registration.js is doubled on the half that models its
 * SYNCHRONOUS collection: the real port binds every step of every scenario and takes the
 * errors decision before it registers anything, so the double does the same by calling the
 * real src/step-matching and the real src/code-suggestion. No src internals are stubbed; what
 * decides is production code, and only the Jest globals are stood in for. One matching
 * definition is registered, so the miss is specifically the unmatched step, not an empty
 * registry.
 *
 * WHERE THE AUTHORITATIVE OBSERVATION LIVES: not here. That a skipped scenario is reported by
 * Jest as skipped and never as passed is read from Jest's own report by the acceptance-owned
 * test/specs/baseline/assert-validation-report.js, over real consumer fixture files. This file
 * is the seam-level half: that Fusion routes the scenario to the skip rather than refusing,
 * and that it binds nothing while doing so.
 *
 * CURRENT STATUS: GREEN (guard) — authored RED, when the unmatched step was silently skipped
 * and the scenario body completed without throwing.
 */

import { jest } from "@jest/globals";
// Not doubled, so the static imports are the real collaborators.
import { findMatchingStep } from "../../../../src/step-matching.js";
import { unmatchedStepRefusal } from "../../../../src/code-suggestion.js";

const mockState = { feature: null, boundSteps: null, skippedScenarios: null };

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
  registerFeature: jest.fn((loadedFeature, featureRegistry, options) => {
    // Model the real port faithfully, in the three moves that matter here: it binds every step
    // of every scenario up front through src/step-matching, which now REPORTS an unbound step
    // instead of throwing on it; then, with the step check on, it raises the one refusal built
    // by src/code-suggestion.js before registering anything; and with the check off it
    // registers the scenarios holding unbound steps as skipped tests instead.
    //
    // Both collaborators are the real modules, so what is observed below is production code
    // deciding — the double only stands in for the Jest globals.
    expect(loadedFeature).toBeDefined();
    expect(featureRegistry).toBeDefined();
    expect(options).toBeDefined();
    expect(typeof options.errors.stepsMustMatchFeatureFile).toBe("boolean");

    const scenarios = loadedFeature.scenarios.map((scenario) => ({
      title: scenario.title,
      unboundSteps: scenario.steps.filter((step) => {
        const result = findMatchingStep(featureRegistry, step);
        if (result.isBound) mockState.boundSteps.push(result);
        return !result.isBound;
      }),
    }));

    const unboundSteps = scenarios.flatMap((scenario) => scenario.unboundSteps);

    // The decision, in the real port's order: refuse for the whole feature first, and only
    // register anything when the check is off.
    if (unboundSteps.length > 0 && options.errors.stepsMustMatchFeatureFile)
      throw unmatchedStepRefusal(loadedFeature.title, unboundSteps);

    scenarios
      .filter((scenario) => scenario.unboundSteps.length > 0)
      .forEach((scenario) => mockState.skippedScenarios.push(scenario.title));
  }),
}));

const { Given, Fusion } = await import("../../../../src/index.js");

// A single, DIFFERENT definition is registered, so the feature step below is genuinely unmatched.
Given(/^a defined step$/, () => {});

describe("M5 — errors:false must not silently skip an unmatched step", () => {
  test("an unmatched step becomes a visible skipped scenario when validation is disabled with { errors: false }", () => {
    mockState.boundSteps = [];
    mockState.skippedScenarios = [];
    mockState.feature = {
      title: "Unmatched step under errors:false",
      scenarios: [
        {
          title: "a scenario with an unmatched step",
          steps: [
            {
              keyword: "given",
              stepText: "a step with NO matching definition",
              stepArgument: null,
            },
          ],
        },
      ],
    };

    // errors:false asks for the step check to be off, so Fusion does NOT refuse — it registers
    // the scenario as a skipped test instead. Not silent, and not a pass either.
    expect(() => Fusion("m5.feature", { errors: false })).not.toThrow();

    // WHAT: the unwired scenario was registered as skipped, under its own name.
    // WHY:  "off" must never mean "silent". A scenario with no definitions reported as PASSED
    //       is a lie, and one dropped from the report hides the gap just as well. The
    //       authoritative version of this observation reads Jest's own recorded status in
    //       test/specs/baseline/assert-validation-report.js; here it is the seam-level half.
    // HOW:  register the scenarios holding unbound steps through test.skip under their own
    //       unannotated names.
    expect(mockState.skippedScenarios).toEqual([
      "a scenario with an unmatched step",
    ]);

    // NEGATIVE, and the purpose this file keeps: nothing was bound for a step no definition
    // owns. Skipping the scenario must not come with a step definition wired to a step it does
    // not match.
    expect(mockState.boundSteps).toEqual([]);
  });

  test("an unmatched step still refuses loudly when the step check is left on", () => {
    mockState.boundSteps = [];
    mockState.skippedScenarios = [];

    // WHAT / WHY / HOW: the other half of the same option. The silent skip this file was
    // written against is now reachable only by asking for it; left alone, the unmatched step
    // is a refusal naming it, which is what undefined-step.steps.js drives end to end.
    expect(() => Fusion("m5.feature")).toThrow(/No step definition matches/);

    expect({
      boundSteps: mockState.boundSteps,
      skippedScenarios: mockState.skippedScenarios,
    }).toEqual({ boundSteps: [], skippedScenarios: [] });
  });
});
