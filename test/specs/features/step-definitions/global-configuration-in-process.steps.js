// setFusionConfiguration observed inside this test file's own process. The v5 oracle proves the
// global reaches every steps file through a real setupFiles run; that runs in a child Jest, so
// coverage never saw this module's refusal, replace semantics or the errors merge. These tests
// observe the same behaviour in-process. Jest gives each test file its own module registry, so
// the global set here cannot leak into another file.
const fs = require("fs");
const os = require("os");
const path = require("path");

const { Given, Fusion, setFusionConfiguration } = require("../../../../src");

const featureDir = fs.mkdtempSync(path.join(os.tmpdir(), "fusion-global-"));
const writeFeature = (name, body) => {
  const featurePath = path.join(featureDir, name);
  fs.writeFileSync(featurePath, body);
  return featurePath;
};
afterAll(() => fs.rmSync(featureDir, { recursive: true, force: true }));

const refusalFrom = (callSetter) => {
  try {
    callSetter();
    return null;
  } catch (refusal) {
    return refusal.message;
  }
};

// A non-object argument is refused at the call, naming what it was given.
const refusals = {
  string: refusalFrom(() => setFusionConfiguration("not an object")),
  null: refusalFrom(() => setFusionConfiguration(null)),
  array: refusalFrom(() => setFusionConfiguration(["@smoke"])),
};

const ran = [];
const tagged = writeFeature(
  "tagged.feature",
  "Feature: Tagged shop\n" +
    "  @included\n  Scenario: Selected\n    Given the included step\n" +
    "  @excluded\n  Scenario: Excluded\n    Given the excluded step\n",
);
const registerTaggedSteps = (label) => {
  Given("the included step", () => ran.push(`${label}: included`));
  Given("the excluded step", () => ran.push(`${label}: excluded`));
};

// A global tagFilter reaches a Fusion() call that passes no options.
setFusionConfiguration({ tagFilter: "@included" });
registerTaggedSteps("global filter");
Fusion(tagged);

// A second call REPLACES the global: with no tagFilter left, both scenarios run.
setFusionConfiguration({ scenarioNameTemplate: (v) => v.scenarioTitle });
setFusionConfiguration({});
registerTaggedSteps("global replaced");
Fusion(tagged);

// errors merges key by key: naming only the step check switches it off and leaves the others.
const unbound = writeFeature(
  "unbound.feature",
  "Feature: Half written\n" +
    "  Scenario: Bound\n    Given the included step\n" +
    "  Scenario: Unbound\n    Given a step nobody wrote\n",
);
Given("the included step", () => ran.push("step check off: bound"));
const stepCheckOff = refusalFrom(() =>
  Fusion(unbound, { errors: { stepsMustMatchFeatureFile: false } }),
);

// errors: undefined is the default, so the unbound step is refused.
Given("the included step", () => ran.push("errors undefined: bound"));
const errorsUndefined = refusalFrom(() =>
  Fusion(unbound, { errors: undefined }),
);

describe("setFusionConfiguration in-process", () => {
  test("refuses a string, null and an array, naming what it was given", () => {
    expect(refusals.string).toContain(
      'WHAT: it was given string "not an object".',
    );
    expect(refusals.null).toContain("WHAT: it was given object null.");
    expect(refusals.array).toContain('WHAT: it was given object ["@smoke"].');
    // One assertion over every refusal, so a failure names each case with the wrong opening.
    expect(
      Object.entries(refusals)
        .filter(
          ([, message]) =>
            !/^setFusionConfiguration needs an options object\./.test(message),
        )
        .map(([kind]) => kind),
    ).toEqual([]);
  });

  test("an options object merged per key: the step check alone switched off", () => {
    expect(stepCheckOff).toBeNull();
  });

  test("errors: undefined keeps the default step check", () => {
    expect(errorsUndefined).toMatch(
      /^Fusion found 1 step in the feature "Half written"/,
    );
  });

  afterAll(() => {
    // The global filter selected one scenario; the replaced global selected both; the bound
    // scenario ran with the step check off; nothing ran for the refused call.
    expect(ran.sort()).toEqual(
      [
        "global filter: included",
        "global replaced: excluded",
        "global replaced: included",
        "step check off: bound",
      ].sort(),
    );
  });
});
