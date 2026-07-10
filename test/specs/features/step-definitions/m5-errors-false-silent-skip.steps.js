/**
 * Regression test — M5: `errors:false` re-opens the silent-skip.
 * RCA: docs/feature/review-hardening/discuss/rca.md (M5, MED).
 *
 * Fusion forwards options to jest-cucumber (src/index.js:89-93). With `{ errors: false }`,
 * jest-cucumber skips ITS step-count validation — so the wrapper's own
 * `if (!foundMatchingStep) return;` (src/index.js:158-159) becomes the only gate, and it drops
 * an unmatched step silently (remaining args then index-shift).
 *
 * LOCKED FIX CONTRACT (DELIVER implements; this test asserts it): even with validation disabled,
 * an unmatched step must fail loudly rather than be silently skipped.
 *
 * MECHANISM: drive the REAL wrapper (Fusion + real src/index.js); fake ONLY the external
 * jest-cucumber and capture its scenario callback, then invoke the scenario body synchronously.
 * Because jest-cucumber is faked, its validation never runs regardless of `errors` — so this
 * isolates the WRAPPER's handling of an unmatched step (exactly the surface `errors:false`
 * exposes in production). One matching definition is registered so the miss is specifically the
 * unmatched step, not an empty registry.
 *
 * INTERACTION CAVEAT (see report): on the DEFAULT path, jest-cucumber's own validation throws
 * during Fusion() collection BEFORE the scenario body runs (proven green by
 * undefined-step.steps.js / T1.2), so a `return -> throw` fix on the wrapper's silent-skip does
 * not reach the default path. Re-run T1.2 after the fix to confirm its message is unchanged.
 *
 * CURRENT STATUS: RED — the unmatched step is silently skipped, so the scenario body completes
 * without throwing.
 */

const mockState = { capturedCallback: null, feature: null };

jest.mock("jest-cucumber", () => ({
  loadFeature: jest.fn(() => mockState.feature),
  defineFeature: jest.fn((feature, callback) => {
    mockState.capturedCallback = callback;
  }),
}));

const { Given, Fusion } = require("../../../../src");

// A single, DIFFERENT definition is registered, so the feature step below is genuinely unmatched.
Given(/^a defined step$/, () => {});

describe("M5 — errors:false must not silently skip an unmatched step", () => {
  test("an unmatched step fails loudly even when validation is disabled with { errors: false }", () => {
    mockState.feature = {
      title: "Unmatched step under errors:false",
      scenarios: [
        {
          title: "a scenario with an unmatched step",
          steps: [
            {
              keyword: "given",
              stepText: "a step with NO matching definition",
              stepArgument: undefined,
            },
          ],
        },
      ],
      scenarioOutlines: [],
    };

    // errors:false is forwarded to jest-cucumber, disabling ITS validation — so the wrapper
    // itself must be the one to fail loudly on the unmatched step.
    Fusion("m5.feature", { errors: false });

    const runScenario = () => {
      mockState.capturedCallback((_title, scenarioBody) => {
        scenarioBody({
          given: () => {},
          when: () => {},
          then: () => {},
          and: () => {},
          but: () => {},
        });
      });
    };

    expect(runScenario).toThrow();
  });
});
