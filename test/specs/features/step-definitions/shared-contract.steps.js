/**
 * The shared contract of this package, driven the way a consumer drives it.
 *
 * This file is an ordinary consumer step definition file: it requires the package's public
 * surface, registers Given / And / But / Then definitions and calls Fusion() on a committed
 * feature file at module load. Nothing about the package's internals is reached, mocked or
 * named — the only substitution anywhere in this file is of the Jest globals, which the
 * architecture declares as a driven port, and only for the one observation that cannot be
 * made from inside a passing test (see "the second pass" below).
 *
 * WHAT IT PINS, one obligation per observation:
 *   1. a feature Background step reaches every scenario of the feature;
 *   2. a Rule's own Background reaches the scenarios inside that Rule and NO others;
 *   3. a data table arrives as an array of header-keyed row objects, positioned after the
 *      regex captures;
 *   4. an EMPTY docstring on a Scenario Outline row arrives as the empty string rather than
 *      being dropped — the one genuinely absent behaviour at this value (L5);
 *   5. an And step and a But step each reach the definition registered under THEIR keyword,
 *      never one registered under another keyword for the same sentence;
 *   6. Before and After run exactly once around each test, and around no other test in the
 *      file;
 *   7. one describe named for the feature title, one test per scenario and one per Examples
 *      row with the row's values substituted into the title;
 *   8. a failing step reports Failing step / Step arguments / Error, byte for byte, and no
 *      later step of that scenario runs;
 *   9. a missing feature file names the absolute path that was looked for.
 *
 * The Dutch-dialect half of obligation 5 is NOT duplicated here: one feature file carries one
 * dialect, and test/specs/features/language.feature already drives En / Maar through the same
 * registry, with its generated names recorded in test/specs/baseline/test-names-2.0.0.txt.
 *
 * THE SECOND PASS, and why it is not a fake. Obligations 7 and 8 are about what Fusion
 * REGISTERS and about the text of a FAILURE. A failure cannot be observed from inside a test
 * that has to pass, so the file drives the real public surface a second time over the same
 * real feature file, with the roster step's definition throwing on purpose, while the four
 * Jest globals record what they are handed instead of registering it. Everything under
 * observation is still produced by the package: the describe title, the test names, the
 * scenario body and the decorated error are all the real ones. The recorder is installed
 * BEFORE the package is required, so it is the only describe / test / beforeEach / afterEach
 * the package can ever see, whether it reads them at load time or at call time; outside a
 * recorded pass it forwards to the real Jest globals unchanged.
 *
 * CURRENT STATUS against the 2.0.0 tree:
 *   RED   — "An incident is filed for rocket Falcon" and "... Vega": the empty docstring is
 *           dropped before Fusion ever sees it, so the step receives one argument where two
 *           are due.
 *   GREEN — everything else. It is preservation: these are the shapes a consumer already has
 *           today and must still have after jest-cucumber is gone.
 */

// --- the recorder over the Jest globals (a declared driven port) ----------------------------
// Installed before the package is required, and transparent unless a pass is being recorded.
const realJestGlobals = {
  describe: global.describe,
  test: global.test,
  beforeEach: global.beforeEach,
  afterEach: global.afterEach,
};

let registrationRecorder = null;

const forwardOrRecord = (globalName, recorderKey) =>
  Object.assign(
    (...whateverThePackagePassed) =>
      registrationRecorder
        ? registrationRecorder[recorderKey || globalName](
            ...whateverThePackagePassed,
          )
        : realJestGlobals[globalName](...whateverThePackagePassed),
    realJestGlobals[globalName],
  );

global.describe = forwardOrRecord("describe");
global.beforeEach = forwardOrRecord("beforeEach");
global.afterEach = forwardOrRecord("afterEach");
global.test = forwardOrRecord("test");
// A skipped test is registered through test.skip, so the recorder has to own that door too,
// or a scenario the package means to skip would really skip inside a recorded pass.
global.test.skip = forwardOrRecord("test", "testSkip");

const recordWhatFusionRegisters = (driveTheFeature) => {
  const recorded = { describes: [], tests: [], hookRegistrations: [] };

  registrationRecorder = {
    describe: (describeTitle, describeBody) => {
      recorded.describes.push(describeTitle);
      describeBody();
    },
    test: (testName, testBody) => recorded.tests.push({ testName, testBody }),
    testSkip: (testName) =>
      recorded.tests.push({ testName, testBody: null, skipped: true }),
    // Swallowed on purpose: a recorded pass registers its own Before and After, and they
    // must not end up wrapping the real tests in this file. They are kept rather than
    // discarded so a reader can see the pass registered them.
    beforeEach: (hook) =>
      recorded.hookRegistrations.push({ phase: "before", hook }),
    afterEach: (hook) =>
      recorded.hookRegistrations.push({ phase: "after", hook }),
  };

  try {
    driveTheFeature();
  } finally {
    registrationRecorder = null;
  }

  return recorded;
};

// --- the public surface, required exactly as a consumer requires it ------------------------
const path = require("path");

const {
  Given,
  And,
  But,
  Then,
  Before,
  After,
  Fusion,
} = require("../../../../src");

const FEATURE_TITLE =
  "A feature file reaches the step definitions that bind it";
const ROSTER_FAILURE = "the inspection log could not be read";

const THE_CREW_ROSTER = [
  { Name: "Ada", Role: "pilot" },
  { Name: "Grace", Role: "engineer" },
];

// One registration routine, used by both passes. `observations` is the only state a pass
// keeps; `rosterMustFail` is what makes the second pass's roster step throw.
const registerTheStepDefinitions = (observations, { rosterMustFail } = {}) => {
  const ran = (stepUnderObservation, ...argumentsItReceived) => {
    observations.stepsThatRan.push(stepUnderObservation);
    observations.argumentsByStep[stepUnderObservation] = argumentsItReceived;
  };

  Before(() => {
    observations.hookLog.push("before");
    observations.stepsThatRan = [];
    observations.argumentsByStep = {};
  });
  After(() => {
    observations.hookLog.push("after");
  });

  // The feature Background. Every test of the feature runs it, which is also how the number
  // of tests that actually ran is counted for the hook assertion.
  Given("the ground crew is on station", (...argumentsReceived) => {
    observations.testsThatRan += 1;
    ran("given:ground crew", ...argumentsReceived);
  });

  Given(/^the launch pad is clear$/, (...argumentsReceived) =>
    ran("given:launch pad", ...argumentsReceived),
  );

  // Keyword scoping. The same sentence is registered under two keywords on purpose: the And
  // step must reach the And definition and the But step the But definition, never the other
  // one. A shadow that runs shows up in the step log as given:countdown / and:weather hold.
  And(/^the countdown has been announced$/, (...argumentsReceived) =>
    ran("and:countdown", ...argumentsReceived),
  );
  Given(/^the countdown has been announced$/, (...argumentsReceived) =>
    ran("given:countdown", ...argumentsReceived),
  );
  But(/^the weather hold has been lifted$/, (...argumentsReceived) =>
    ran("but:weather hold", ...argumentsReceived),
  );
  And(/^the weather hold has been lifted$/, (...argumentsReceived) =>
    ran("and:weather hold", ...argumentsReceived),
  );

  // The Rule's own Background. Only the scenarios inside the Rule may run it.
  Given("the inspection log is open", (...argumentsReceived) =>
    ran("given:inspection log", ...argumentsReceived),
  );

  // A capture and a data table on one step.
  Given(/^(\d+) crew are listed on the roster:$/, (...argumentsReceived) => {
    ran("given:crew roster", ...argumentsReceived);
    if (rosterMustFail) throw new Error(ROSTER_FAILURE);
  });

  // A capture and an EMPTY docstring on one step, inside a Scenario Outline.
  Given(
    /^an incident is filed for rocket "(.+)" with these notes:$/,
    (...argumentsReceived) => ran("given:incident", ...argumentsReceived),
  );

  Then(
    "only the feature background step, the launch pad step, the countdown step and the weather hold step have run",
    () => {
      // WHAT: the steps this scenario ran, in order, and nothing else.
      // WHY: it is one assertion over three promises — the feature Background reaches a
      // scenario outside the Rule, the Rule's Background does NOT, and And / But each bind
      // inside their own keyword. A step that went missing and a step that should never have
      // run both fail here, which a per-step assertion could not do.
      // HOW: bind each Gherkin keyword to the definitions registered under that keyword, and
      // collapse the feature Background into every scenario but a Rule Background only into
      // the scenarios of its Rule.
      expect(observations.stepsThatRan).toEqual([
        "given:ground crew",
        "given:launch pad",
        "and:countdown",
        "but:weather hold",
      ]);
    },
  );

  Then(
    "only the feature background step, the rule background step and the crew roster step have run",
    () => {
      // WHAT / WHY / HOW: the other half of the Background partition — a scenario INSIDE the
      // Rule runs the feature Background and then the Rule's own, in that order, and no step
      // belonging to another scenario.
      expect(observations.stepsThatRan).toEqual([
        "given:ground crew",
        "given:inspection log",
        "given:crew roster",
      ]);
    },
  );

  And(
    "the roster step received the crew count and then the roster as header-keyed rows",
    () => {
      // WHAT: the roster step's captures first, then its data table as header-keyed row
      // objects — value, order and count in one assertion.
      // WHY: a consumer's table step reads row.Name; raw pickle cells, a reordered argument
      // list or a phantom extra argument all break a working suite silently.
      // HOW: shape a pickle dataTable into one object per body row keyed by the header row,
      // and append it after the captures.
      expect(observations.argumentsByStep["given:crew roster"]).toStrictEqual([
        "2",
        THE_CREW_ROSTER,
      ]);
    },
  );

  Then(
    /^the incident step received the rocket "(.+)" and then the empty notes$/,
    (rocket) => {
      // WHAT: this Examples row's own value, then the EMPTY docstring as the empty string.
      // WHY: the empty string is a value the consumer wrote down; dropping it hands the step
      // one argument where two are due, which is L5 and the reason this file is red today.
      // HOW: forward a step's Gherkin argument on PRESENCE, never on truthiness or type, so
      // "" and [] survive — and read the docstring from the pickle, which keeps it.
      expect(observations.argumentsByStep["given:incident"]).toStrictEqual([
        rocket,
        "",
      ]);
    },
  );
};

// --- first pass: the real thing, start to finish -------------------------------------------
const liveRun = {
  stepsThatRan: [],
  argumentsByStep: {},
  hookLog: [],
  testsThatRan: 0,
};

registerTheStepDefinitions(liveRun);
Fusion("../shared-contract.feature");

// --- second pass: the same real feature, with the roster step throwing ---------------------
const failingRun = {
  stepsThatRan: [],
  argumentsByStep: {},
  hookLog: [],
  testsThatRan: 0,
};

const whatFusionRegistered = recordWhatFusionRegisters(() => {
  registerTheStepDefinitions(failingRun, { rosterMustFail: true });
  Fusion("../shared-contract.feature");
});

test("Fusion registers one describe for the feature and one test per scenario and Examples row", () => {
  // WHAT: exactly one describe, named for the feature title, and the tests Fusion generated
  // from the feature file.
  // WHY: a consumer's CI history is keyed on these strings; an Examples row that loses its
  // substituted title, a Rule whose scenarios never register, or a second describe all change
  // what their report says without changing what the feature file says.
  // HOW: one describe per feature title, one test per compiled pickle, with the Examples row
  // values substituted into the scenario title.
  expect(whatFusionRegistered.describes).toEqual([FEATURE_TITLE]);
  expect(whatFusionRegistered.tests.map((each) => each.testName)).toEqual([
    "A launch runs the keyword-scoped definition that owns each of its steps",
    "An inspection reads the crew roster attached to its step",
    "An incident is filed for rocket Falcon",
    "An incident is filed for rocket Vega",
  ]);
});

test("a failing step reports its text, its arguments and the original error, and stops the scenario", async () => {
  const inspection = whatFusionRegistered.tests.find(
    (each) =>
      each.testName ===
      "An inspection reads the crew roster attached to its step",
  );
  expect(inspection).toBeDefined();

  const failure = await inspection.testBody().then(
    () => null,
    (thrown) => thrown,
  );

  // WHAT: the decoration, byte for byte — the failing step's text in double quotes, the JSON
  // of the arguments it was called with, then the original message.
  // WHY: this is the shape of every failure in every consumer suite today. One changed
  // newline or label and every consumer's failure output, and anything that greps it, breaks.
  // HOW: catch the step's throw or rejection and rethrow it with exactly these three lines
  // separated by blank lines.
  expect(failure).not.toBeNull();
  expect(failure.message).toBe(
    'Failing step: "2 crew are listed on the roster:"\n\n' +
      'Step arguments: ["2",[{"Name":"Ada","Role":"pilot"},{"Name":"Grace","Role":"engineer"}]]\n\n' +
      `Error: ${ROSTER_FAILURE}`,
  );

  // WHAT / WHY / HOW: the scenario stopped at the step that threw. Running the rest of a
  // scenario after a failed step reports a second, invented failure and hides the first, so
  // the steps run must end at the roster step.
  expect(failingRun.stepsThatRan).toEqual([
    "given:ground crew",
    "given:inspection log",
    "given:crew roster",
  ]);
});

test("a missing feature file names the absolute path Fusion looked for", () => {
  const pathItMustName = path.resolve(
    __dirname,
    "../does-not-exist-shared-contract.feature",
  );

  let refusal = null;
  try {
    Fusion("../does-not-exist-shared-contract.feature");
  } catch (thrown) {
    refusal = thrown;
  }

  // WHAT: a refusal naming the absolute path that was resolved and not found.
  // WHY: a silent no-op on a mistyped feature name is a suite that reports success while
  // testing nothing; the absolute path is what lets a consumer see WHERE it looked.
  // HOW: resolve the path relative to the calling file, then refuse with
  // `Feature file not found (<absolute path>)`. Anything appended after it is a HOW and is
  // deliberately not pinned here, because the authority records that suffix as still open.
  expect(refusal).not.toBeNull();
  expect(refusal.message).toContain(
    `Feature file not found (${pathItMustName})`,
  );
});

afterAll(() => {
  // WHAT: one "before" and one "after", in that order, for each test that actually ran — and
  // for no other test in this file.
  // WHY: hooks registered once per scenario block instead of once per feature run N times per
  // test, which a resetting hook hides; hooks registered at file level would also wrap the
  // three plain tests above. Counting against the tests that ran keeps `jest -t` honest.
  // HOW: register each Before and After exactly once, inside the feature's describe block.
  expect(liveRun.testsThatRan).toBeGreaterThan(0);
  expect(liveRun.hookLog).toEqual(
    Array.from({ length: liveRun.testsThatRan }, () => [
      "before",
      "after",
    ]).flat(),
  );
});
