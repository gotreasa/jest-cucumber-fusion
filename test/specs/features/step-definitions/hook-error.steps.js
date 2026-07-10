/**
 * Regression test — T1: negative/sad-path coverage, item 4 (hook error).
 * RCA: docs/feature/review-hardening/discuss/rca.md (T1, MED).
 *
 * A Before/After hook that throws must surface (fail loudly), not be swallowed. The wrapper
 * routes hooks into jest by calling the global beforeEach/afterEach with the registered hook
 * (src/index.js:122-133). This characterization pins CURRENT behaviour: a throwing Before hook
 * IS wired into jest's per-test setup (so jest will report the failure), rather than dropped.
 *
 * MECHANISM: drive the REAL wrapper (Fusion + real src/index.js); fake ONLY the external
 * jest-cucumber (capture its callback), and spy on the global beforeEach so the hook wiring is
 * captured without registering a real, throwing hook that would poison the suite.
 *
 * CURRENT STATUS: GREEN (guard/characterization) — the wrapper already wires throwing hooks
 * into beforeEach. This test exists so that regression to silent-swallow is caught.
 */

const mockState = { capturedCallback: null, feature: null };

jest.mock("jest-cucumber", () => ({
  loadFeature: jest.fn(() => mockState.feature),
  defineFeature: jest.fn((feature, callback) => {
    mockState.capturedCallback = callback;
  }),
}));

const { Before, Given, Fusion } = require("../../../../src");

Before(() => {
  throw new Error("hook failure — Before threw");
});
Given(/^some precondition$/, () => {});

describe("T1.4 — hook errors surface", () => {
  test("a throwing Before hook is wired into jest's beforeEach, not swallowed", () => {
    mockState.feature = {
      title: "Hook wiring",
      scenarios: [{ title: "any scenario", steps: [] }],
      scenarioOutlines: [],
    };

    Fusion("hook-error.feature");

    const beforeEachSpy = jest
      .spyOn(global, "beforeEach")
      .mockImplementation(() => {});
    try {
      // Exercise the wrapper's suite wiring; the scenario body is irrelevant here.
      mockState.capturedCallback(() => {});

      // The wrapper must have handed the throwing hook to jest's beforeEach.
      expect(beforeEachSpy).toHaveBeenCalledTimes(1);
      const wiredHook = beforeEachSpy.mock.calls[0][0];
      expect(() => wiredHook()).toThrow("hook failure — Before threw");
    } finally {
      beforeEachSpy.mockRestore();
    }
  });
});
