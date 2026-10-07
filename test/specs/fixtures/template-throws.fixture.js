/**
 * A consumer file, driven by test/specs/baseline/assert-template-names.js.
 *
 * The template throws on the second test it is asked to name, so the failure is not something
 * a lazy implementation could avoid by only ever calling the template once. The refusal is
 * NOT caught here: the run has to fail with no test reported, because a template that cannot
 * produce a name leaves no honest name to register a test under.
 */

const { Given, Fusion } = require("../../../src");

Given("the shop is open", () => {});

let namesAskedFor = 0;

Fusion("template-names.feature", {
  scenarioNameTemplate: ({ scenarioTitle }) => {
    namesAskedFor += 1;
    if (namesAskedFor > 1)
      throw new Error(`no name could be made for "${scenarioTitle}"`);
    return `templated: ${scenarioTitle}`;
  },
});
