// Misuses are refused with a message that names the mistake.
//
// A fresh fuzz of PR #16 (2026-10-10) found misuses that reached the consumer as an internal
// name or a raw Node error: a step registered with no function failed only when it ran, as
// "step.bound.stepFn is not a function"; Fusion() given no path or a number threw Node's
// "The "paths[1]" argument must be of type string"; a directory threw EISDIR; a template that
// was not a function was reported as having thrown "scenarioNameTemplate is not a function";
// an async template "returned object {}"; and `errors: 0` silently meant "no change".
import fs from "fs";
import os from "os";
import path from "path";

import { Given, When, Fusion } from "../../../../src/index.js";

const featureDir = fs.mkdtempSync(path.join(os.tmpdir(), "fusion-refusals-"));
afterAll(() => fs.rmSync(featureDir, { recursive: true, force: true }));
const feature = path.join(featureDir, "shop.feature");
fs.writeFileSync(
  feature,
  "Feature: Shop\n  Scenario: Open\n    Given the shop is open\n",
);

const refusalOf = (call) => {
  try {
    call();
    return null;
  } catch (refusal) {
    return refusal.message;
  }
};
const realJest = { describe: global.describe, test: global.test };
const fusionRefusal = (options) => {
  Given("the shop is open", () => {});
  global.describe = (title, body) => body();
  global.test = () => {};
  try {
    return refusalOf(() => Fusion(feature, options));
  } finally {
    global.describe = realJest.describe;
    global.test = realJest.test;
  }
};

test("a step definition without a function is refused at the call", () => {
  const refusals = {
    none: refusalOf(() => Given("the shop is open")),
    number: refusalOf(() => When(/^it opens$/, 42)),
  };
  expect({
    none: refusals.none && refusals.none.split("\n")[0],
    number: refusals.number && refusals.number.split("\n")[0],
  }).toEqual({
    none: 'Missing step function: Given("the shop is open") was given undefined.',
    number: "Missing step function: When(/^it opens$/) was given number 42.",
  });
});

test("Fusion() without a path string is refused, naming what it was given", () => {
  const refusals = [undefined, 42].map(
    (given) => (refusalOf(() => Fusion(given)) || "").split("\n")[0],
  );
  expect(refusals).toEqual([
    "Fusion needs the feature file's path as a string, but was given undefined.",
    "Fusion needs the feature file's path as a string, but was given number 42.",
  ]);
});

test("Fusion() pointed at a directory says so", () => {
  expect((refusalOf(() => Fusion(featureDir)) || "").split(" (")[0]).toBe(
    "Feature path is a directory, not a feature file",
  );
});

test("a scenarioNameTemplate that is not a function is refused as such", () => {
  expect(fusionRefusal({ scenarioNameTemplate: "abc" })).toMatch(
    /WHAT: the scenarioNameTemplate is string "abc", not a function\./,
  );
});

test("an async scenarioNameTemplate is told the name must come back synchronously", () => {
  expect(fusionRefusal({ scenarioNameTemplate: async () => "name" })).toMatch(
    /WHAT: the scenarioNameTemplate returned a Promise\./,
  );
});

test("errors that is not true, false or an object is refused", () => {
  expect((fusionRefusal({ errors: 0 }) || "").split("\n")[0]).toBe(
    "The errors option must be true, false or an object, but was given number 0.",
  );
});
