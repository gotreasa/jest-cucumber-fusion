/**
 * A consumer file, driven by test/specs/baseline/assert-tag-filter-report.js.
 *
 * The step check is at its DEFAULT -- no errors option at all -- and the feature's @excluded
 * scenario holds a step nobody wired. The filter must exempt it: a consumer who excluded a
 * scenario is not asking for its steps to be bound, and a filter that could not exclude a
 * half-written scenario would be useless for the job it is most often reached for.
 *
 * Two things have to hold at once, and the report script reads both: no unmatched-step
 * refusal, and the excluded scenario still reported ONCE as a skipped test. Twice-skipped --
 * once for the tag, once for the unbound step -- would put two tests of one name in the
 * report.
 */

import { Given, Fusion } from "../../../src/index.js";

Given("the shop is open", () => {});

Fusion("tag-filter-unbound.feature", {
  tagFilter: "@included and not @excluded",
});
