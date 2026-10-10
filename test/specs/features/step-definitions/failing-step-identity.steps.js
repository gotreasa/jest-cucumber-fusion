// A failing step reports the error the step threw, not a new one.
//
// A fresh adversarial review of PR #16 (2026-10-10, finding B1) found that a failing step was
// rethrown as a brand-new Error carrying only the decorated message. Jest then had no stack
// frame in the consumer's steps file, so it showed no code frame, and the error's class
// (TypeError), and properties such as expect's matcherResult, were lost. jest-cucumber, and so
// 2.0.0, kept the original error and rewrote its message. These pin that: the same object is
// rethrown, its message carries the decoration byte for byte, and its stack still names this
// file.
import fs from "fs";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";

import { Given, Fusion } from "../../../../src/index.js";

const thisFile = fileURLToPath(import.meta.url);
const featureDir = fs.mkdtempSync(path.join(os.tmpdir(), "fusion-identity-"));
afterAll(() => fs.rmSync(featureDir, { recursive: true, force: true }));

const realJest = { describe: global.describe, test: global.test };
const registeredTests = (featureText, registerSteps) => {
  const featurePath = path.join(featureDir, `f${Math.random()}.feature`);
  fs.writeFileSync(featurePath, featureText);
  registerSteps();
  const tests = [];
  global.describe = (title, body) => body();
  global.test = (name, body) => tests.push(body);
  try {
    Fusion(featurePath);
  } finally {
    global.describe = realJest.describe;
    global.test = realJest.test;
  }
  return tests;
};
const rejectionOf = async (body) => {
  try {
    await body();
    return null;
  } catch (failure) {
    return failure;
  }
};

let thrownTypeError;
const typeErrorTests = registeredTests(
  "Feature: Identity\n  Scenario: Type error\n    Given the step reads 3 from nothing\n",
  () =>
    Given(/^the step reads (\d+) from nothing$/, () => {
      thrownTypeError = new TypeError("Cannot read properties of undefined");
      throw thrownTypeError;
    }),
);

const expectationTests = registeredTests(
  "Feature: Identity\n  Scenario: Expectation\n    Given the total is 4\n",
  () =>
    Given(/^the total is (\d+)$/, (total) => {
      expect(Number(total)).toBe(5);
    }),
);

const emptyMessageTests = registeredTests(
  "Feature: Identity\n  Scenario: Empty message\n    Given the step fails quietly\n",
  () =>
    Given("the step fails quietly", () => {
      throw new Error("");
    }),
);

let frozenError;
const frozenTests = registeredTests(
  "Feature: Identity\n  Scenario: Frozen\n    Given the step throws a frozen error\n",
  () =>
    Given("the step throws a frozen error", () => {
      frozenError = Object.freeze(new RangeError("out of range"));
      throw frozenError;
    }),
);

test("the step's own error is rethrown, with its class", async () => {
  const failure = await rejectionOf(typeErrorTests[0]);
  expect({
    same: failure === thrownTypeError,
    name: failure && failure.name,
  }).toEqual({ same: true, name: "TypeError" });
});

test("its message carries the decoration byte for byte", async () => {
  const failure = await rejectionOf(typeErrorTests[0]);
  expect(failure.message).toBe(
    'Failing step: "the step reads 3 from nothing"\n\n' +
      'Step arguments: ["3"]\n\n' +
      "Error: Cannot read properties of undefined",
  );
});

test("its stack opens with the decorated message and still names the steps file", async () => {
  const failure = await rejectionOf(typeErrorTests[0]);
  expect({
    header: failure.stack.startsWith(`TypeError: ${failure.message}\n`),
    stepsFileFrame: failure.stack.includes(thisFile),
  }).toEqual({ header: true, stepsFileFrame: true });
});

test("an expect failure keeps its matcherResult, so Jest can show the diff", async () => {
  const failure = await rejectionOf(expectationTests[0]);
  expect({
    matcherResult: Boolean(failure.matcherResult),
    stepsFileFrame: failure.stack.includes(thisFile),
    decorated: failure.message.startsWith('Failing step: "the total is 4"'),
  }).toEqual({ matcherResult: true, stepsFileFrame: true, decorated: true });
});

test("an error with an empty message reports an empty message, as 2.0.0 did", async () => {
  const failure = await rejectionOf(emptyMessageTests[0]);
  expect(failure.message).toBe(
    'Failing step: "the step fails quietly"\n\n' +
      "Step arguments: []\n\n" +
      "Error: ",
  );
});

test("an error that cannot be rewritten is wrapped, keeping it as the cause", async () => {
  const failure = await rejectionOf(frozenTests[0]);
  expect({
    message: failure.message,
    cause: failure.cause === frozenError,
  }).toEqual({
    message:
      'Failing step: "the step throws a frozen error"\n\n' +
      "Step arguments: []\n\n" +
      "Error: out of range",
    cause: true,
  });
});
