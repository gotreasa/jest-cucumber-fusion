// The starter code an unmatched-step refusal suggests must work when pasted: it compiles, its
// matcher binds the very step it was suggested for, and the step receives one value per
// suggested parameter. Driven the way a consumer meets it: Fusion refuses, the snippet is taken
// from the refusal, registered, and Fusion is called again on the same feature.
//
// Found by fuzzing on 2026-10-08 (docs/feature/drop-jest-cucumber/plan.md, "Post-delivery
// probes"): a decimal or signed number was suggested as (\d+), which cannot match it, and a "/"
// was left unescaped inside the regex literal, so the snippet was not valid JavaScript. Both
// were inherited from jest-cucumber's generator.
//
// The seed is fixed so a failure reproduces; widen with SNIPPET_SEED=<n> SNIPPET_RUNS=<n>.
const fs = require("fs");
const os = require("os");
const path = require("path");
const fc = require("fast-check");

const { Given, When, Then, And, But, Fusion } = require("../../../../src");

const SEED = Number(process.env.SNIPPET_SEED || 20261008);
const RUNS = Number(process.env.SNIPPET_RUNS || 150);

const featureDir = fs.mkdtempSync(path.join(os.tmpdir(), "fusion-snippet-"));
let featureCount = 0;
const writeFeature = (body) => {
  featureCount += 1;
  const featurePath = path.join(featureDir, `snippet-${featureCount}.feature`);
  fs.writeFileSync(featurePath, body);
  return featurePath;
};
afterAll(() => fs.rmSync(featureDir, { recursive: true, force: true }));

const VERBS = {
  given: "Given",
  when: "When",
  then: "Then",
  and: "And",
  but: "But",
};
const REAL_VERBS = { Given, When, Then, And, But };

// The refusal names each unbound step on its own line and puts its starter code on the next.
const snippetFor = (refusal, stepText) => {
  const lines = String(refusal.message).split("\n");
  const entry = lines.findIndex((line) =>
    line.includes(`No step definition matches: "${stepText}"`)
  );
  return entry === -1 ? null : lines[entry + 1].trim();
};

// Evaluate the pasted snippet against stand-in verbs to read the matcher and the step function
// it declares, so the test can register the SAME matcher with a recording step function.
const declaredBy = (snippet) => {
  const declared = {};
  const recordAs = (verb) => (matcher, stepFunction) =>
    Object.assign(declared, { verb, matcher, arity: stepFunction.length });
  new Function(...Object.keys(REAL_VERBS), snippet)(
    ...Object.keys(REAL_VERBS).map(recordAs)
  );
  return declared;
};

const pasteAndBind = (keyword, stepText, caseLabel) => {
  const outcome = {
    refused: false,
    snippet: null,
    compileError: null,
    bindError: null,
    received: [],
  };
  const feature = writeFeature(
    `Feature: snippet ${caseLabel}\n` +
      `  Scenario: the suggested code binds its own step\n` +
      `    Given the snippet test starts\n` +
      `    ${VERBS[keyword]} ${stepText}\n`
  );

  Given("the snippet test starts", () => {});
  try {
    Fusion(feature);
  } catch (refusal) {
    outcome.refused = true;
    outcome.snippet = snippetFor(refusal, stepText);
  }

  let declared = null;
  try {
    declared = outcome.snippet && declaredBy(outcome.snippet);
  } catch (compileError) {
    outcome.compileError = compileError.message;
  }

  Given("the snippet test starts", () => {});
  try {
    if (declared)
      REAL_VERBS[declared.verb](declared.matcher, (...values) => {
        outcome.received.push(values.length);
      });
    Fusion(feature);
  } catch (bindError) {
    outcome.bindError = String(bindError.message).split("\n")[0];
  }

  outcome.arity = declared ? declared.arity : null;
  return outcome;
};

const expectPastedSnippetToWork = (outcome) => {
  expect(outcome.refused).toBe(true);
  expect(outcome.snippet).not.toBeNull();
  expect(outcome.compileError).toBeNull();
  expect(outcome.bindError).toBeNull();
  // Ran once, and received exactly the parameters the snippet declared.
  expect(outcome.received).toEqual([outcome.arity]);
};

// Named examples: the shapes the fuzz found, plus the ones that already worked, each with the
// EXACT code it must suggest. Binding alone cannot tell a right capture count from a wrong one
// (the arity above is read off the snippet itself), so the text is pinned too: an integer keeps
// the familiar (\d+), "12" is one capture and not two, and every matcher is anchored.
const EXAMPLES = [
  [
    "given",
    "the price is 3.14 pounds",
    String.raw`Given(/^the price is ([-+]?\d*\.?\d+) pounds$/, (arg0) => {});`,
  ],
  [
    "when",
    "the balance is -5",
    String.raw`When(/^the balance is ([-+]?\d*\.?\d+)$/, (arg0) => {});`,
  ],
  [
    "then",
    "the discount is .5",
    String.raw`Then(/^the discount is ([-+]?\d*\.?\d+)$/, (arg0) => {});`,
  ],
  [
    "given",
    "the count is +3",
    String.raw`Given(/^the count is ([-+]?\d*\.?\d+)$/, (arg0) => {});`,
  ],
  [
    "and",
    "a ratio of 1/2",
    String.raw`And(/^a ratio of (\d+)\/(\d+)$/, (arg0, arg1) => {});`,
  ],
  ["but", "the path is /tmp/a/b", `But("the path is /tmp/a/b", () => {});`],
  [
    "given",
    "I have 12 apples",
    String.raw`Given(/^I have (\d+) apples$/, (arg0) => {});`,
  ],
  [
    "when",
    'I say "hello" twice',
    String.raw`When(/^I say "([^"]*)" twice$/, (arg0) => {});`,
  ],
  [
    "then",
    'it costs 4.20 for "a/b (c)" at 10',
    String.raw`Then(/^it costs ([-+]?\d*\.?\d+) for "([^"]*)" at (\d+)$/, (arg0, arg1, arg2) => {});`,
  ],
  // U+2028 survives Gherkin's line split and may not appear raw inside a regex literal.
  [
    "given",
    "a 3\u2028line",
    String.raw`Given(/^a (\d+)\u2028line$/, (arg0) => {});`,
  ],
  // A line terminator inside a quoted argument: "." never matches one, so the old "(.*)" could
  // not bind the step it was suggested for; the negated class does. Found by the PR #16
  // adversarial review, 2026-10-09.
  [
    "when",
    'I say "a\u2028b"',
    String.raw`When(/^I say "([^"]*)"$/, (arg0) => {});`,
  ],
  [
    "then",
    'quoted "x\ry"',
    String.raw`Then(/^quoted "([^"]*)"$/, (arg0) => {});`,
  ],
  // A lone carriage return survives Gherkin's \r?\n line split. Raw, it ends a string or a
  // regex literal, so the suggested code did not compile.
  [
    "given",
    "carriage\rreturn",
    String.raw`Given("carriage\rreturn", () => {});`,
  ],
  ["and", "a 3\rline", String.raw`And(/^a (\d+)\rline$/, (arg0) => {});`],
];
EXAMPLES.forEach(([keyword, stepText, expectedSnippet], index) => {
  const outcome = pasteAndBind(keyword, stepText, `example ${index}`);
  test(`the suggested code for ${JSON.stringify(
    stepText
  )} is exactly ${expectedSnippet}, compiles and binds its own step`, () => {
    expect(outcome.snippet).toBe(expectedSnippet);
    expectPastedSnippetToWork(outcome);
  });
});

// Property: arbitrary step text, biased towards numbers, quotes and regex metacharacters.
const token = fc.oneof(
  { weight: 3, arbitrary: fc.stringMatching(/^[A-Za-z]{1,8}$/) },
  { weight: 2, arbitrary: fc.integer({ min: -999, max: 99999 }).map(String) },
  {
    weight: 2,
    arbitrary: fc
      .double({ min: -1000, max: 1000, noNaN: true })
      .map((d) => d.toFixed(2)),
  },
  {
    weight: 1,
    arbitrary: fc.constantFrom(".5", "+3", "-0", "007", "1.", "3.14"),
  },
  {
    weight: 2,
    arbitrary: fc.stringMatching(/^[A-Za-z0-9 ]{1,10}$/).map((s) => `"${s}"`),
  },
  {
    weight: 2,
    arbitrary: fc.constantFrom(
      "(",
      ")",
      "[",
      "]",
      "{",
      "}",
      "*",
      "+",
      "?",
      "^",
      "$",
      ".",
      "|",
      "\\",
      "/",
      "'",
      "`",
      "<",
      ">",
      "&",
      "%",
      "é",
      "日本"
    ),
  }
);
const stepTextArbitrary = fc
  .array(token, { minLength: 1, maxLength: 7 })
  .map((parts) => parts.join(" ").replace(/\s+/g, " ").trim())
  .filter(
    (text) => text.length > 0 && !/^[#|]/.test(text) && !text.startsWith('"""')
  );
const keywordArbitrary = fc.constantFrom("given", "when", "then", "and", "but");

fc.sample(fc.tuple(keywordArbitrary, stepTextArbitrary), {
  seed: SEED,
  numRuns: RUNS,
}).forEach(([keyword, stepText], index) => {
  const outcome = pasteAndBind(
    keyword,
    stepText,
    `property case ${index} (seed ${SEED})`
  );
  test(`property case ${index} (seed ${SEED}): ${JSON.stringify(
    stepText
  )} binds after pasting`, () => {
    expectPastedSnippetToWork(outcome);
  });
});

// Every snippet of ONE refusal, pasted together, must load. Outline rows and steps that differ
// only by a number all suggest the same matcher, and two identical matchers under one verb are
// refused as a duplicate definition, so the refusal must suggest each matcher once. A step with
// a table and the same step without one differ only in their parameters, and still collide.
// Found by the PR #16 adversarial review, 2026-10-09.
describe("pasting every snippet of one refusal", () => {
  const feature = writeFeature(
    `Feature: snippet paste all\n` +
      `  Scenario Outline: row <n>\n` +
      `    Given I have <n> apples\n` +
      `    When I eat <n>\n` +
      `    Examples:\n` +
      `      | n |\n` +
      `      | 1 |\n` +
      `      | 2 |\n` +
      `  Scenario: with a table\n` +
      `    Given I have 7 apples\n` +
      `      | colour |\n` +
      `      | red    |\n` +
      `    Then I have 3 apples\n`
  );
  let refusal = null;
  try {
    Fusion(feature);
  } catch (error) {
    refusal = error;
  }
  const snippets = String(refusal && refusal.message)
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => /^(Given|When|Then|And|But)\(/.test(line));

  let pasteError = null;
  try {
    new Function(...Object.keys(REAL_VERBS), snippets.join("\n"))(
      ...Object.values(REAL_VERBS)
    );
    Fusion(feature);
  } catch (error) {
    pasteError = String(error.message).split("\n")[0];
  }

  // First appearance in Fusion's registration order, which puts plain scenarios before outline
  // rows (the order the 2.0.0 name baseline pins), so the Given with the table comes first.
  test("suggests each matcher once per verb, at its first appearance", () => {
    expect(snippets).toEqual([
      String.raw`Given(/^I have (\d+) apples$/, (arg0, table) => {});`,
      String.raw`Then(/^I have (\d+) apples$/, (arg0) => {});`,
      String.raw`When(/^I eat (\d+)$/, (arg0) => {});`,
    ]);
  });

  test("loads and binds every step when all of them are pasted", () => {
    expect(pasteError).toBeNull();
  });
});

// Pasting every snippet of one feature's refusal, then calling Fusion again on it: the one
// outcome a consumer cares about. Separate matchers for "1" and "1.5", or for a quoted argument
// with and without a line terminator, both match the narrower step and are refused as
// ambiguous, so steps of one shape share one definition whose captures cover all of them.
// Found by the review of the PR #16 fixes, 2026-10-09.
const pasteAllAndBind = (keyword, stepTexts, caseLabel) => {
  const feature = writeFeature(
    `Feature: paste all ${caseLabel}\n` +
      stepTexts
        .map(
          (stepText, index) =>
            `  Scenario: step ${index}\n    ${VERBS[keyword]} ${stepText}\n`
        )
        .join("")
  );
  const outcome = { message: "", snippets: [], pasteError: null };
  try {
    Fusion(feature);
  } catch (refusal) {
    outcome.message = String(refusal.message);
  }
  outcome.snippets = outcome.message
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => /^(Given|When|Then|And|But)\(/.test(line));
  try {
    new Function(...Object.keys(REAL_VERBS), outcome.snippets.join("\n"))(
      ...Object.values(REAL_VERBS)
    );
    Fusion(feature);
  } catch (error) {
    outcome.pasteError = String(error.message).split("\n")[0];
  }
  return outcome;
};

describe("one definition per step shape", () => {
  const outcome = pasteAllAndBind(
    "given",
    [
      "I weigh 1 kilo",
      "I weigh 1.5 kilo",
      "I weigh 5 kilo",
      'I say "a"',
      'I say "b\u2028c"',
      // Unbound in a second scenario too, as a Background step is in every one: named once.
      "I weigh 1 kilo",
    ],
    "shapes"
  );

  test("counts and names every unbound step, each once", () => {
    expect(outcome.message).toMatch(/^Fusion found 5 steps /);
    expect(outcome.message.split('"I weigh 1 kilo"').length - 1).toBe(1);
    for (const stepText of [
      "I weigh 1 kilo",
      "I weigh 1.5 kilo",
      "I weigh 5 kilo",
      'I say "a"',
      'I say "b\u2028c"',
    ])
      expect(outcome.message).toContain(`"${stepText}"`);
  });

  test("suggests one definition per shape, wide enough for every step in it", () => {
    expect(outcome.snippets).toEqual([
      String.raw`Given(/^I weigh ([-+]?\d*\.?\d+) kilo$/, (arg0) => {});`,
      String.raw`Given(/^I say "([^"]*)"$/, (arg0) => {});`,
    ]);
  });

  test("binds every step when all of them are pasted", () => {
    expect(outcome.pasteError).toBeNull();
  });
});

// starterCodeFor, kept for probes that drive the generator directly, answers for one step
// exactly what the refusal suggests for it.
test("starterCodeFor gives one step's starter code, as the refusal does", () => {
  const { starterCodeFor } = require("../../../../src/code-suggestion");
  expect(
    starterCodeFor({
      keyword: "given",
      stepText: "I weigh 1.5 kilo",
      stepArgument: [],
    })
  ).toBe(
    String.raw`Given(/^I weigh ([-+]?\d*\.?\d+) kilo$/, (arg0, table) => {});`
  );
});

// A greedy "(.*)" spans several quoted arguments and the text between them, so the matcher for
// the first step below also matched the second. Found by the paste-all property (seed 778),
// 2026-10-09.
describe("quoted captures stop at the closing quote", () => {
  const outcome = pasteAllAndBind(
    "given",
    ['"a" "b"', '"a" "b" 3 "c"'],
    "greedy quotes"
  );

  test("binds both steps when both are pasted", () => {
    expect(outcome.snippets).toEqual([
      String.raw`Given(/^"([^"]*)" "([^"]*)"$/, (arg0, arg1) => {});`,
      String.raw`Given(/^"([^"]*)" "([^"]*)" (\d+) "([^"]*)"$/, (arg0, arg1, arg2, arg3) => {});`,
    ]);
    expect(outcome.pasteError).toBeNull();
  });
});

fc.sample(
  fc.tuple(
    keywordArbitrary,
    fc.uniqueArray(stepTextArbitrary, { minLength: 2, maxLength: 6 })
  ),
  { seed: SEED + 1, numRuns: Math.ceil(RUNS / 3) }
).forEach(([keyword, stepTexts], index) => {
  const outcome = pasteAllAndBind(
    keyword,
    stepTexts,
    `property case ${index} (seed ${SEED + 1})`
  );
  test(`paste-all property case ${index} (seed ${SEED + 1}): ${JSON.stringify(
    stepTexts
  )} all bind`, () => {
    expect(outcome.snippets.length).toBeGreaterThan(0);
    expect(outcome.pasteError).toBeNull();
  });
});
