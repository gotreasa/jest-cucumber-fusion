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
 * MECHANISM: drive the REAL wrapper (Fusion + real src/index.js); fake ONLY the external
 * jest-cucumber port. The fake models the real port's SYNCHRONOUS collection faithfully —
 * `defineFeature` runs its callback inside `describe`, and `defineScenarioFunction` invokes the
 * steps callback immediately (node_modules/jest-cucumber/dist/src/feature-definition-creation.js:182,234-237)
 * — so all step matching and hook wiring completes inside Fusion(). Fidelity matters here: a fake
 * that deferred the callback (as m1/m5 do, where deferral is harmless) would make "reset AFTER the
 * feature is loaded" unobservable. jest-cucumber's own given/when/then verbs are the observation
 * point — the wrapper calls verb(expression, fn) only when it FINDS a matching definition, so a
 * verb call is the witness that a definition was visible. The global beforeEach/afterEach are spied
 * (never really registered) to observe hook wiring. No src internals are stubbed; `stepsDefinition`
 * is never touched directly.
 *
 * SAD PATH (cases D/E/F). The reset sits at the END of Fusion() (src/index.js:152-154), so any
 * throw inside Fusion() skips it and leaves the registry dirty — the same M3 defect class, reached
 * on the error paths. ADOPTED CONTRACT (adjudicated 2026-07-13): the reset is UNCONDITIONAL —
 * Fusion() always leaves a clean slate, whether it returned normally or threw. Three throw sites,
 * on both sides of the defineFeature seam, all landing before the reset:
 *   D — the external port throws while LOADING (missing feature file), src/index.js:111.
 *   E — the wrapper throws from findMatchingStep on an AMBIGUOUS step (src/index.js:217-223),
 *       inside the defineFeature callback, on the errors:true DEFAULT path.
 *   F — the wrapper throws on an UNMATCHED step (src/index.js:191-192), inside the same callback,
 *       on the errors:false path.
 * E and F are the only two routes on which the WRAPPER itself throws from inside the callback. On
 * the errors:true default an unmatched step does NOT throw from the wrapper — findMatchingStep
 * returns null and the wrapper silently returns; the loud failure there is jest-cucumber's own
 * step-count validation (see undefined-step.steps.js and the rca.md "Rejected" row). That is an
 * external-port throw arriving before the reset, structurally identical to D, so D covers its
 * class; it is not re-modelled here (emulating that validation in the fake would distort cases
 * A/B/C, whose second feature is deliberately unmatched).
 *
 * CURRENT STATUS: RED — the registry survives Fusion(), so the second feature binds the first
 * feature's step definition, re-wires its before/after hooks, and re-registering the same matcher
 * trips the duplicate-matcher guard (A/B/C — now fixed and green); and a Fusion() that throws
 * leaves the registry dirty for the next Fusion() (D/E/F — the sad path, still RED).
 */

const mockState = { feature: null, verbs: null, loadFeatureError: null };

jest.mock("jest-cucumber", () => ({
  loadFeature: jest.fn(() => {
    // Models the external port failing to load a feature (e.g. a missing feature file).
    if (mockState.loadFeatureError) throw mockState.loadFeatureError;
    return mockState.feature;
  }),
  defineFeature: jest.fn((feature, scenariosDefinitionCallback) => {
    // Real jest-cucumber invokes the scenarios callback synchronously (inside describe), and each
    // scenario's steps callback synchronously within it. Model exactly that.
    scenariosDefinitionCallback((_scenarioTitle, stepsDefinitionCallback) => {
      stepsDefinitionCallback(mockState.verbs);
    });
  }),
}));

const SIGNED_IN = "the shopper is signed in";

const featureWithOneScenario = (featureTitle, stepText) => ({
  title: featureTitle,
  scenarios: [
    {
      title: `${featureTitle} — a scenario`,
      steps: [{ keyword: "given", stepText, stepArgument: undefined }],
    },
  ],
  scenarioOutlines: [],
});

// Load a feature through the REAL Fusion; the faked port returns the feature staged here.
const fuse = (Fusion, feature) => {
  mockState.feature = feature;
  Fusion(`${feature.title}.feature`);
};

// Observe hook wiring without ever registering a real hook against the suite.
const spyOnHookWiring = () => ({
  beforeEach: jest.spyOn(global, "beforeEach").mockImplementation(() => {}),
  afterEach: jest.spyOn(global, "afterEach").mockImplementation(() => {}),
});

// Drive a SECOND Fusion() in the same module after a first one has THROWN, and assert the clean
// slate. NEGATIVE by construction: every field must be false — no leaked step definition may bind
// the second feature's step, and no leaked hook may be wired onto its scenario. Asserting the three
// observations as one object (rather than three separate expects, which would short-circuit on the
// first failure) surfaces BOTH halves of the leak at once, so a fix that cleared only the step maps
// and forgot the before/after arrays still fails here — visibly.
const expectCleanSlateOnNextFusion = (Fusion, stepText, spies) => {
  mockState.verbs.given.mockClear();
  spies.beforeEach.mockClear();
  spies.afterEach.mockClear();

  fuse(Fusion, featureWithOneScenario("second", stepText));

  expect({
    leakedStepDefinitionBound: mockState.verbs.given.mock.calls.length > 0,
    leakedBeforeHookWired: spies.beforeEach.mock.calls.length > 0,
    leakedAfterHookWired: spies.afterEach.mock.calls.length > 0,
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
    mockState.verbs = {
      given: jest.fn(),
      when: jest.fn(),
      then: jest.fn(),
      and: jest.fn(),
      but: jest.fn(),
    };
  });

  test("step definitions do not leak — a second feature does not inherit the first feature's steps", () => {
    const { Given, Fusion } = require("../../../../src");
    Given(SIGNED_IN, () => {});

    // Feature 1 sees the definition registered ahead of it (the reset must not run early).
    fuse(Fusion, featureWithOneScenario("first", SIGNED_IN));
    expect(mockState.verbs.given).toHaveBeenCalledTimes(1);

    mockState.verbs.given.mockClear();

    // Feature 2 asks for the SAME step text, but nothing was re-registered after feature 1 loaded.
    fuse(Fusion, featureWithOneScenario("second", SIGNED_IN));

    // NEGATIVE: the leaked definition must NOT bind the second feature's step.
    expect(mockState.verbs.given).not.toHaveBeenCalled();
  });

  test("hooks do not leak — the first feature's before/after hooks are not re-wired onto a second feature", () => {
    const { Before, After, Given, Fusion } = require("../../../../src");
    Before(() => {});
    After(() => {});
    Given(SIGNED_IN, () => {});

    const beforeEachSpy = jest
      .spyOn(global, "beforeEach")
      .mockImplementation(() => {});
    const afterEachSpy = jest
      .spyOn(global, "afterEach")
      .mockImplementation(() => {});
    try {
      // Feature 1 gets its hooks wired: one scenario, one before hook, one after hook.
      fuse(Fusion, featureWithOneScenario("first", SIGNED_IN));
      expect(beforeEachSpy).toHaveBeenCalledTimes(1);
      expect(afterEachSpy).toHaveBeenCalledTimes(1);

      beforeEachSpy.mockClear();
      afterEachSpy.mockClear();

      // Feature 2 registers no hooks of its own.
      fuse(Fusion, featureWithOneScenario("second", SIGNED_IN));

      // NEGATIVE: no hook from feature 1 may be wired onto feature 2's scenario.
      expect(beforeEachSpy).not.toHaveBeenCalled();
      expect(afterEachSpy).not.toHaveBeenCalled();
    } finally {
      beforeEachSpy.mockRestore();
      afterEachSpy.mockRestore();
    }
  });

  test("a second feature re-registering the same step is a fresh registration, not a duplicate, and it binds", () => {
    const { Given, Fusion } = require("../../../../src");
    Given(SIGNED_IN, () => {});
    fuse(Fusion, featureWithOneScenario("first", SIGNED_IN));

    mockState.verbs.given.mockClear();

    // The registry was emptied when feature 1 loaded, so this is a FIRST registration — the
    // duplicate-matcher guard (M2) is the witness that the earlier entry is really gone.
    expect(() => Given(SIGNED_IN, () => {})).not.toThrow();

    // ...and the freshly re-registered definition binds feature 2's step: the reset clears the
    // registry without breaking it.
    fuse(Fusion, featureWithOneScenario("second", SIGNED_IN));
    expect(mockState.verbs.given).toHaveBeenCalledTimes(1);
  });

  test("D — a Fusion() that throws because the feature file is missing still leaves a clean slate", () => {
    const { Before, After, Given, Fusion } = require("../../../../src");
    Before(() => {});
    After(() => {});
    Given(SIGNED_IN, () => {});

    const spies = spyOnHookWiring();
    try {
      // The external port fails to load the feature, so Fusion throws BEFORE reaching its reset.
      mockState.loadFeatureError = new Error(
        "ENOENT: no such file or directory, open 'missing.feature'"
      );
      expect(() => Fusion("missing.feature")).toThrow(/ENOENT/);
      mockState.loadFeatureError = null;

      expectCleanSlateOnNextFusion(Fusion, SIGNED_IN, spies);
    } finally {
      spies.beforeEach.mockRestore();
      spies.afterEach.mockRestore();
    }
  });

  test("E — a Fusion() that throws on an ambiguous step (errors:true default) still leaves a clean slate", () => {
    const { Before, After, Given, Fusion } = require("../../../../src");
    Before(() => {});
    After(() => {});
    // Two DIFFERENT matchers that both match SIGNED_IN: findMatchingStep raises the H1 ambiguity
    // error from INSIDE the defineFeature callback, which runs synchronously — so it propagates
    // out of Fusion, past the reset. This is the wrapper's own throw on the DEFAULT path.
    Given(/^the shopper is (.*)$/, () => {});
    Given(/^the shopper is signed in$/, () => {});

    const spies = spyOnHookWiring();
    try {
      mockState.feature = featureWithOneScenario("first", SIGNED_IN);
      expect(() => Fusion("first.feature")).toThrow(
        /Ambiguous step definition/
      );

      // The second feature's step matches ONLY the broad leaked matcher, so a dirty registry BINDS
      // it rather than throwing ambiguously again — which keeps the leak observable (a second
      // ambiguity throw would suppress the verb call and hide the leak behind a passing negative).
      expectCleanSlateOnNextFusion(Fusion, "the shopper is browsing", spies);
    } finally {
      spies.beforeEach.mockRestore();
      spies.afterEach.mockRestore();
    }
  });

  test("F — a Fusion() that throws on an unmatched step (errors:false) still leaves a clean slate", () => {
    const { Before, After, Given, Fusion } = require("../../../../src");
    Before(() => {});
    After(() => {});
    Given(SIGNED_IN, () => {});

    const spies = spyOnHookWiring();
    try {
      // errors:false disables jest-cucumber's own validation, so the WRAPPER must fail loudly on the
      // unmatched step (M5) — again from inside the synchronous defineFeature callback.
      mockState.feature = featureWithOneScenario(
        "first",
        "a step with NO matching definition"
      );
      expect(() => Fusion("first.feature", { errors: false })).toThrow(
        /No step definition matches/
      );

      expectCleanSlateOnNextFusion(Fusion, SIGNED_IN, spies);
    } finally {
      spies.beforeEach.mockRestore();
      spies.afterEach.mockRestore();
    }
  });
});
