/**
 * Regression test — M1: Before/After single-slot clobber.
 * RCA: docs/feature/review-hardening/discuss/rca.md (M1, MED).
 *
 * stepsDefinition.before / .after are single slots (src/index.js:7-8,75-80); a second
 * Before(fn) ASSIGNS over the first, so only the last-registered hook survives. The wiring
 * (src/index.js:123,132) runs that single slot per scenario.
 *
 * LOCKED FIX CONTRACT (DELIVER implements; this test asserts it): before-hooks are stored as
 * a collection; ALL registered before-hooks run, in registration order, before the scenario
 * (and symmetrically all after-hooks after it).
 *
 * MECHANISM: drive the REAL wrapper (Fusion + real src/index.js) and substitute ONLY the
 * driven port that owns test registration, src/test-registration.js — the seam that replaced
 * the external jest-cucumber this file used to fake. The port is handed the feature and the
 * registry that feature's hooks and definitions were registered in, so the double captures
 * that registry and the hooks are run from it, in order, without registering real hooks that
 * would fire against the whole suite.
 *
 * WHY THIS SEAM. The real port hands each hook to jest's beforeEach once per feature (M6),
 * and m6-hooks-once-per-test.steps.js drives that for real against a committed feature file.
 * What is observed HERE is the half that M1 is about and that M6 cannot see: that BOTH hooks
 * reach the port at all, in registration order, rather than the second overwriting the first.
 *
 * CURRENT STATUS: GREEN (guard) — the hooks are a collection, so both survive. Authored RED
 * against the single-slot assignment, where the log was ["before-2"].
 */

const mockState = { registryHandedToThePort: null };

jest.mock("../../../../src/test-registration", () => ({
  registerFeature: jest.fn((loadedFeature, featureRegistry) => {
    // The real port is given both of these and reads both; a double that accepted less than
    // it would hide a wiring defect rather than reveal one.
    expect(loadedFeature).toBeDefined();
    expect(Array.isArray(loadedFeature.scenarios)).toBe(true);
    expect(featureRegistry).toBeDefined();
    expect(Array.isArray(featureRegistry.before)).toBe(true);
    expect(Array.isArray(featureRegistry.after)).toBe(true);

    mockState.registryHandedToThePort = featureRegistry;
  }),
}));

const { Before, Given, Fusion } = require("../../../../src");

const hookRunLog = [];
// Two Before hooks registered for the same feature — both must run, in this order.
Before(() => hookRunLog.push("before-1"));
Before(() => hookRunLog.push("before-2"));
Given(/^a precondition$/, () => {});

describe("M1 — every registered Before hook runs", () => {
  test("both Before hooks run, in registration order, not just the last-registered one", () => {
    // Any committed feature file does: the registration port is doubled, so the feature is
    // never bound or registered — it only has to exist, so that the real feature-source port
    // resolves and parses it the way it does in production.
    Fusion("../m6-hooks-once-per-test.feature");

    // Every before hook the wrapper handed across the registration seam, run in the order it
    // handed them over.
    mockState.registryHandedToThePort.before.forEach((wiredHook) =>
      wiredHook()
    );

    expect(hookRunLog).toEqual(["before-1", "before-2"]);
  });
});
