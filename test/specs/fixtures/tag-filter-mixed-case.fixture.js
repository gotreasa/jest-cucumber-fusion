/**
 * A consumer file, driven by test/specs/baseline/assert-tag-filter-report.js.
 *
 * The same feature and the same selection, written in a different case. The tags in
 * tagged-scenarios.feature are lowercase, so this filter selects the same scenario ONLY if the
 * expression is lowercased before matching. Lowercasing just the tags leaves this run
 * selecting nothing, which the report script reads as two statuses that moved.
 */

const { Given, Fusion } = require("../../../src");

Given("the shop is open", () => {});

Fusion("tagged-scenarios.feature", {
  tagFilter: "@INCLUDED and not @EXCLUDED",
});
