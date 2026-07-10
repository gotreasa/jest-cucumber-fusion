/**
 * Regression test — M2: duplicate matcher-source overwrite.
 * RCA: docs/feature/review-hardening/discuss/rca.md (M2, MED).
 *
 * addDefinitionFunction (src/index.js:16-28) keys each step definition by the regex `.source`
 * (or the raw string). Registering the SAME key twice for one step type silently overwrites
 * the first — the earlier handler is lost with no signal.
 *
 * LOCKED FIX CONTRACT (DELIVER implements; this test asserts it): re-registering an identical
 * matcher within a step type must THROW (loud, mirroring the H1 ambiguity philosophy), and the
 * error must NAME the duplicated matcher. Registering two DIFFERENT sources for one step type
 * must NOT throw — that is the H1 ambiguity case, handled elsewhere.
 *
 * MECHANISM: registration happens synchronously inside Given(...) via addDefinitionFunction, so
 * this drives the public surface (Given) directly — no jest-cucumber needed. jest.resetModules
 * gives each test a fresh module singleton so registrations don't leak between tests.
 *
 * CURRENT STATUS: RED — the duplicate registration silently overwrites and never throws.
 */

describe("M2 — duplicate matcher-source registration", () => {
  beforeEach(() => jest.resetModules());

  test("re-registering an identical regex source (same step type) throws and names the matcher", () => {
    const { Given } = require("../../../../src");
    Given(/^I have (\d+) apples$/, () => {});

    let error = null;
    try {
      Given(/^I have (\d+) apples$/, () => {});
    } catch (e) {
      error = e;
    }

    expect(error).not.toBeNull();
    // Names the duplicated matcher — the regex `.source` is `^I have (\d+) apples$`.
    expect(error.message).toContain("I have (\\d+) apples");
  });

  test("re-registering an identical string pattern (same step type) throws and names the matcher", () => {
    const { Given } = require("../../../../src");
    Given("I am on the checkout page", () => {});

    let error = null;
    try {
      Given("I am on the checkout page", () => {});
    } catch (e) {
      error = e;
    }

    expect(error).not.toBeNull();
    expect(error.message).toContain("I am on the checkout page");
  });

  test("registering two DIFFERENT sources (same step type) does NOT throw — that is H1 ambiguity, not a duplicate", () => {
    const { Given } = require("../../../../src");
    Given(/^I have (.*)$/, () => {});
    expect(() => Given(/^I have (\d+) apples$/, () => {})).not.toThrow();
  });
});
