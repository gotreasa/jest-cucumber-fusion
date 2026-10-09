// Property-based fuzz of the public surface. Each sampled case writes its own feature
// file, registers its own steps and calls Fusion(); since M3 every Fusion() starts from
// an empty registry, so one module can host many generated features.
//
// The seed is fixed so a failure reproduces: it appears in every feature title.
// Widen locally with FUZZ_SEED=<n> FUZZ_RUNS=<n> npx jest fuzz-properties.
// Sensitivity was proven against the published 1.0.0: P5 reproduces the L4 crash and
// P4 fails every case on the L3 dropped docstring.
const fs = require("fs");
const os = require("os");
const path = require("path");
const fc = require("fast-check");

const { Given, When, Then, Fusion } = require("../../../../src");

const SEED = Number(process.env.FUZZ_SEED || 20261002);
const RUNS = Number(process.env.FUZZ_RUNS || 40);

const featureDir = fs.mkdtempSync(path.join(os.tmpdir(), "fusion-fuzz-"));
let featureCount = 0;
const writeFeature = (body) => {
  featureCount += 1;
  const featurePath = path.join(featureDir, `case-${featureCount}.feature`);
  fs.writeFileSync(featurePath, body);
  return featurePath;
};
afterAll(() => {
  fs.rmSync(featureDir, { recursive: true, force: true });
});

const sample = (arbitrary) =>
  fc.sample(arbitrary, { seed: SEED, numRuns: RUNS });
const title = (property, caseIndex) =>
  `fuzz ${property} case ${caseIndex} (seed ${SEED})`;

// Words that are safe inside Gherkin step text: no structural characters
// (| # " < > @ :) and no leading or trailing whitespace.
const word = fc.stringMatching(/^[A-Za-z0-9][A-Za-z0-9_\-.,'!?]{0,11}$/);
const sentence = fc
  .array(word, { minLength: 1, maxLength: 6 })
  .map((words) => words.join(" "));

// P1: a string matcher binds arbitrary step text, and the step runs exactly once.
sample(sentence).forEach((stepText, caseIndex) => {
  let calls = 0;
  Given(`p1 ${stepText}`, () => {
    calls += 1;
  });
  Then("p1 it ran once", () => {
    expect(calls).toBe(1);
  });

  Fusion(
    writeFeature(
      `Feature: ${title("P1", caseIndex)}\n` +
        `  Scenario: string matcher\n` +
        `    Given p1 ${stepText}\n` +
        `    Then p1 it ran once\n`,
    ),
  );
});

// P2: regex captures arrive exactly as written, in order.
sample(fc.tuple(word, fc.nat({ max: 1e6 }), word)).forEach(
  ([first, number, last], caseIndex) => {
    When(/^p2 take "(.*)" then (\d+) then "(.*)"$/, (a, n, b) => {
      expect([a, n, b]).toEqual([first, String(number), last]);
    });

    Fusion(
      writeFeature(
        `Feature: ${title("P2", caseIndex)}\n` +
          `  Scenario: regex captures\n` +
          `    When p2 take "${first}" then ${number} then "${last}"\n`,
      ),
    );
  },
);

// P3: every outline row hands its own values to the step, in table order.
sample(
  fc.array(fc.tuple(word, fc.nat({ max: 9999 })), {
    minLength: 1,
    maxLength: 5,
  }),
).forEach((rows, caseIndex) => {
  const seenRows = [];
  Given(/^p3 row "(.*)" (\d+)$/, (name, number) => {
    seenRows.push([name, number]);
  });
  Then("p3 the row was delivered", () => {
    const [name, number] = rows[seenRows.length - 1];
    expect(seenRows[seenRows.length - 1]).toEqual([name, String(number)]);
  });

  const examples = rows
    .map(([name, number]) => `      | ${name} | ${number} |`)
    .join("\n");
  Fusion(
    writeFeature(
      `Feature: ${title("P3", caseIndex)}\n` +
        `  Scenario Outline: outline row <name>\n` +
        `    Given p3 row "<name>" <num>\n` +
        `    Then p3 the row was delivered\n\n` +
        `    Examples:\n` +
        `      | name | num |\n` +
        `${examples}\n`,
    ),
  );
});

// P4: a non-empty, multi-line docstring arrives byte for byte. (An EMPTY docstring
// inside an outline is the known upstream defect L5, so it is not generated.)
const docLine = fc
  .stringMatching(/^[A-Za-z0-9 _\-.,'!?|#<>@:"]{0,30}$/)
  .filter(
    (line) =>
      line.trim() === line &&
      !line.startsWith('"""') &&
      !line.startsWith("#") &&
      !line.startsWith("@"),
  );
sample(
  fc
    .array(docLine, { minLength: 1, maxLength: 5 })
    .filter((lines) => lines.join("").length > 0),
).forEach((lines, caseIndex) => {
  When(/^p4 I read the doc$/, (docString) => {
    expect(docString).toBe(lines.join("\n"));
  });

  const docBody = lines.map((line) => `      ${line}`).join("\n");
  Fusion(
    writeFeature(
      `Feature: ${title("P4", caseIndex)}\n` +
        `  Scenario: docstring\n` +
        `    When p4 I read the doc\n` +
        `      """\n${docBody}\n      """\n`,
    ),
  );
});

// P5: a regex matcher with escaped parentheses binds in a plain scenario AND an outline
// (the L4 crash shape).
sample(fc.stringMatching(/^[a-z][a-zA-Z0-9]{0,10}$/)).forEach(
  (functionName, caseIndex) => {
    const calls = [];
    Given(/^p5 call (\w+\(\))$/, (call) => {
      calls.push(call);
    });
    Then("p5 the call was bound", () => {
      expect(calls[calls.length - 1]).toBe(`${functionName}()`);
    });

    Fusion(
      writeFeature(
        `Feature: ${title("P5", caseIndex)}\n` +
          `  Scenario: plain\n` +
          `    Given p5 call ${functionName}()\n` +
          `    Then p5 the call was bound\n\n` +
          `  Scenario Outline: outline\n` +
          `    Given p5 call <f>\n` +
          `    Then p5 the call was bound\n\n` +
          `    Examples:\n` +
          `      | f |\n` +
          `      | ${functionName}() |\n`,
      ),
    );
  },
);
