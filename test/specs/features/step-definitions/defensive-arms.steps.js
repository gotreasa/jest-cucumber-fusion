// Defensive arms that the real @cucumber parsers never trigger, so no test through the public
// API can reach them (shown on Codecov for PR #16 and by mutation testing). They are kept, by
// Gearoid's ruling on 2026-10-09, because a future parser change should surface as a named
// refusal rather than a TypeError deep inside Fusion. These tests drive each arm directly:
//   - tag-filter: a parser that throws something other than an Error;
//   - step-argument: a docString with no content, and an argument with neither shape;
//   - keywords: a keyword no dialect bucket holds, and a refusal with no dialect name;
//   - feature-source: gherkin.compile throwing, and a pickle step whose astNodeIds name no
//     step, both reached by overriding ONLY gherkin.compile for one isolated module load.
const fs = require("fs");
const os = require("os");
const path = require("path");
const gherkin = require("@cucumber/gherkin");

const { tagFilterFor } = require("../../../../src/tag-filter");
const { stepArgumentFrom } = require("../../../../src/step-argument");
const { bucketForKeyword } = require("../../../../src/keywords");
const { mergeFusionOptions } = require("../../../../src/configuration");

const featureDir = fs.mkdtempSync(path.join(os.tmpdir(), "fusion-defensive-"));
const feature = path.join(featureDir, "valid.feature");
fs.writeFileSync(
  feature,
  "Feature: Valid\n  Scenario: Opening\n    Given the shop is open\n"
);
afterAll(() => fs.rmSync(featureDir, { recursive: true, force: true }));

// Load src/feature-source with gherkin.compile replaced, leaving the parser itself real.
const featureSourceWithCompile = (compile) => {
  let loaded;
  jest.isolateModules(() => {
    jest.doMock("@cucumber/gherkin", () => ({
      ...jest.requireActual("@cucumber/gherkin"),
      compile,
    }));
    loaded = require("../../../../src/feature-source");
  });
  jest.dontMock("@cucumber/gherkin");
  return loaded;
};

describe("defensive arms", () => {
  test("tag-filter: a non-Error parse failure is named in the refusal", () => {
    const parserThrowingAString = () => {
      throw "the parser gave up";
    };
    expect(() => tagFilterFor("@a and", parserThrowingAString)).toThrow(
      'Could not parse tag filter "@a and".'
    );
    expect(() => tagFilterFor("@a and", parserThrowingAString)).toThrow(
      "the tag expression parser could not read it: the parser gave up"
    );
  });

  test("step-argument: a docString without content is no argument", () => {
    expect(stepArgumentFrom({ docString: {} })).toBeNull();
  });

  test("step-argument: an argument with neither table nor docString is no argument", () => {
    expect(stepArgumentFrom({})).toBeNull();
  });

  test("keywords: a keyword no bucket holds is refused, with and without a dialect", () => {
    expect(() =>
      bucketForKeyword("Perhaps ", gherkin.dialects.en, "en")
    ).toThrow(
      'Unsupported step keyword: "Perhaps" in the "en" Gherkin dialect.'
    );
    expect(() => bucketForKeyword("* ", gherkin.dialects.en)).toThrow(
      /^Unsupported step keyword: "\*"\. Fusion binds step definitions by keyword/
    );
  });

  test("feature-source: a compile failure after a good parse is refused by name", () => {
    const { loadFeature } = featureSourceWithCompile(() => {
      throw new Error("compiler fault");
    });
    expect(() => loadFeature(feature, mergeFusionOptions({}))).toThrow(
      "Error parsing feature Gherkin: compiler fault"
    );
  });

  test("feature-source: a pickle step naming no AST step is refused as unresolvable", () => {
    const realCompile = jest.requireActual("@cucumber/gherkin").compile;
    const { loadFeature } = featureSourceWithCompile((...args) =>
      realCompile(...args).map((pickle) => ({
        ...pickle,
        steps: pickle.steps.map((step) => ({ ...step, astNodeIds: ["nope"] })),
      }))
    );
    expect(() => loadFeature(feature, mergeFusionOptions({}))).toThrow(
      'Unresolvable step: "the shop is open" carries no astNodeId'
    );
  });
});
