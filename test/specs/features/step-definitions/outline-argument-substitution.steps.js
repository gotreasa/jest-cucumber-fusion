// An outline step's docstring and table receive their Examples values whatever the step's
// matcher is, and whether or not the step's own text holds a placeholder.
//
// 2.0.0 substituted them except in one case: a regular expression matcher on a step whose own
// text held no placeholder received `<n>` literally. Version 3 compiles Gherkin pickles, which
// substitute every argument, so that case changed. Characterisation, green on arrival: it pins
// the documented row in docs/Migrating.md. Found by differential fuzzing of PR #16 against
// 2.0.0 (finding F3), 2026-10-09.
const fs = require("fs");
const os = require("os");
const path = require("path");

const { When, Fusion } = require("../../../../src");

const featureDir = fs.mkdtempSync(
  path.join(os.tmpdir(), "fusion-substitution-"),
);
const feature = path.join(featureDir, "substitution.feature");
fs.writeFileSync(
  feature,
  "Feature: Outline argument substitution\n" +
    "  Scenario Outline: Row <n>\n" +
    '    When a regex step with no placeholder "lit" and a table\n' +
    "      | col     |\n" +
    "      | <n>     |\n" +
    "      | cell<n> |\n" +
    '    When a regex step with no placeholder "lit" and a docstring\n' +
    '      """\n' +
    "      doc <n>\n" +
    '      """\n' +
    "    When a string step with a table\n" +
    "      | col |\n" +
    "      | <n> |\n\n" +
    "    Examples:\n" +
    "      | n |\n" +
    "      | 8 |\n",
);
afterAll(() => fs.rmSync(featureDir, { recursive: true, force: true }));

const received = [];
When(/^a regex step with no placeholder "([^"]*)" and a table$/, (...args) =>
  received.push(args),
);
When(
  /^a regex step with no placeholder "([^"]*)" and a docstring$/,
  (...args) => received.push(args),
);
When("a string step with a table", (...args) => received.push(args));
Fusion(feature);

afterAll(() => {
  expect(received).toEqual([
    ["lit", [{ col: "8" }, { col: "cell8" }]],
    ["lit", "doc 8"],
    [[{ col: "8" }]],
  ]);
});
