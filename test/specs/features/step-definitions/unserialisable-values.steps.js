// A refusal that names the value it was given must not crash while naming it.
//
// The template refusal and the setFusionConfiguration refusal described the value with
// JSON.stringify, which throws on a BigInt and on a circular object, so the consumer got a
// TypeError from inside Fusion instead of the refusal written for them. Found by the PR #16
// adversarial review (finding F8), 2026-10-09.
const fs = require("fs");
const os = require("os");
const path = require("path");

const { Given, Fusion, setFusionConfiguration } = require("../../../../src");

const featureDir = fs.mkdtempSync(
  path.join(os.tmpdir(), "fusion-unserialisable-")
);
const feature = path.join(featureDir, "unserialisable.feature");
fs.writeFileSync(
  feature,
  "Feature: Unserialisable\n  Scenario: Opening\n    Given the shop is open\n"
);
afterAll(() => fs.rmSync(featureDir, { recursive: true, force: true }));

const circular = {};
circular.self = circular;

const messageFrom = (act) => {
  try {
    act();
  } catch (thrown) {
    return String(thrown.message);
  }
  return null;
};
const templateRefusalFor = (answer) =>
  messageFrom(() => {
    Given("the shop is open", () => {});
    Fusion(feature, { scenarioNameTemplate: () => answer });
  });

const outcomes = {
  templateBigInt: templateRefusalFor(10n),
  templateCircular: templateRefusalFor(circular),
  templateFunction: templateRefusalFor(function aFunction() {}),
  configurationBigInt: messageFrom(() => setFusionConfiguration(10n)),
};

describe("refusals naming a value JSON cannot serialise", () => {
  test("a template answering a BigInt gets the template refusal", () => {
    expect(outcomes.templateBigInt).toContain("bigint 10n");
    expect(outcomes.templateBigInt).toContain("WHAT:");
  });

  test("a template answering a circular object gets the template refusal", () => {
    expect(outcomes.templateCircular).toContain("[Circular *1]");
    expect(outcomes.templateCircular).toContain("WHAT:");
  });

  // JSON.stringify answers undefined for a function rather than throwing, which used to print
  // "function undefined".
  test("a template answering a function is named as that function", () => {
    expect(outcomes.templateFunction).toContain(
      "function [Function: aFunction]"
    );
  });

  test("setFusionConfiguration given a BigInt gets its own refusal", () => {
    expect(outcomes.configurationBigInt).toContain(
      "WHAT: it was given bigint 10n."
    );
  });
});
