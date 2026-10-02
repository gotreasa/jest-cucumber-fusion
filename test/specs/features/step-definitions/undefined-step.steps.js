/**
 * Regression test — T1: negative/sad-path coverage, item 2 (undefined/unmatched step).
 * RCA: docs/feature/review-hardening/discuss/rca.md (T1, MED; the "Rejected" row confirms
 * default-config jest-cucumber validates step COUNT and throws).
 *
 * A scenario whose step has no registered definition must fail loudly, not silently pass. The
 * wrapper's findMatchingStep returns null for an unmatched step and registers NOTHING
 * (src/index.js:158-159), so jest-cucumber sees fewer step definitions than the feature file
 * has and throws its "N step(s) in the feature file, but M step definition(s) defined"
 * validation error during describe-collection.
 *
 * MECHANISM: real wrapper + real jest-cucumber, driven the idiomatic way (Fusion at module top
 * level). The validation throw fires synchronously during collection, so we capture it at the
 * top level and assert on it inside the test — this keeps the file loadable while still proving
 * the loud failure. No step definitions are registered on purpose.
 *
 * CURRENT STATUS: GREEN (guard/characterization) — an undefined step already fails loudly under
 * default config. This test exists so that a regression to a silent pass is caught. (Note: the
 * loudness is jest-cucumber's step-count validation; the wrapper's contribution is that it does
 * NOT fabricate a binding for the unmatched step.)
 */

const { Fusion } = require("../../../../src");

let thrownError = null;
try {
  // No step definitions registered — the single feature-file step is unmatched.
  Fusion("../undefined-step.feature");
} catch (err) {
  thrownError = err;
}

describe("T1.2 — undefined step", () => {
  test("an unmatched scenario step surfaces a loud validation error, not a silent pass", () => {
    expect(thrownError).not.toBeNull();
    // Couples to jest-cucumber@4.5.0's step-count validation wording; may need updating on upgrade.
    expect(thrownError.message).toMatch(/step definition/i);
  });
});
