// Behaviours a mutant changed without any test noticing.
//
// Stryker on master (63cfdcf, 2026-10-10) left 121 mutants alive; docs/feature/mutation-triage
// /plan.md gives every verdict. Most were equivalent (a fallback Gherkin never takes) or
// message prose the suite deliberately does not pin. These are the ones that changed something
// a consumer relies on; each test here failed on its mutant before it was added.
import fs from "fs";
import os from "os";
import path from "path";

import { Given, When, Fusion } from "../../../../src/index.js";

const featureDir = fs.mkdtempSync(path.join(os.tmpdir(), "fusion-survivors-"));
afterAll(() => fs.rmSync(featureDir, { recursive: true, force: true }));
const writeFeature = (text) => {
  const featurePath = path.join(featureDir, `f${Math.random()}.feature`);
  fs.writeFileSync(featurePath, text);
  return featurePath;
};

// Runs registerSteps, then Fusion on featureText, recording the tests instead of registering
// them with Jest. Returns the refusal message, or the recorded test bodies.
const realJest = { describe: global.describe, test: global.test };
const fusionOf = (featureText, registerSteps, options) => {
  const featurePath = writeFeature(featureText);
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
    return { refusal: refusal.message, bodies };
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
const callRefusal = (call) => {
  try {
    call();
    return null;
  } catch (refusal) {
    return refusal.message;
  }
};

describe("step arguments", () => {
  // #646, #647: rows built read-only would throw in an ES module when a step edits one.
  test("a table row is an ordinary object a step can change and delete from", async () => {
    let rows;
    const { bodies } = fusionOf(
      "Feature: Rows\n  Scenario: Editing\n    Given the list\n" +
        "      | name | qty |\n      | tea  | 2   |\n",
      () =>
        Given("the list", (table) => {
          table[0].qty = "3";
          delete table[0].name;
          rows = table;
        }),
    );
    await bodies[0]();
    expect(rows).toStrictEqual([{ qty: "3" }]);
  });
});

describe("feature validation", () => {
  // #315, #317: only the plural form was pinned.
  test("one duplicated title is reported in the singular", () => {
    const { refusal } = fusionOf(
      "Feature: Twice\n" +
        "  Scenario: Alpha\n    Given the shop is open\n" +
        "  Scenario: Alpha\n    Given the shop is open\n",
      () => Given("the shop is open", () => {}),
    );
    expect(refusal.split("\n")[0]).toBe(
      'Duplicate scenario title: 1 title is declared more than once in the feature "Twice".',
    );
  });
});

describe("options", () => {
  // #173: errors: null is "no change", like undefined; the validations stay on.
  test("errors: null leaves the default validations on rather than being refused", () => {
    const { refusal } = fusionOf(
      "Feature: Half written\n  Scenario: Unbound\n    Given a step nobody wrote\n",
      () => {},
      { errors: null },
    );
    expect(refusal).toMatch(
      /^Fusion found 1 step in the feature "Half written"/,
    );
  });
});

describe("refusals at the call", () => {
  // #423: null and undefined are named as themselves, not as "object null".
  test("a null matcher is named as null", () => {
    expect(callRefusal(() => Given(null, () => {})).split("\n")[0]).toBe(
      "Unsupported step matcher: Given was given null.",
    );
  });

  // #443, #444, #445: the example is the consumer's own call with a function added.
  test("the missing step function refusal shows the call to write", () => {
    expect(callRefusal(() => Given("the shop is open"))).toContain(
      '      Given("the shop is open", () => { ... }).',
    );
  });

  // #484: a chain is only a chain when no function is passed beside it.
  test("a chain passed together with a function is refused, not silently chained", () => {
    const chain = When("the till opens", () => {});
    expect(
      (callRefusal(() => Given(chain, () => {})) || "").split(":")[0],
    ).toBe("Unsupported step matcher");
  });
});

describe("binding", () => {
  // #672, #673, #674: the refusal names every definition that matched, not just their count.
  test("an ambiguous step's refusal names both matching definitions", () => {
    const { refusal } = fusionOf(
      "Feature: Ambiguous\n  Scenario: Two matches\n    Given a box\n",
      () => {
        Given(/^a (.*)$/, () => {});
        Given(/^a box$/, () => {});
      },
    );
    expect(refusal).toBe(
      'Ambiguous step definition: "a box" matches 2 step definitions: "^a (.*)$", "^a box$"',
    );
  });
});

describe("failing steps", () => {
  // #786, #788: a stack that does not start with the old message is left as it was.
  test("an error with its own stack keeps that stack", async () => {
    const thrown = new Error("jammed");
    thrown.stack = "custom first line\n    at somewhere (steps.js:1:1)";
    const { bodies } = fusionOf(
      "Feature: Stack\n  Scenario: Custom\n    Given the till jams\n",
      () =>
        Given("the till jams", () => {
          throw thrown;
        }),
    );
    const failure = await rejectionOf(bodies[0]);
    expect({ same: failure === thrown, stack: failure.stack }).toEqual({
      same: true,
      stack: "custom first line\n    at somewhere (steps.js:1:1)",
    });
  });

  // #789: an error without a stack is still the step's own error, not a wrapper.
  test("an error with no stack is rethrown as itself", async () => {
    const thrown = new TypeError("no stack");
    thrown.stack = undefined;
    const { bodies } = fusionOf(
      "Feature: Stack\n  Scenario: None\n    Given the till fails\n",
      () =>
        Given("the till fails", () => {
          throw thrown;
        }),
    );
    const failure = await rejectionOf(bodies[0]);
    expect(failure === thrown).toBe(true);
  });

  // #800: a thrown object that is not an Error is reported by its message.
  test("a thrown object with a message is reported by that message", async () => {
    const { bodies } = fusionOf(
      "Feature: Thrown\n  Scenario: Object\n    Given the till objects\n",
      () =>
        Given("the till objects", () => {
          throw { message: "out of paper" };
        }),
    );
    const failure = await rejectionOf(bodies[0]);
    expect(failure.message.split("\n").pop()).toBe("Error: out of paper");
  });
});

describe("starter code", () => {
  // #100: the parameter list comes from the step that carries an argument, wherever it sits.
  // Steps that differ only in a value share one shape; the later one carries the docstring.
  test("a docString parameter is suggested when only a later step of the shape has one", () => {
    const { refusal } = fusionOf(
      "Feature: Notes\n" +
        "  Scenario: Plain\n    Given note 1\n" +
        '  Scenario: With text\n    Given note 2\n      """\n      hello\n      """\n',
      () => {},
    );
    expect(refusal).toContain(
      String.raw`Given(/^note (\d+)$/, (arg0, docString) => {});`,
    );
  });
});
