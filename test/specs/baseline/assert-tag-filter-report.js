#!/usr/bin/env node
/**
 * What a tag filter does to a Jest report.
 *
 * test/specs/features/step-definitions/v3-tag-filter.steps.js observes which scenario BODIES
 * ran. That is half the promise. The other half is only visible in the report: the excluded
 * scenario is still there, listed under its own unannotated name, with the status Jest uses
 * for a skipped test -- not run, and not quietly dropped. A step counter inside a file cannot
 * see a reported status, so this script runs jest in a child process, once per consumer
 * fixture, with an explicit testMatch, and reads the statuses Jest itself recorded.
 *
 * Four runs, each a different answer the option has to give:
 *
 *   the filter from the value text   -> one passed, one skipped, the skipped one under the
 *                                      excluded scenario's own name
 *   the same filter in another case  -> the same two statuses under the same two names
 *   a filter that cannot be parsed   -> the run FAILS with no test reported, rather than
 *                                      exiting 0 having run nothing
 *   an excluded scenario left unwired -> no unmatched-step refusal, and that scenario skipped
 *                                      exactly ONCE
 *
 * This is a separate script rather than an addition to test/specs/baseline/assert-validation-report.js
 * because that file is a value 2 support: editing it would move that value's recorded witness.
 * It is run unchanged as one of this value's own verification vectors instead.
 *
 * Exits 0 only when all four observations were made and all four held. A child run that
 * cannot be started, or whose report cannot be read, prints which run it was and exits
 * non-zero: "I could not look" must never share an exit status with "I looked and it is fine".
 */

const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const repositoryRoot = path.resolve(__dirname, "..", "..", "..");

const SKIPPED = "pending"; // what Jest calls a test registered through test.skip
const PASSED = "passed";

const THE_SELECTED_SCENARIO = "A selected shopper buys a shirt";
const THE_EXCLUDED_SCENARIO = "An excluded shopper buys a book";
const THE_EXCLUDED_UNWIRED_SCENARIO =
  "An excluded shopper does something nobody wired";
const THE_MALFORMED_EXPRESSION = "@included and (not @excluded";

const cannotObserve = (run, what, why, how) => {
  console.error(`CANNOT OBSERVE the ${run} run.`);
  console.error(`  WHAT: ${what}`);
  console.error(`  WHY:  ${why}`);
  console.error(`  HOW:  ${how}`);
  process.exit(2);
};

const withoutAnsi = (text) =>
  // eslint-disable-next-line no-control-regex
  (text || "").replace(/\u001b\[[0-9;]*m/g, "");

// One child jest over exactly one fixture. The report is written outside the repository, so a
// failed run leaves nothing behind in the tree.
const childRun = (runName, fixtureFileName) => {
  const reportDirectory = fs.mkdtempSync(
    path.join(os.tmpdir(), "fusion-tag-filter-report-")
  );
  const reportFile = path.join(reportDirectory, "jest-report.json");

  try {
    const run = spawnSync(
      "npx",
      [
        "jest",
        "--coverage=false",
        "--json",
        "--testLocationInResults=false",
        "--testMatch",
        `**/${fixtureFileName}`,
        `--outputFile=${reportFile}`,
      ],
      {
        cwd: repositoryRoot,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      }
    );

    if (run.error)
      cannotObserve(
        runName,
        `jest could not be started: ${run.error.message}`,
        "the status Jest records is the only evidence this script accepts",
        "install the dependencies (npm ci) and try again"
      );

    if (!fs.existsSync(reportFile))
      cannotObserve(
        runName,
        "the child jest wrote no JSON report",
        "there is no recorded status to read, so nothing is observed either way",
        `check the child output:\n${(run.stderr || run.stdout || "").trim()}`
      );

    let report;
    try {
      report = JSON.parse(fs.readFileSync(reportFile, "utf8"));
    } catch (unreadable) {
      return cannotObserve(
        runName,
        `the JSON report could not be parsed: ${unreadable.message}`,
        "an unparseable report is not evidence of a skip, a pass or a refusal",
        `run jest with --testMatch "**/${fixtureFileName}" --json by hand`
      );
    }

    if (!Array.isArray(report.testResults) || report.testResults.length !== 1)
      cannotObserve(
        runName,
        `the child run reported ${
          (report.testResults || []).length
        } suites, not exactly 1`,
        "the testMatch is meant to select this one fixture; any other number means the run " +
          "did not observe the fixture it was asked about",
        `check that ${fixtureFileName} exists under test/specs/fixtures and that the ` +
          "testMatch still selects it"
      );

    const suite = report.testResults[0];

    return {
      exitStatus: run.status,
      suiteStatus: suite.status,
      failureText: withoutAnsi(suite.message),
      tests: suite.assertionResults.map((assertion) => ({
        name: assertion.title,
        status: assertion.status,
      })),
    };
  } finally {
    fs.rmSync(reportDirectory, { recursive: true, force: true });
  }
};

// --- the shapes each run is judged against -------------------------------------------------

const ranCleanly = (observed) =>
  observed.exitStatus === 0
    ? []
    : [
        `the child run exited ${observed.exitStatus}, not 0:\n        ` +
          observed.failureText
            .trim()
            .split("\n")
            .slice(0, 8)
            .join("\n        "),
      ];

// The whole report in one value: every test name with its status, so a renamed test, an extra
// one and a missing one all fail the same comparison. Sorted, because registration order is
// value 1's contract and not this value's.
const asReport = (observed) =>
  observed.tests.map((each) => `${each.name} [${each.status}]`).sort();

const onePassedOneSkipped = (observed) => [
  ...ranCleanly(observed),
  ...(JSON.stringify(asReport(observed)) ===
  JSON.stringify(
    [
      `${THE_SELECTED_SCENARIO} [${PASSED}]`,
      `${THE_EXCLUDED_SCENARIO} [${SKIPPED}]`,
    ].sort()
  )
    ? []
    : [
        `the report reads ${JSON.stringify(
          asReport(observed)
        )}, not one passed test for ` +
          `"${THE_SELECTED_SCENARIO}" and one skipped test for "${THE_EXCLUDED_SCENARIO}". ` +
          "An excluded scenario reported as PASSED is a lie, one that is absent hides the " +
          "selection, and one whose name has been annotated is no longer the name the " +
          "consumer wrote or the one their CI history is keyed on",
      ]),
];

const RUNS = [
  {
    name: "the filter from the value text",
    fixture: "tag-filter-included.fixture.js",
    // WHAT: exactly one passed test and one skipped test, each under its scenario's own
    //       declared title with nothing appended.
    // WHY:  this is what the option has always claimed and never did. A reader of the report
    //       has to be able to see the scenario that was excluded, by name, or a tag filter is
    //       indistinguishable from deleting a scenario.
    // HOW:  mark the excluded scenario rather than dropping it, and register it through
    //       test.skip under its own unannotated name.
    judge: onePassedOneSkipped,
  },
  {
    name: "the same filter written in another case",
    fixture: "tag-filter-mixed-case.fixture.js",
    // WHAT: the same two names with the same two statuses, from a filter spelled in a
    //       different case against the same lowercase tags.
    // WHY:  matching ignored case before this package owned tag filtering, so a consumer's
    //       suite must not start selecting nothing because of how they capitalised a tag.
    //       This run is the direction that fails if only the TAGS are lowercased.
    // HOW:  lowercase the expression as well as the tags before the comparison.
    judge: onePassedOneSkipped,
  },
  {
    name: "a filter that cannot be parsed",
    fixture: "tag-filter-malformed.fixture.js",
    // WHAT: the run fails, with no test reported at all, and the failure carries the
    //       expression the consumer wrote.
    // WHY:  this is the failure mode that would be invisible. An unparseable expression that
    //       became a matcher answering false for everything would exit 0 having run nothing,
    //       which is exactly what a correct filter selecting no scenario looks like. The two
    //       must not share an exit status.
    // HOW:  let the parse failure out of the parser, catch it where it is called, and refuse
    //       at collection before any describe.
    judge: (observed) => {
      const wrong = [];

      if (observed.exitStatus === 0)
        wrong.push(
          "the child run exited 0. An expression that cannot be read must not produce a " +
            "run that merely selects nothing"
        );
      if (observed.suiteStatus !== "failed")
        wrong.push(
          `the suite status was "${observed.suiteStatus}", not "failed"`
        );
      if (observed.tests.length !== 0)
        wrong.push(
          `${observed.tests.length} test(s) were reported: ${JSON.stringify(
            asReport(observed)
          )}. A refusal must stop the file before any describe`
        );
      if (
        !observed.failureText.includes(
          `Could not parse tag filter "${THE_MALFORMED_EXPRESSION}"`
        )
      )
        wrong.push(
          "what Jest reported does not carry the line Could not parse tag filter followed " +
            `by "${THE_MALFORMED_EXPRESSION}", so the consumer is not told which of their ` +
            "expressions could not be read"
        );

      return wrong;
    },
  },
  {
    name: "an excluded scenario that nobody wired",
    fixture: "tag-filter-unbound.fixture.js",
    // WHAT: the run exits 0, the unwired excluded scenario is reported skipped exactly ONCE,
    //       and its wired sibling passes.
    // WHY:  excluding a half-written scenario is one of the main reasons to reach for a tag
    //       filter, so the step check must not refuse a scenario the consumer excluded. And
    //       two reasons to skip one scenario must still produce one test: twice-registered
    //       would put two tests of one name in the report and double every count built on it.
    // HOW:  count only the scenarios the filter kept when deciding the unbound-step refusal,
    //       and let the two skip reasons share the one registration.
    judge: (observed) => {
      const wrong = ranCleanly(observed);
      const skippedOne = observed.tests.filter(
        (each) => each.name === THE_EXCLUDED_UNWIRED_SCENARIO
      );

      if (skippedOne.length !== 1)
        wrong.push(
          `"${THE_EXCLUDED_UNWIRED_SCENARIO}" appears ${skippedOne.length} time(s) in the ` +
            "report, not once. Excluded and unwired are two reasons to skip one scenario, " +
            "and they have to share one registration"
        );
      if (skippedOne.length === 1 && skippedOne[0].status !== SKIPPED)
        wrong.push(
          `"${THE_EXCLUDED_UNWIRED_SCENARIO}" was ${skippedOne[0].status}, not ${SKIPPED}`
        );

      const sibling = observed.tests.filter(
        (each) => each.name === THE_SELECTED_SCENARIO
      );
      if (sibling.length !== 1 || sibling[0].status !== PASSED)
        wrong.push(
          `"${THE_SELECTED_SCENARIO}" is not the single passed test it should be; the report ` +
            `reads ${JSON.stringify(asReport(observed))}`
        );

      if (observed.failureText.includes("No step definition matches"))
        wrong.push(
          "an unmatched-step refusal was raised even though the only unbound step is in a " +
            "scenario the filter excluded. A consumer who excluded a scenario is not asking " +
            "for its steps to be bound"
        );

      return wrong;
    },
  },
];

// --- main ----------------------------------------------------------------------------------

const failures = [];

RUNS.forEach((run) => {
  const observed = childRun(run.name, run.fixture);
  const wrong = run.judge(observed);

  console.log(
    `${wrong.length === 0 ? "holds " : "FAILS "} ${run.name}\n` +
      `         ${run.fixture} -> exit ${observed.exitStatus}, ` +
      `${observed.tests.length} test(s): ${
        asReport(observed).join(", ") || "none"
      }`
  );

  if (wrong.length > 0) failures.push({ run: run.name, wrong });
});

if (failures.length > 0) {
  console.error(
    `\ntagFilter does not behave as the contract says. ` +
      `${failures.length} of ${RUNS.length} child runs differ:\n`
  );
  failures.forEach((failure) => {
    console.error(`  - ${failure.run}`);
    failure.wrong.forEach((one) => console.error(`      ${one}`));
    console.error("");
  });
  process.exit(1);
}

console.log(
  `\nAll ${RUNS.length} child runs hold: the excluded scenario is reported skipped under its ` +
    "own name while its sibling passes, the same filter in another case selects the same " +
    "scenarios, an unparseable expression is refused rather than quietly selecting nothing, " +
    "and an excluded scenario nobody wired is skipped once and never refused."
);
