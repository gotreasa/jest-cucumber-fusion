// A tag filter operand without its "@" is refused, not quietly matched against nothing.
//
// @cucumber/tag-expressions parses a bare word such as `smoke` as a valid operand, but every tag
// Gherkin hands Fusion starts with "@", so that operand can never match. `tagFilter: "smoke"`
// then excluded every scenario, and Jest exited 0 having run nothing: exactly the silent outcome
// the parse refusal exists to rule out. 2.0.0 refused it as unparseable. Found by fuzzing PR #16
// (finding F1), 2026-10-09.
const fs = require("fs");
const os = require("os");
const path = require("path");

const { Given, Fusion } = require("../../../../src");

const featureDir = fs.mkdtempSync(path.join(os.tmpdir(), "fusion-operands-"));
const feature = path.join(featureDir, "operands.feature");
fs.writeFileSync(
  feature,
  "Feature: Operands\n  @smoke\n  Scenario: Opening\n    Given the shop is open\n"
);
afterAll(() => fs.rmSync(featureDir, { recursive: true, force: true }));

const refusalFor = (tagFilter) => {
  Given("the shop is open", () => {});
  try {
    Fusion(feature, { tagFilter });
  } catch (refusal) {
    return refusal.message;
  }
  return null;
};

// Collected at module load, where Fusion registers; asserted below.
const outcomes = {
  bare: refusalFor("smoke"),
  bareInsideAnExpression: refusalFor("@smoke and not Slow"),
  everyOperandTagged: refusalFor("@smoke and not (@slow or @wip)"),
};

describe("tag filter operands", () => {
  test("a bare word is refused, naming the expression and the operand", () => {
    expect(outcomes.bare).toMatch(/^Could not parse tag filter "smoke"\.\n/);
    expect(outcomes.bare).toContain('"smoke" is not a tag');
    expect(outcomes.bare).toContain('Did you mean "@smoke"?');
  });

  test("a bare word anywhere in the expression is refused", () => {
    expect(outcomes.bareInsideAnExpression).toMatch(
      /^Could not parse tag filter "@smoke and not Slow"\.\n/
    );
    expect(outcomes.bareInsideAnExpression).toContain('"Slow" is not a tag');
  });

  test("an expression whose every operand is a tag is accepted", () => {
    expect(outcomes.everyOperandTagged).toBeNull();
  });
});
