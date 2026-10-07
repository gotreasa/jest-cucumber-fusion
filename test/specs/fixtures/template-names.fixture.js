/**
 * A consumer file, driven by test/specs/baseline/assert-template-names.js.
 *
 * The template uses nothing but scenarioTitle, so what the report script reads is a clean
 * answer to one question: did the name the template returned become the test's reported name?
 * What the template was HANDED is the oracle's business, not this file's.
 *
 * Each Examples row must appear under its own substituted title inside the templated name.
 * The previous engine called the template with the outline's un-substituted title and then
 * registered the row under its own name instead, so both rows would come back untemplated.
 */

const { Given, Fusion } = require("../../../src");

Given("the shop is open", () => {});

Fusion("template-names.feature", {
  scenarioNameTemplate: ({ scenarioTitle }) => `templated: ${scenarioTitle}`,
});
