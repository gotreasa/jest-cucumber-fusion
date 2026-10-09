/**
 * A consumer file, driven by test/specs/baseline/assert-tag-filter-report.js.
 *
 * The exact call the value text names. Nothing is asserted here: what this fixture is for is
 * the STATUS Jest records -- one passed test and one skipped test, the skipped one under the
 * excluded scenario's own unannotated name. A step counter inside the file cannot see a
 * reported status, which is why this observation lives in the report script and not in the
 * oracle.
 *
 * `.fixture.js`, not `.steps.js`: the repository runner selects every .steps.js file, and
 * these fixtures are driven one at a time with an explicit testMatch instead.
 */

import { Given, Fusion } from "../../../src/index.js";

Given("the shop is open", () => {});

Fusion("tagged-scenarios.feature", {
  tagFilter: "@included and not @excluded",
});
