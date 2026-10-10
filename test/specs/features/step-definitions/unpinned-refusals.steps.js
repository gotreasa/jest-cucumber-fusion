// Refusals that existed but no test pinned (they survived mutation testing on 2026-10-08 and
// showed as uncovered lines on Codecov for PR #16):
//   - an asterisk step (`* ...`) is refused by name, because no registry bucket can bind it;
//   - a scenarioNameTemplate that returns "" is refused, naming the empty string;
//   - a scenarioNameTemplate that throws something other than an Error is refused, naming it.
import fs from "fs";
import os from "os";
import path from "path";

import { Given, Fusion } from "../../../../src/index.js";

const featureDir = fs.mkdtempSync(path.join(os.tmpdir(), "fusion-unpinned-"));
const writeFeature = (name, body) => {
  const featurePath = path.join(featureDir, name);
  fs.writeFileSync(featurePath, body);
  return featurePath;
};
afterAll(() => fs.rmSync(featureDir, { recursive: true, force: true }));

const refusalOf = (callFusion) => {
  try {
    callFusion();
    return null;
  } catch (refusal) {
    return refusal.message;
  }
};

const asterisk = writeFeature(
  "asterisk.feature",
  "Feature: Asterisk\n  Scenario: Uses an asterisk\n    * the shop is open\n",
);
Given("the shop is open", () => {});
const asteriskRefusal = refusalOf(() => Fusion(asterisk));

const plain = writeFeature(
  "plain.feature",
  "Feature: Plain\n  Scenario: Opening\n    Given the shop is open\n",
);
Given("the shop is open", () => {});
const emptyNameRefusal = refusalOf(() =>
  Fusion(plain, { scenarioNameTemplate: () => "" }),
);

Given("the shop is open", () => {});
const thrownStringRefusal = refusalOf(() =>
  Fusion(plain, {
    scenarioNameTemplate: () => {
      throw "the template gave up";
    },
  }),
);

describe("refusals no other suite pinned", () => {
  test("an asterisk step is refused by name, with its dialect", () => {
    expect(asteriskRefusal).toMatch(
      /^Unsupported step keyword: "\*" in the "en" Gherkin dialect\./,
    );
  });

  test("a template that returns the empty string is refused, naming it", () => {
    expect(emptyNameRefusal).toMatch(
      /^An error occurred while executing a scenario name template/,
    );
    expect(emptyNameRefusal).toContain("the empty string");
  });

  test("a template that throws a non-Error is refused, naming what it threw", () => {
    expect(thrownStringRefusal).toMatch(
      /^An error occurred while executing a scenario name template/,
    );
    expect(thrownStringRefusal).toContain(
      "the scenarioNameTemplate threw: the template gave up",
    );
  });
});
