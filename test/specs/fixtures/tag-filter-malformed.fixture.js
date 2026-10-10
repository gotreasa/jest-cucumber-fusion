/**
 * A consumer file, driven by test/specs/baseline/assert-tag-filter-report.js.
 *
 * An unbalanced parenthesis, so the expression cannot be parsed at all. The refusal is NOT
 * caught here: the run has to FAIL, with no test reported. The failure mode this fixture
 * exists to rule out is the quiet one -- an expression that cannot be read turning into a
 * matcher that answers false for everything, which would exit 0 having run nothing and look
 * exactly like a filter that correctly selected no scenario.
 */

import { Given, Fusion } from "../../../src/index.js";

Given("the shop is open", () => {});

Fusion("tagged-scenarios.feature", {
  tagFilter: "@included and (not @excluded",
});
