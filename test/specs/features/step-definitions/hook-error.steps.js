/**
 * Regression test — T1: negative/sad-path coverage, item 4 (hook error).
 * RCA: docs/feature/review-hardening/discuss/rca.md (T1, MED).
 *
 * A Before/After hook that throws must surface (fail loudly), not be swallowed. The wrapper
 * routes hooks into jest through src/test-registration.js, which calls the global
 * beforeEach/afterEach once per feature with each registered hook. This characterization pins
 * CURRENT behaviour: a throwing Before hook IS carried into jest's per-test setup (so jest
 * will report the failure), rather than caught and dropped on the way.
 *
 * MECHANISM: drive the REAL wrapper (Fusion + real src/index.js) and substitute ONLY the
 * driven port that owns test registration, src/test-registration.js — the seam that replaced
 * the external jest-cucumber this file used to fake. The double captures the registry the
 * port was handed, so the throwing hook is observed without ever registering a real one that
 * would poison the suite.
 *
 * CURRENT STATUS: GREEN (guard/characterization) — the wrapper carries throwing hooks
 * through untouched. This test exists so that regression to silent-swallow is caught.
 */

const mockState = { registryHandedToThePort: null };

jest.mock("../../../../src/test-registration", () => ({
  registerFeature: jest.fn((loadedFeature, featureRegistry) => {
    // The real port reads both arguments; a double that accepted less would hide a wiring
    // defect rather than reveal one.
    expect(loadedFeature).toBeDefined();
    expect(Array.isArray(loadedFeature.scenarios)).toBe(true);
    expect(featureRegistry).toBeDefined();
    expect(Array.isArray(featureRegistry.before)).toBe(true);

    mockState.registryHandedToThePort = featureRegistry;
  }),
}));

const { Before, Given, Fusion } = require("../../../../src");

Before(() => {
  throw new Error("hook failure — Before threw");
});
Given(/^some precondition$/, () => {});

describe("T1.4 — hook errors surface", () => {
  test("a throwing Before hook is carried into jest's per-test setup, not swallowed", () => {
    // Any committed feature file does: the registration port is doubled, so the feature is
    // never bound or registered — it only has to exist, so that the real feature-source port
    // resolves and parses it the way it does in production.
    Fusion("../m6-hooks-once-per-test.feature");

    // Exactly one before hook crossed the seam, and it is the throwing one — not a wrapper
    // that swallowed it.
    expect(mockState.registryHandedToThePort.before).toHaveLength(1);
    const wiredHook = mockState.registryHandedToThePort.before[0];
    expect(() => wiredHook()).toThrow("hook failure — Before threw");
  });
});
