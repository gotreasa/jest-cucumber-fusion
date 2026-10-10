// A refusal that names the value it was given must not crash while naming it.
//
// The template refusal and the setFusionConfiguration refusal described the value with
// JSON.stringify, which throws on a BigInt and on a circular object, so the consumer got a
// TypeError from inside Fusion instead of the refusal written for them. Found by the PR #16
// adversarial review (finding F8), 2026-10-09.
import fs from "fs";
import os from "os";
import path from "path";
import { inspect } from "util";

import {
  Given,
  Fusion,
  setFusionConfiguration,
} from "../../../../src/index.js";

const featureDir = fs.mkdtempSync(
  path.join(os.tmpdir(), "fusion-unserialisable-"),
);
const feature = path.join(featureDir, "unserialisable.feature");
fs.writeFileSync(
  feature,
  "Feature: Unserialisable\n  Scenario: Opening\n    Given the shop is open\n",
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
  // Neither JSON nor util.inspect can print this one (found by the review of the PR #16 fixes).
  templateUnprintable: templateRefusalFor({
    toJSON() {
      throw new Error("no JSON");
    },
    [inspect.custom]() {
      throw new Error("no inspect");
    },
  }),
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
      "function [Function: aFunction]",
    );
  });

  test("a template answering a value nothing can print still gets the template refusal", () => {
    expect(outcomes.templateUnprintable).toContain(
      "object (a value that cannot be printed)",
    );
    expect(outcomes.templateUnprintable).toContain("WHAT:");
  });

  test("setFusionConfiguration given a BigInt gets its own refusal", () => {
    expect(outcomes.configurationBigInt).toContain(
      "WHAT: it was given bigint 10n.",
    );
  });
});
