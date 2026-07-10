/**
 * Regression test — T1: negative/sad-path coverage, item 3 (missing feature file).
 * RCA: docs/feature/review-hardening/discuss/rca.md (T1, MED).
 *
 * Fusion('does-not-exist.feature') must fail loudly rather than silently no-op. Fusion resolves
 * the path and calls jest-cucumber's loadFeature synchronously (src/index.js:82-93) BEFORE
 * defineFeature; loadFeature readFileSync's the path and throws on ENOENT. This drives the REAL
 * wrapper and real jest-cucumber — no doubles — and asserts the throw.
 *
 * CURRENT STATUS: GREEN (guard/characterization) — a missing feature file already throws
 * synchronously. This test exists so that a regression to a silent no-op is caught.
 */

const { Fusion } = require("../../../../src");

describe("T1.3 — missing feature file", () => {
  test("Fusion throws loudly for a feature file that does not exist", () => {
    // Couples to jest-cucumber@4.5.0's loadFeature ENOENT wording; may need updating on upgrade.
    expect(() => Fusion("../does-not-exist-regression.feature")).toThrow(
      /Feature file not found/
    );
  });
});
