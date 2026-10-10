/**
 * A consumer file, driven by test/specs/baseline/assert-template-names.js.
 *
 * The same feature and the same template, with a tag filter excluding one scenario. The
 * report must hold exactly the SAME four templated names as the unfiltered run, with one of
 * them skipped instead of passed.
 *
 * That is the whole observation: a test whose reported name depended on whether it ran could
 * not be compared across two runs -- a reader would see one test disappear and another
 * appear, rather than one test changing status. So the skipping route and the running route
 * have to take their name from the same call.
 */

import { Given, Fusion } from "../../../src/index.js";

Given("the shop is open", () => {});

Fusion("template-names.feature", {
  tagFilter: "@included and not @excluded",
  scenarioNameTemplate: ({ scenarioTitle }) => `templated: ${scenarioTitle}`,
});
