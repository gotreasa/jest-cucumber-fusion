// Names that Object.prototype also uses are ordinary text to Fusion.
//
// A fresh fuzz of PR #16 (2026-10-10, findings B1 and B2, both also in 2.0.0) found that a step
// whose text was `constructor`, `toString` or `__proto__` could never be registered (the
// duplicate check found the inherited property and refused the first registration), and that
// a data table column headed `__proto__` vanished from its row (assigning the key called the
// prototype setter). These pin both, and that a row is still a plain object, so a consumer's
// toStrictEqual against an object literal keeps passing.
import fs from "fs";
import os from "os";
import path from "path";

import { Given, Fusion } from "../../../../src/index.js";

const featureDir = fs.mkdtempSync(path.join(os.tmpdir(), "fusion-proto-"));
afterAll(() => fs.rmSync(featureDir, { recursive: true, force: true }));

const realJest = { describe: global.describe, test: global.test };
const outcomeOf = async (featureText, registerSteps) => {
  const featurePath = path.join(featureDir, `f${Math.random()}.feature`);
  fs.writeFileSync(featurePath, featureText);
  const tests = [];
  try {
    registerSteps();
    global.describe = (title, body) => body();
    global.test = (name, body) => tests.push(body);
    Fusion(featurePath);
  } catch (refusal) {
    return `refused: ${refusal.message.split("\n")[0]}`;
  } finally {
    global.describe = realJest.describe;
    global.test = realJest.test;
  }
  try {
    for (const body of tests) await body();
    return "passed";
  } catch (failure) {
    return `failed: ${failure.message.split("\n")[0]}`;
  }
};

test("steps whose text is an Object.prototype name register and run", async () => {
  const ran = [];
  const outcomes = {};
  for (const name of [
    "constructor",
    "toString",
    "__proto__",
    "hasOwnProperty",
  ]) {
    outcomes[name] = await outcomeOf(
      `Feature: Prototype names\n  Scenario: ${name}\n    Given ${name}\n`,
      () => Given(name, () => ran.push(name)),
    );
  }
  expect({ outcomes, ran }).toEqual({
    outcomes: {
      constructor: "passed",
      toString: "passed",
      __proto__: "passed",
      hasOwnProperty: "passed",
    },
    ran: ["constructor", "toString", "__proto__", "hasOwnProperty"],
  });
});

test("a regular expression whose source is a prototype name registers too", async () => {
  expect(
    await outcomeOf(
      "Feature: Prototype regex\n  Scenario: regex\n    Given constructor\n",
      () => Given(/constructor/, () => {}),
    ),
  ).toBe("passed");
});

test("a table column headed __proto__ reaches the row, which stays a plain object", async () => {
  let received;
  const outcome = await outcomeOf(
    "Feature: Prototype column\n  Scenario: table\n    Given the table\n" +
      "      | __proto__ | constructor | b |\n      | 1 | 2 | 3 |\n",
    () =>
      Given("the table", (rows) => {
        received = rows;
      }),
  );
  expect({
    outcome,
    row: received,
    plain: Object.getPrototypeOf(received[0]) === Object.prototype,
  }).toStrictEqual({
    outcome: "passed",
    row: [JSON.parse('{ "__proto__": "1", "constructor": "2", "b": "3" }')],
    plain: true,
  });
});
