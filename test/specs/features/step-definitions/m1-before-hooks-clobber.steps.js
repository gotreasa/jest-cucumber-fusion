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
 * MECHANISM: drive the REAL wrapper (Fusion + real src/index.js); fake ONLY the external
 * jest-cucumber (capture its scenario callback); spy the global beforeEach so we can collect
 * every hook the wrapper hands to jest and run them in order — without registering real hooks
 * that would fire against the whole suite.
 *
 * CURRENT STATUS: RED — only the second Before survives the single-slot assignment, so exactly
 * one hook is wired and the run log is ["before-2"] instead of ["before-1", "before-2"].
 */

const mockState = { capturedCallback: null, feature: null };

jest.mock("jest-cucumber", () => ({
  loadFeature: jest.fn(() => mockState.feature),
  defineFeature: jest.fn((feature, callback) => {
    mockState.capturedCallback = callback;
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
    mockState.feature = {
      title: "Multiple before hooks",
      scenarios: [{ title: "a scenario", steps: [] }],
      scenarioOutlines: [],
    };

    const beforeEachSpy = jest
      .spyOn(global, "beforeEach")
      .mockImplementation(() => {});
    try {
      Fusion("m1.feature");
      // Exercise the wrapper's suite wiring; the scenario body is irrelevant here.
      mockState.capturedCallback(() => {});

      // Collect every hook the wrapper handed to jest's beforeEach and run them in order.
      // Robust to either fix shape (one composite beforeEach call, or one call per hook).
      beforeEachSpy.mock.calls.forEach(([wiredHook]) => wiredHook());
    } finally {
      beforeEachSpy.mockRestore();
    }

    expect(hookRunLog).toEqual(["before-1", "before-2"]);
  });
});
