// A consumer's code can throw anything, and Fusion still reports what it threw.
//
// The fuzz run on PR #36 (2026-10-11) threw 91 kinds of value from a scenarioNameTemplate, and
// 19 of them made the refusal itself throw a TypeError: a template literal cannot turn a Symbol,
// an object with no prototype, or an object whose message getter throws into text. A failing
// step quoted what it threw the same way. Either way the consumer saw "Cannot convert a Symbol
// value to a string" instead of their own failure. These pin the report for each.
import fs from "fs";
import os from "os";
import path from "path";

import { Given, Fusion } from "../../../../src/index.js";

const featureDir = fs.mkdtempSync(
  path.join(os.tmpdir(), "fusion-unprintable-"),
);
afterAll(() => fs.rmSync(featureDir, { recursive: true, force: true }));

// Runs registerSteps, then Fusion on featureText, recording the tests instead of registering
// them with Jest. Returns the refusal, or the recorded test bodies.
const realJest = { describe: global.describe, test: global.test };
const fusionOf = (featureText, registerSteps, options) => {
  const featurePath = path.join(featureDir, `f${Math.random()}.feature`);
  fs.writeFileSync(featurePath, featureText);
  const bodies = [];
  global.describe = (title, body) => body();
  global.test = Object.assign((name, body) => bodies.push(body), {
    skip: () => {},
  });
  try {
    registerSteps();
    Fusion(featurePath, options);
    return { refusal: null, bodies };
  } catch (refusal) {
    return { refusal, bodies };
  } finally {
    global.describe = realJest.describe;
    global.test = realJest.test;
  }
};
const rejectionOf = async (body) => {
  try {
    await body();
    return null;
  } catch (failure) {
    return failure;
  }
};

const withThrowingMessage = () => ({
  get message() {
    throw new Error("the message getter broke");
  },
});

const unprintable = [
  ["a Symbol", () => Symbol("broken"), "Symbol(broken)"],
  ["an object with no prototype", () => Object.create(null), "object {}"],
  [
    "an object whose message getter throws",
    withThrowingMessage,
    "object { message: [Getter] }",
  ],
];

describe("a scenarioNameTemplate that throws", () => {
  test.each(unprintable)(
    "%s is refused, naming what it threw",
    (kind, thrownValue, shown) => {
      const { refusal } = fusionOf(
        "Feature: Names\n  Scenario: Odd\n    Given the shop is open\n",
        () => Given("the shop is open", () => {}),
        {
          scenarioNameTemplate: () => {
            throw thrownValue();
          },
        },
      );
      expect({
        isError: refusal instanceof Error,
        what: refusal.message
          .split("\n")
          .find((line) => line.startsWith("WHAT:")),
      }).toEqual({
        isError: true,
        what: `WHAT: the scenarioNameTemplate threw: ${shown}`,
      });
    },
  );
});

describe("a step that throws", () => {
  test.each(unprintable)(
    "%s fails the scenario, naming what it threw",
    async (kind, thrownValue, shown) => {
      const { bodies } = fusionOf(
        "Feature: Steps\n  Scenario: Odd\n    Given the till fails oddly\n",
        () =>
          Given("the till fails oddly", () => {
            throw thrownValue();
          }),
      );
      const failure = await rejectionOf(bodies[0]);
      expect({
        isError: failure instanceof Error,
        last: failure.message.split("\n").pop(),
      }).toEqual({ isError: true, last: `Error: ${shown}` });
    },
  );

  // Telling an Error from anything else reads the value too: a Proxy whose traps throw, or a
  // revoked one, broke that check, and an Error whose message is a Symbol broke the quote.
  const revokedProxy = () => {
    const { proxy, revoke } = Proxy.revocable({}, {});
    revoke();
    return proxy;
  };
  test.each([
    [
      "a Proxy whose traps throw",
      () =>
        new Proxy(
          {},
          {
            get() {
              throw new Error("trap");
            },
          },
        ),
    ],
    ["a revoked Proxy", revokedProxy],
    [
      "an Error whose message is a Symbol",
      () => Object.assign(new Error("x"), { message: Symbol("m") }),
    ],
  ])("%s still fails the scenario with its own report", async (kind, make) => {
    const { bodies } = fusionOf(
      "Feature: Steps\n  Scenario: Odd\n    Given the till fails oddly\n",
      () =>
        Given("the till fails oddly", () => {
          throw make();
        }),
    );
    const failure = await rejectionOf(bodies[0]);
    expect({
      isError: failure instanceof Error,
      first: failure.message.split("\n")[0],
    }).toEqual({
      isError: true,
      first: 'Failing step: "the till fails oddly"',
    });
  });
});
