// Behaviours reachable through the public API that no test pinned. Line coverage was already
// 100%; these were untaken BRANCH arms (Gearoid, 2026-10-09: "add the tests and the Given(42)
// refusal"):
//   - errors: true switches every check on (configuration.js);
//   - two duplicated titles are reported in the plural (feature-source.js);
//   - a file with no Feature keyword registers nothing (feature-source.js);
//   - scenariosMustMatchFeatureFile: false accepts duplicated titles (feature-source.js);
//   - a step that throws a non-Error is reported with what it threw (test-registration.js);
//   - a matcher that is neither a string nor a RegExp is refused at the call (index.js). Until
//     this change it was silently ignored, so the scenario failed later as an unbound step.
import fs from "fs";
import os from "os";
import path from "path";

import { Given, When, Fusion } from "../../../../src/index.js";

const featureDir = fs.mkdtempSync(path.join(os.tmpdir(), "fusion-branches-"));
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

// Record what one Fusion() call registers instead of handing it to Jest, so a scenario that
// is meant to fail can be run and observed here without failing this file.
const realJest = { describe: global.describe, test: global.test };
const recordRegistrations = (callFusion) => {
  const recorded = { describes: [], tests: [] };
  global.describe = (title, body) => {
    recorded.describes.push(title);
    body();
  };
  global.test = (name, body) => recorded.tests.push({ name, body });
  try {
    callFusion();
  } finally {
    global.describe = realJest.describe;
    global.test = realJest.test;
  }
  return recorded;
};

// errors: true switches every check on, so an unbound step is refused.
const unbound = writeFeature(
  "unbound.feature",
  "Feature: Half written\n  Scenario: Unbound\n    Given a step nobody wrote\n",
);
const errorsTrueRefusal = refusalOf(() => Fusion(unbound, { errors: true }));

// Two titles each declared twice: the refusal counts them in the plural.
const twoDuplicates = writeFeature(
  "two-duplicates.feature",
  "Feature: Twice over\n" +
    "  Scenario: Alpha\n    Given the shop is open\n" +
    "  Scenario: Alpha\n    Given the shop is open\n" +
    "  Scenario: Beta\n    Given the shop is open\n" +
    "  Scenario: Beta\n    Given the shop is open\n",
);
Given("the shop is open", () => {});
const pluralRefusal = refusalOf(() => Fusion(twoDuplicates));

// A file holding no Feature keyword: accepted, and nothing is registered.
const noFeature = writeFeature("comment-only.feature", "# only a comment\n");
const noFeatureRegistered = recordRegistrations(() => Fusion(noFeature));

// scenariosMustMatchFeatureFile: false accepts the duplicated titles and runs every scenario.
const opened = [];
Given("the shop is open", () => opened.push("opened"));
const duplicatesAccepted = recordRegistrations(() =>
  Fusion(twoDuplicates, { errors: { scenariosMustMatchFeatureFile: false } }),
);

// A step that throws a string, not an Error.
const throwing = writeFeature(
  "throwing.feature",
  "Feature: Thrower\n  Scenario: Throws a string\n    Given the step throws a string\n",
);
Given("the step throws a string", () => {
  throw "the till is jammed";
});
const throwingRegistered = recordRegistrations(() => Fusion(throwing));

// Matchers that are neither a string nor a RegExp, refused at the call.
const matcherRefusals = {
  number: refusalOf(() => Given(42, () => {})),
  object: refusalOf(() => When({ text: "the shop opens" }, () => {})),
  undefined: refusalOf(() => Given(undefined, () => {})),
};
Fusion(writeFeature("empty-registry.feature", "# nothing to bind\n"));

describe("branch behaviours no other suite pinned", () => {
  test("errors: true switches every check on", () => {
    expect(errorsTrueRefusal).toMatch(
      /^Fusion found 1 step in the feature "Half written"/,
    );
  });

  test("two duplicated titles are reported in the plural", () => {
    expect(pluralRefusal).toMatch(
      /^Duplicate scenario title: 2 titles are declared more than once in the feature "Twice over"\./,
    );
  });

  test("a file with no Feature keyword registers nothing", () => {
    expect(noFeatureRegistered).toEqual({ describes: [], tests: [] });
  });

  test("scenariosMustMatchFeatureFile: false accepts duplicated titles", async () => {
    expect(duplicatesAccepted.describes).toEqual(["Twice over"]);
    expect(duplicatesAccepted.tests.map((each) => each.name)).toEqual([
      "Alpha",
      "Alpha",
      "Beta",
      "Beta",
    ]);
    for (const each of duplicatesAccepted.tests) await each.body();
    expect(opened).toHaveLength(4);
  });

  test("a step that throws a non-Error is reported with what it threw", async () => {
    const [onlyTest] = throwingRegistered.tests;
    await expect(onlyTest.body()).rejects.toThrow(
      'Failing step: "the step throws a string"\n\n' +
        "Step arguments: []\n\n" +
        "Error: the till is jammed",
    );
  });

  test("a matcher that is neither a string nor a RegExp is refused at the call", () => {
    expect(matcherRefusals.number).toMatch(
      /^Unsupported step matcher: Given was given number 42\./,
    );
    expect(matcherRefusals.object).toMatch(
      /^Unsupported step matcher: When was given object \{ text: 'the shop opens' \}\./,
    );
    expect(matcherRefusals.undefined).toMatch(
      /^Unsupported step matcher: Given was given undefined\./,
    );
    // One assertion over every refusal, so a failure names each case that misses the advice.
    expect(
      Object.entries(matcherRefusals)
        .filter(
          ([, message]) =>
            !String(message).includes("a string or a regular expression"),
        )
        .map(([kind]) => kind),
    ).toEqual([]);
  });
});
