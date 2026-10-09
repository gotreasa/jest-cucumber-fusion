/**
 * A consumer file, driven by test/specs/baseline/assert-validation-report.js.
 *
 * The same duplicated-title feature with scenariosMustMatchFeatureFile false. A consumer who
 * switches that check off has asked for the file to be accepted, so every scenario registers
 * and runs and the report holds the repeated names. The step check is untouched by naming this
 * key, which is why every step still has to bind -- and it does.
 */

import { Given, Fusion } from "../../../src/index.js";

Given("the shop is open", () => {});

Fusion("duplicate-titles.feature", {
  errors: { scenariosMustMatchFeatureFile: false },
});
