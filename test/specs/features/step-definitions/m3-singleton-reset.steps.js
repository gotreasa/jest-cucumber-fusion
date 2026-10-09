import { jest } from "@jest/globals";
/**
 * Regression test — M3: module singleton never reset.
 * RCA: docs/feature/review-hardening/discuss/rca.md (M3, MED).
 *
 * `stepsDefinition` (src/index.js:1-9) is a module-level singleton that is never cleared. Jest
 * isolates test FILES, so nothing leaks across files — but WITHIN one file every Fusion() call
 * reads and writes the same registry. A second feature therefore inherits the first feature's
 * step definitions, and its hooks (`before`/`after`, arrays since the M1 fix) are re-wired onto
 * it. Latent under the current one-Fusion-per-file layout; a footgun for library consumers.
 *
 * LOCKED FIX CONTRACT (DELIVER implements; this test asserts it): once a Fusion() call has LOADED
 * its feature, the step definitions AND the hooks are reset to a clean slate. A second Fusion() in
 * the same module therefore starts empty — a second feature must re-register its own steps.
 * The reset happens AFTER the feature is loaded, never before (the positive assertions below pin
 * this: feature 1 must still bind the definitions registered ahead of it). With nothing registered
 * the reset is a no-op — see m4-callsite-resolution.steps.js, which calls Fusion() twice with zero
 * step definitions and must keep passing.
 *
 * MECHANISM: drive the REAL wrapper (Fusion + real src/index.js) and substitute BOTH driven
 * ports — src/feature-source.js stages the feature (and models the port failing to load one),
 * and src/test-registration.js is doubled on the half that models its SYNCHRONOUS collection:
 * the real port binds every step of every scenario through src/step-matching BEFORE it
 * registers a describe, so all matching completes inside Fusion(). Fidelity matters here: a
 * double that deferred the binding would make "reset AFTER the feature is loaded"
 * unobservable. No src internals are stubbed; `stepsDefinition` is never touched directly, and
 * the matcher doing the binding is production code.
 *
 * TWO OBSERVATION POINTS, both on what crosses the registration seam:
 *   - the bound steps: the real port binds a step only when exactly one definition matches it,
 *     so a bound step is the witness that a definition was VISIBLE to that feature;
 *   - the registry object itself, captured as it is handed over, BEFORE any binding. Its
 *     before/after arrays are the hooks that feature would wire, so a leaked hook is visible
 *     here even on a feature whose steps refuse to bind.
 *
 * SAD PATH (cases D/E/F). The reset sits at the END of Fusion(), so any throw inside Fusion()
 * would skip it and leave the registry dirty — the same M3 defect class, reached on the error
 * paths. ADOPTED CONTRACT (adjudicated 2026-07-13): the reset is UNCONDITIONAL — Fusion()
 * always leaves a clean slate, whether it returned normally or threw. Three throw sites, on
 * both sides of the registration seam, all landing before the reset:
 *   D — the feature-source port throws while LOADING (missing feature file).
 *   E — the matcher throws on an AMBIGUOUS step, which no option can switch off.
 *   F — the step check refuses an UNMATCHED step, on the DEFAULT path.
 * F's trigger moved to the default path when errors:false stopped refusing and started
 * registering a skipped test instead. The invariant it pins is the registry's, not the
 * message's, so the move costs it nothing.
 *
 * CURRENT STATUS: GREEN (guard) — authored RED, when the registry survived Fusion() so the
 * second feature bound the first feature's step definition and re-wired its hooks (A/B/C), and
 * a Fusion() that threw left the registry dirty for the next one (D/E/F).
 */

// Not doubled, so the static imports are the real collaborators.
import { findMatchingStep } from "../../../../src/step-matching.js";
import { unmatchedStepRefusal } from "../../../../src/code-suggestion.js";

const mockState = {
  feature: null,
  loadFeatureError: null,
  boundSteps: [],
  registryHandedOver: [],
};

// Registered before any test imports Fusion. The doubles stay registered across
// jest.resetModules(), so each fresh copy of Fusion below is wired to them.
jest.unstable_mockModule("../../../../src/feature-source.js", () => ({
  resolveFeaturePath: jest.fn((featureFileToLoad) => {
    // The real port always answers with an absolute path; so does this one.
    expect(typeof featureFileToLoad).toBe("string");
    return `/staged/${featureFileToLoad}`;
  }),
  loadFeature: jest.fn(() => {
    // Models the port failing to load a feature (e.g. a missing feature file).
    if (mockState.loadFeatureError) throw mockState.loadFeatureError;
    return mockState.feature;
  }),
}));

jest.unstable_mockModule("../../../../src/test-registration.js", () => ({
  registerFeature: jest.fn((loadedFeature, featureRegistry, options) => {
    expect(loadedFeature).toBeDefined();
    expect(featureRegistry).toBeDefined();
    expect(options).toBeDefined();

    // Captured BEFORE the binding, so the hooks this feature would wire stay observable even
    // when the binding below refuses.
    mockState.registryHandedOver.push(featureRegistry);

    // Model the real port with its real collaborators: the matcher REPORTS an unbound step
    // rather than throwing on it, and the port raises one refusal for the whole feature when
    // the step check is on. Both are production modules, so the refusal observed below is the
    // real one.
    const unboundSteps = [];

    loadedFeature.scenarios.forEach((scenario) =>
      scenario.steps.forEach((step) => {
        const result = findMatchingStep(featureRegistry, step);
        if (result.isBound) mockState.boundSteps.push(result);
        else unboundSteps.push(step);
      }),
    );

    if (unboundSteps.length > 0 && options.errors.stepsMustMatchFeatureFile)
      throw unmatchedStepRefusal(loadedFeature.title, unboundSteps);
  }),
}));

const SIGNED_IN = "the shopper is signed in";

const featureWithOneScenario = (featureTitle, stepText) => ({
  title: featureTitle,
  scenarios: [
    {
      title: `${featureTitle} — a scenario`,
      steps: [{ keyword: "given", stepText, stepArgument: null }],
    },
  ],
});

// Load a feature through the REAL Fusion; the doubled port returns the feature staged here.
const fuse = (Fusion, feature) => {
  mockState.feature = feature;
  Fusion(`${feature.title}.feature`);
};

const forgetWhatCrossedTheSeam = () => {
  mockState.boundSteps = [];
  mockState.registryHandedOver = [];
};

// Drive a SECOND Fusion() in the same module after a first one has THROWN, and assert the clean
// slate. NEGATIVE by construction: every field must be false — no leaked step definition may bind
// the second feature's step, and no leaked hook may reach its registration. Asserting the three
// observations as one object (rather than three separate expects, which would short-circuit on the
// first failure) surfaces BOTH halves of the leak at once, so a fix that cleared only the step maps
// and forgot the before/after arrays still fails here — visibly.
//
// The second Fusion() is expected to REFUSE: a clean registry cannot bind its step, and an
// unmatched step is a refusal. That refusal is the clean slate on the step side, so it is
// swallowed here and the three observations are read off what crossed the seam.
const expectCleanSlateOnNextFusion = (Fusion, stepText) => {
  forgetWhatCrossedTheSeam();

  try {
    fuse(Fusion, featureWithOneScenario("second", stepText));
  } catch (refusal) {
    expect(refusal.message).toMatch(/No step definition matches/);
  }

  // The second feature reached registration, so the three answers below are observations and
  // not silence.
  expect(mockState.registryHandedOver).toHaveLength(1);
  const registryForTheSecondFeature = mockState.registryHandedOver[0];

  expect({
    leakedStepDefinitionBound: mockState.boundSteps.length > 0,
    leakedBeforeHookWired: registryForTheSecondFeature.before.length > 0,
    leakedAfterHookWired: registryForTheSecondFeature.after.length > 0,
  }).toEqual({
    leakedStepDefinitionBound: false,
    leakedBeforeHookWired: false,
    leakedAfterHookWired: false,
  });
};

describe("M3 — the step registry is reset once a feature is loaded", () => {
  beforeEach(() => {
    jest.resetModules();
    mockState.feature = null;
    mockState.loadFeatureError = null;
    forgetWhatCrossedTheSeam();
  });

  test("step definitions do not leak — a second feature does not inherit the first feature's steps", async () => {
    const { Given, Fusion } = await import("../../../../src/index.js");
    Given(SIGNED_IN, () => {});

    // Feature 1 sees the definition registered ahead of it (the reset must not run early).
    fuse(Fusion, featureWithOneScenario("first", SIGNED_IN));
    expect(mockState.boundSteps).toHaveLength(1);

    forgetWhatCrossedTheSeam();

    // Feature 2 asks for the SAME step text, but nothing was re-registered after feature 1
    // loaded — so a clean registry cannot bind it, and Fusion refuses.
    expect(() =>
      fuse(Fusion, featureWithOneScenario("second", SIGNED_IN)),
    ).toThrow(/No step definition matches/);

    // NEGATIVE: the leaked definition must NOT have bound the second feature's step.
    expect(mockState.boundSteps).toEqual([]);
  });

  test("hooks do not leak — the first feature's before/after hooks are not re-wired onto a second feature", async () => {
    const { Before, After, Given, Fusion } =
      await import("../../../../src/index.js");
    Before(() => {});
    After(() => {});
    Given(SIGNED_IN, () => {});

    // Feature 1 carries its hooks across the seam: one before hook, one after hook.
    fuse(Fusion, featureWithOneScenario("first", SIGNED_IN));
    expect(mockState.registryHandedOver).toHaveLength(1);
    expect(mockState.registryHandedOver[0].before).toHaveLength(1);
    expect(mockState.registryHandedOver[0].after).toHaveLength(1);

    forgetWhatCrossedTheSeam();

    // Feature 2 registers no hooks and no definitions of its own, so it refuses on its step —
    // but it still reaches registration, which is where a leaked hook would show.
    expect(() =>
      fuse(Fusion, featureWithOneScenario("second", SIGNED_IN)),
    ).toThrow(/No step definition matches/);

    // NEGATIVE: no hook from feature 1 may reach feature 2's registration.
    expect(mockState.registryHandedOver).toHaveLength(1);
    expect(mockState.registryHandedOver[0].before).toEqual([]);
    expect(mockState.registryHandedOver[0].after).toEqual([]);
  });

  test("a second feature re-registering the same step is a fresh registration, not a duplicate, and it binds", async () => {
    const { Given, Fusion } = await import("../../../../src/index.js");
    Given(SIGNED_IN, () => {});
    fuse(Fusion, featureWithOneScenario("first", SIGNED_IN));

    forgetWhatCrossedTheSeam();

    // The registry was emptied when feature 1 loaded, so this is a FIRST registration — the
    // duplicate-matcher guard (M2) is the witness that the earlier entry is really gone.
    expect(() => Given(SIGNED_IN, () => {})).not.toThrow();

    // ...and the freshly re-registered definition binds feature 2's step: the reset clears the
    // registry without breaking it.
    fuse(Fusion, featureWithOneScenario("second", SIGNED_IN));
    expect(mockState.boundSteps).toHaveLength(1);
  });

  test("D — a Fusion() that throws because the feature file is missing still leaves a clean slate", async () => {
    const { Before, After, Given, Fusion } =
      await import("../../../../src/index.js");
    Before(() => {});
    After(() => {});
    Given(SIGNED_IN, () => {});

    // The feature-source port fails to load the feature, so Fusion throws BEFORE reaching its
    // reset.
    mockState.loadFeatureError = new Error(
      "ENOENT: no such file or directory, open 'missing.feature'",
    );
    expect(() => Fusion("missing.feature")).toThrow(/ENOENT/);
    mockState.loadFeatureError = null;

    expectCleanSlateOnNextFusion(Fusion, SIGNED_IN);
  });

  test("E — a Fusion() that throws on an ambiguous step (errors:true default) still leaves a clean slate", async () => {
    const { Before, After, Given, Fusion } =
      await import("../../../../src/index.js");
    Before(() => {});
    After(() => {});
    // Two DIFFERENT matchers that both match SIGNED_IN: the matcher raises the H1 ambiguity
    // error from inside the synchronous registration call, so it propagates out of Fusion, past
    // the reset. This is the wrapper's own throw on the DEFAULT path.
    Given(/^the shopper is (.*)$/, () => {});
    Given(/^the shopper is signed in$/, () => {});

    mockState.feature = featureWithOneScenario("first", SIGNED_IN);
    expect(() => Fusion("first.feature")).toThrow(/Ambiguous step definition/);

    // The second feature's step matches ONLY the broad leaked matcher, so a dirty registry BINDS
    // it rather than refusing again — which keeps the leak observable (a second ambiguity throw
    // would suppress the binding and hide the leak behind a passing negative).
    expectCleanSlateOnNextFusion(Fusion, "the shopper is browsing");
  });

  test("F — a Fusion() that throws on an unmatched step still leaves a clean slate", async () => {
    const { Before, After, Given, Fusion } =
      await import("../../../../src/index.js");
    Before(() => {});
    After(() => {});
    Given(SIGNED_IN, () => {});

    // The unmatched-step refusal, from inside the synchronous registration call. The trigger
    // is the DEFAULT path: errors:false no longer refuses at all — it registers the scenario
    // as a skipped test (see m5-errors-false-silent-skip.steps.js) — so the throw this case
    // needs is the one the step check raises when it is left on. The invariant under test is
    // unchanged: whatever Fusion throws, it leaves a clean slate.
    mockState.feature = featureWithOneScenario(
      "first",
      "a step with NO matching definition",
    );
    expect(() => Fusion("first.feature")).toThrow(/No step definition matches/);

    expectCleanSlateOnNextFusion(Fusion, SIGNED_IN);
  });
});
