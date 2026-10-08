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
    String.raw`When(/^I say "(.*)" twice$/, (arg0) => {});`,
  ],
  [
    "then",
    'it costs 4.20 for "a/b (c)" at 10',
    String.raw`Then(/^it costs ([-+]?\d*\.?\d+) for "(.*)" at (\d+)$/, (arg0, arg1, arg2) => {});`,
  ],
  // U+2028 survives Gherkin's line split and may not appear raw inside a regex literal.
  [
    "given",
    "a 3\u2028line",
    String.raw`Given(/^a (\d+)\u2028line$/, (arg0) => {});`,
  ],
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
