/**
 * Options set once in a Jest setup file reach every step definition file of the run.
 *
 * This observation cannot be made from inside one file. Calling setFusionConfiguration here
 * and then calling Fusion here would prove only that a module-level variable can be written
 * and read back. What the value promises is something else: that a consumer lists ONE script
 * in Jest's setupFiles, and every step definition file in that run is configured by it
 * without naming it -- while a file that passes its own option still wins for itself. Jest
 * gives each test file its own module registry and runs setupFiles inside it, which is what
 * makes the global per-file rather than shared mutable state, and the only honest way to see
 * that is a real run with a real configuration.
 *
 * So this file spawns child Jest runs over the fixture project under
 * test/specs/fixtures/global-config and reads the statuses Jest itself recorded:
 *
 *   jest.global.json   setupFiles -> setup-fusion.js, which imports the setter from this
 *                      package and sets a tagFilter. Two consumer files are collected: one
 *                      passing no options, one passing the OPPOSITE tagFilter.
 *   jest.invalid.json  setupFiles -> setup-invalid.js, which calls the setter with a string.
 *
 * The two consumer files select opposite scenarios on purpose. That makes three separate
 * mistakes visible in one run: a global that is never read (both files run everything), a
 * global read at the wrong layer so it beats a per-call option (the overriding file reports
 * the global's selection), and a per-call option written into the global (the file that passes
 * nothing reports the other file's selection).
 *
 * CURRENT STATUS against the value-4 tree:
 *   RED   — src/index.js exports eight names and setFusionConfiguration is not among them, so
 *           the setup script's require yields undefined and both suites of the valid run fail
 *           with a TypeError before any scenario is reached. The invalid run fails too, but
 *           for that same wrong reason rather than with the refusal a consumer needs, which is
 *           why the assertion below reads the refusal's content and not merely its exit code.
 */

const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const repositoryRoot = path.resolve(__dirname, "..", "..", "..", "..");
const fixtureProject = path.join(
  repositoryRoot,
  "test",
  "specs",
  "fixtures",
  "global-config"
);

const SKIPPED = "pending"; // what Jest calls a test registered through test.skip
const PASSED = "passed";

const THE_SELECTED_SCENARIO = "A selected shopper buys a shirt";
const THE_EXCLUDED_SCENARIO = "An excluded shopper buys a book";
const WHAT_THE_SETTER_WAS_GIVEN = "not an option object";
const THE_CLEARED_TEMPLATE_PREFIX = "stale: ";

const withoutAnsi = (text) =>
  // eslint-disable-next-line no-control-regex
  (text || "").replace(/\u001b\[[0-9;]*m/g, "");

// One child Jest run over the fixture project, with one of its own configurations. Never
// reports success for a run it could not make: a run that cannot be started, or whose report
// cannot be read, throws with WHAT / WHY / HOW so the value is adjudicated rather than passed.
const childRunWith = (configurationFileName) => {
  const reportDirectory = fs.mkdtempSync(
    path.join(os.tmpdir(), "fusion-global-config-")
  );
  const reportFile = path.join(reportDirectory, "jest-report.json");

  const cannotObserve = (what, why, how) =>
    new Error(
      `WHAT: ${what}\nWHY:  ${why}\nHOW:  ${how}\n` +
        `      configuration: ${configurationFileName}`
    );

  try {
    const run = spawnSync(
      "npx",
      [
        "jest",
        "--config",
        path.join(fixtureProject, configurationFileName),
        "--coverage=false",
        "--json",
        "--testLocationInResults=false",
        `--outputFile=${reportFile}`,
      ],
      {
        cwd: repositoryRoot,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      }
    );

    if (run.error)
      throw cannotObserve(
        `a child jest could not be started: ${run.error.message}`,
        "a real run with a real setup script is the only evidence that setupFiles reaches " +
          "Fusion; nothing else observes it",
        "install the dependencies (npm ci) and try again"
      );

    if (!fs.existsSync(reportFile))
      throw cannotObserve(
        "the child jest wrote no JSON report",
        "there are no recorded statuses to read, so nothing is observed either way",
        `check the child output:\n${(run.stderr || run.stdout || "").trim()}`
      );

    let report;
    try {
      report = JSON.parse(fs.readFileSync(reportFile, "utf8"));
    } catch (unreadable) {
      throw cannotObserve(
        `the child's JSON report could not be parsed: ${unreadable.message}`,
        "an unparseable report is not evidence of a selection either way",
        "run the same jest --config by hand and look at what it wrote"
      );
    }

    const bySuite = {};
    (report.testResults || []).forEach((suite) => {
      bySuite[path.basename(suite.name)] = {
        status: suite.status,
        failureText: withoutAnsi(suite.message),
        report: suite.assertionResults
          .map((assertion) => `${assertion.title} [${assertion.status}]`)
          .sort(),
      };
    });

    return {
      exitStatus: run.status,
      suiteCount: (report.testResults || []).length,
      testCount: report.numTotalTests,
      everyName: (report.testResults || []).flatMap((suite) =>
        suite.assertionResults.map((assertion) => assertion.title)
      ),
      bySuite,
    };
  } finally {
    fs.rmSync(reportDirectory, { recursive: true, force: true });
  }
};

const theRunConfiguredFromASetupFile = childRunWith("jest.global.json");
const theRunWhoseSetupFileIsWrong = childRunWith("jest.invalid.json");

const reportOf = (run, fixtureFileName) =>
  (run.bySuite[fixtureFileName] || { report: ["<the suite did not run>"] })
    .report;

const failureTextOf = (run) =>
  Object.values(run.bySuite)
    .map((suite) => suite.failureText)
    .join("\n");

// --- the observations -----------------------------------------------------------------------

test("a global set in a setup file configures a step definition file that never mentions it", () => {
  // WHAT: the file that passes NO options reports the included scenario passed and the
  //       excluded one skipped under its own name -- the selection the setup script set.
  // WHY:  this is the whole value. A consumer who repeats the same options in every step
  //       definition file wants to set them once; if the global layer is never read, this file
  //       runs both scenarios and has been configured by nothing at all.
  // HOW:  merge the global layer between the defaults and the per-call options, and keep it in
  //       the module that owns the merge so that setupFiles writing it is enough.
  expect(
    reportOf(theRunConfiguredFromASetupFile, "global-only.fixture.js")
  ).toStrictEqual(
    [
      `${THE_SELECTED_SCENARIO} [${PASSED}]`,
      `${THE_EXCLUDED_SCENARIO} [${SKIPPED}]`,
    ].sort()
  );
});

test("a step definition file that passes its own option overrides the global for itself", () => {
  // WHAT: the file that passes the OPPOSITE tagFilter reports the mirror image -- the excluded
  //       scenario passed and the selected one skipped.
  // WHY:  this is the precedence the documentation has always stated, defaults then global then
  //       per-call. Reading the global at the wrong layer makes it beat the option a consumer
  //       wrote in the file in front of them, which is the harder bug to diagnose of the two.
  // HOW:  apply the per-call options last.
  expect(
    reportOf(theRunConfiguredFromASetupFile, "per-call-override.fixture.js")
  ).toStrictEqual(
    [
      `${THE_SELECTED_SCENARIO} [${SKIPPED}]`,
      `${THE_EXCLUDED_SCENARIO} [${PASSED}]`,
    ].sort()
  );
});

test("one file's own option does not change another file's configuration", () => {
  // WHAT: the two files' reports in that one run are exact mirrors of each other, and the run
  //       exits 0 with both suites collected.
  // WHY:  a per-call option written into the global rather than merged over it would configure
  //       every other file in the run. Whether the leak happened to arrive before or after the
  //       other file loaded would decide the outcome, so the defect would be intermittent --
  //       the worst kind to chase. Mirrored selections make it a fact rather than a race.
  // HOW:  never write the per-call options into the global; merge a fresh result per call.
  expect({
    exitStatus: theRunConfiguredFromASetupFile.exitStatus,
    suites: theRunConfiguredFromASetupFile.suiteCount,
    globalOnly: reportOf(
      theRunConfiguredFromASetupFile,
      "global-only.fixture.js"
    ),
    perCallOverride: reportOf(
      theRunConfiguredFromASetupFile,
      "per-call-override.fixture.js"
    ),
  }).toStrictEqual({
    exitStatus: 0,
    suites: 2,
    globalOnly: [
      `${THE_SELECTED_SCENARIO} [${PASSED}]`,
      `${THE_EXCLUDED_SCENARIO} [${SKIPPED}]`,
    ].sort(),
    perCallOverride: [
      `${THE_SELECTED_SCENARIO} [${SKIPPED}]`,
      `${THE_EXCLUDED_SCENARIO} [${PASSED}]`,
    ].sort(),
  });
});

test("a second setter call replaces the first global rather than merging into it", () => {
  // WHAT: no test in the run is named by the scenarioNameTemplate the setup script set in its
  //       FIRST call and never mentioned in its second.
  // WHY:  replace is what lets a consumer clear or redefine a global they set earlier, and it
  //       is what the previous setter did. If the second call merged into the first, a key the
  //       consumer deliberately dropped would still be in force -- here, every test in the run
  //       would be reported under a name the consumer thought they had removed.
  // HOW:  assign the setter's argument as the whole global, never merge it into what was there.
  //
  // The population is pinned alongside the absence, because "no test carries the stale name"
  // is only evidence if tests were named at all. Today no test is reported, so without the
  // count this assertion would pass while observing nothing.
  expect({
    namesCarryingTheClearedTemplate:
      theRunConfiguredFromASetupFile.everyName.filter((name) =>
        name.startsWith(THE_CLEARED_TEMPLATE_PREFIX)
      ),
    namesReportedAtAll: theRunConfiguredFromASetupFile.everyName.length,
  }).toStrictEqual({
    namesCarryingTheClearedTemplate: [],
    namesReportedAtAll: 4,
  });
});

test("a setter given something that is not an option object fails the run where it was called", () => {
  const failureText = failureTextOf(theRunWhoseSetupFileIsWrong);

  // WHAT: the run fails with no test reported, and the failure names what the setter was
  //       given, the setter itself, and an option key it does accept.
  // WHY:  a string quietly accepted as a configuration leaves every Fusion call in the run
  //       unconfigured, and the consumer hunting for a bug in their feature files. Failing in
  //       the setup script is the one place and time they can act: before any step definition
  //       file has loaded. Naming the value is what makes it their mistake rather than a
  //       mystery -- which is why this reads the refusal's content and not just the exit code.
  // HOW:  check the argument where the setter is called and refuse with WHAT, WHY and HOW.
  expect({
    exitedNonZero: theRunWhoseSetupFileIsWrong.exitStatus !== 0,
    testsReported: theRunWhoseSetupFileIsWrong.testCount,
    namesWhatItWasGiven: failureText.includes(WHAT_THE_SETTER_WAS_GIVEN),
    namesTheSetter: failureText.includes("setFusionConfiguration"),
    namesAnAcceptedKey: failureText.includes("tagFilter"),
  }).toStrictEqual({
    exitedNonZero: true,
    testsReported: 0,
    namesWhatItWasGiven: true,
    namesTheSetter: true,
    namesAnAcceptedKey: true,
  });
});
