/**
 * A consumer file, driven by test/specs/baseline/assert-validation-report.js.
 *
 * The exemption that is the whole correctness of the duplicate check, observed directly
 * instead of being left to the rest of the suite: one Scenario Outline whose declared title
 * holds no placeholder generates three tests of the same name, and that is NOT a duplicate.
 * Default options, so the check is on; all three rows must register and pass.
 */

const { Given, Fusion } = require("../../../src");

Given("the shop is open", () => {});

Fusion("outline-rows-not-duplicates.feature");
