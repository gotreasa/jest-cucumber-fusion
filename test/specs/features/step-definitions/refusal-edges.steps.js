// Edges no other suite exercised, found as surviving mutants on 2026-10-08
// (docs/feature/drop-jest-cucumber/plan.md, "Post-delivery probes"):
//   - a feature file that is not valid Gherkin is refused by name, and registers nothing
//     (the parse refusal, src/feature-source.js:72; the compile refusal at :80 runs only after
//     a successful parse and is not reached by any feature file found so far, so it stays
//     unobserved);
//   - scenarios whose titles differ only in letter case are ONE duplicated title, counted
//     together (the case folding at src/feature-source.js:137; removing it fails this test,
//     measured by hand, though Stryker generates only the equivalent .trim and toUpperCase
//     variants of that line);
//   - a header-only data table reaches its step as [] (bound in the V1 design; the guard at
//     src/step-argument.js:20 is unreachable from Gherkin, so this pins the promise rather than
//     kills that mutant).
import fs from "fs";
import os from "os";
import path from "path";

import { Given, Fusion } from "../../../../src/index.js";

const featureDir = fs.mkdtempSync(path.join(os.tmpdir(), "fusion-edges-"));
const writeFeature = (name, body) => {
  const featurePath = path.join(featureDir, name);
  fs.writeFileSync(featurePath, body);
  return featurePath;
};
afterAll(() => fs.rmSync(featureDir, { recursive: true, force: true }));

// Collection-time observations: each Fusion() call is made while this file loads, and the
// tests below assert on what it did. Jest globals are counted while each refusing call runs.
const refusalOf = (featurePath) => {
  const registered = { describe: 0, test: 0 };
  const realDescribe = global.describe;
  const realTest = global.test;
  global.describe = (...args) => {
    registered.describe += 1;
    return realDescribe(...args);
  };
  global.test = Object.assign((...args) => {
    registered.test += 1;
    return realTest(...args);
  }, realTest);
  try {
    Fusion(featurePath);
    return { message: null, registered };
  } catch (refusal) {
    return { message: String(refusal.message), registered };
  } finally {
    global.describe = realDescribe;
    global.test = realTest;
  }
};

Given("the shop is open", () => {});
const notGherkin = refusalOf(
  writeFeature(
    "not-gherkin.feature",
    "Feature: A shop\n  Scenario: Opening\n    Given the shop is open\n  this line is not Gherkin\n",
  ),
);

Given("the shop is open", () => {});
const caseOnlyDuplicates = refusalOf(
  writeFeature(
    "case-only-duplicates.feature",
    "Feature: A shop with one title in three spellings\n" +
      "  Scenario: Refunding a shirt\n    Given the shop is open\n" +
      "  Scenario: refunding a SHIRT\n    Given the shop is open\n" +
      "  Scenario: REFUNDING A SHIRT\n    Given the shop is open\n",
  ),
);

let headerOnly = "not called";
Given("the stock list is", (table) => {
  headerOnly = table;
});
Fusion(
  writeFeature(
    "header-only.feature",
    "Feature: A shop with an empty stock list\n" +
      "  Scenario: Reading an empty list\n" +
      "    Given the stock list is\n" +
      "      | product | count |\n",
  ),
);

describe("refusal edges", () => {
  test("a feature file that is not valid Gherkin is refused by name and registers nothing", () => {
    expect(notGherkin.message).toMatch(/^Error parsing feature Gherkin: /);
    expect(notGherkin.message).toContain("this line is not Gherkin");
    expect(notGherkin.registered).toEqual({ describe: 0, test: 0 });
  });

  test("titles that differ only in letter case are one duplicated title, counted together", () => {
    expect(caseOnlyDuplicates.message).not.toBeNull();
    const entries = caseOnlyDuplicates.message
      .split("\n")
      .filter((line) => /^\s+\d+\. "/.test(line))
      .map((line) => line.trim());
    expect(entries).toEqual(['1. "Refunding a shirt" is declared 3 times']);
    expect(caseOnlyDuplicates.registered).toEqual({ describe: 0, test: 0 });
  });

  test("a header-only data table reaches its step as an empty list of rows", () => {
    expect(headerOnly).toStrictEqual([]);
  });
});
