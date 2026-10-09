/**
 * A consumer file, driven by test/specs/baseline/assert-template-names.js.
 *
 * The template answers with undefined, which is the shape a consumer gets for free by
 * forgetting a return. The previous engine passed that straight to the runner and produced a
 * test with no usable name -- one that could not be reported properly and could not be
 * selected by name afterwards. Refusing is the only answer that leaves the consumer able to
 * act, so this run has to fail with no test reported.
 */

import { Given, Fusion } from "../../../src/index.js";

Given("the shop is open", () => {});

Fusion("template-names.feature", {
  scenarioNameTemplate: () => undefined,
});
