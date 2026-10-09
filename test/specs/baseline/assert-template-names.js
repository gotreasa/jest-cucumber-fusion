#!/usr/bin/env node
/**
 * What a scenarioNameTemplate does to the names in a Jest report.
 *
 * test/specs/features/step-definitions/v4-scenario-name-template.steps.js observes what the
 * template was HANDED. That is half the promise. The other half is only visible in a report:
 * that the value the template returned became the test's name -- for every test, each Examples
 * row under its own substituted title, and for a skipped test the same name it would have
 * carried had it run. A recording template cannot see what Jest called the test it named, so
 * this script runs jest in a child process, once per consumer fixture, with an explicit
 * testMatch, and reads the names Jest itself recorded.
 *
 * Four runs:
 *   a template and no filter      -> every test under its templated name, one per Examples row
 *   the same template and a filter -> the SAME four names, one of them skipped instead of
 *                                     passed
 *   a template that throws         -> the run FAILS with no test reported
 *   a template that returns nothing -> the same
 *
 * Exits 0 only when all four observations were made and all four held. A child run that
 * cannot be started, or whose report cannot be read, prints which run it was and exits
 * non-zero: "I could not look" must never share an exit status with "I looked and it is fine".
 */

import fs from "fs";
import os from "os";
import path from "path";
import { spawnSync } from "child_process";

const repositoryRoot = path.resolve(import.meta.dirname, "..", "..", "..");

const SKIPPED = "pending"; // what Jest calls a test registered through test.skip
const PASSED = "passed";

// The four tests test/specs/fixtures/template-names.feature declares, as the fixtures'
// template names them: `templated: ` followed by the title of the individual test. For the two
// Examples rows that is the row's OWN substituted title, which is the whole of this value.
const THE_TEMPLATED_NAMES = [
  "templated: A shopper pays at the till",
  "templated: A shopper leaves empty handed",
  "templated: A shopper collects shirt",
  "templated: A shopper collects sticker",
];
const THE_EXCLUDED_NAME = "templated: A shopper leaves empty handed";

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

const childRun = (runName, fixtureFileName) => {
  const reportDirectory = fs.mkdtempSync(
    path.join(os.tmpdir(), "fusion-template-names-"),
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
        // Fusion is ES modules, so the child Jest runs in its ESM mode.
        env: { ...process.env, NODE_OPTIONS: "--experimental-vm-modules" },
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      },
    );

    if (run.error)
      cannotObserve(
        runName,
        `jest could not be started: ${run.error.message}`,
        "the names Jest records are the only evidence this script accepts",
        "install the dependencies (npm ci) and try again",
      );

    if (!fs.existsSync(reportFile))
      cannotObserve(
        runName,
        "the child jest wrote no JSON report",
        "there are no recorded names to read, so nothing is observed either way",
        `check the child output:\n${(run.stderr || run.stdout || "").trim()}`,
      );

    let report;
    try {
      report = JSON.parse(fs.readFileSync(reportFile, "utf8"));
    } catch (unreadable) {
      return cannotObserve(
        runName,
        `the JSON report could not be parsed: ${unreadable.message}`,
        "an unparseable report is not evidence that a test was named one thing or another",
        `run jest with --testMatch "**/${fixtureFileName}" --json by hand`,
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
          "testMatch still selects it",
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

// The whole report as one value: every name with its status, so an untemplated name, a renamed
// test, a missing one and an extra one all fail the same comparison. Sorted, because
// registration order is value 1's contract and not this value's.
const asReport = (observed) =>
  observed.tests.map((each) => `${each.name} [${each.status}]`).sort();

const expectedReport = (statusOf) =>
  THE_TEMPLATED_NAMES.map((name) => `${name} [${statusOf(name)}]`).sort();

const theReportReads = (observed, expected, whyItMatters) =>
  JSON.stringify(asReport(observed)) === JSON.stringify(expected)
    ? []
    : [
        `the report reads\n          ${asReport(observed).join(
          "\n          ",
        )}\n        and not\n          ${expected.join(
          "\n          ",
        )}\n        ` + whyItMatters,
      ];

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

const refusedWithNoTestReported = (observed, whyItMatters) => {
  const wrong = [];

  if (observed.exitStatus === 0)
    wrong.push(`the child run exited 0. ${whyItMatters}`);
  if (observed.suiteStatus !== "failed")
    wrong.push(`the suite status was "${observed.suiteStatus}", not "failed"`);
  if (observed.tests.length !== 0)
    wrong.push(
      `${observed.tests.length} test(s) were reported: ${JSON.stringify(
        asReport(observed),
      )}. A template that cannot produce a name leaves no honest name to register a test ` +
        "under, so the refusal has to stop the file before any describe",
    );

  return wrong;
};

const RUNS = [
  {
    name: "a template and no tag filter",
    fixture: "template-names.fixture.js",
    // WHAT: all four tests reported under their templated names and passing, each Examples row
    //       carrying its own substituted title.
    // WHY:  this is the option a consumer has been passing all along. On every Examples row it
    //       did nothing: the previous engine called the template with the outline's
    //       un-substituted title and then registered the row under its own name, discarding
    //       the templated value. Two rows reported untemplated, or reported under one shared
    //       name, is that behaviour unfixed.
    // HOW:  name each test from the pickle it was compiled from, which already carries the
    //       row's substituted title.
    judge: (observed) => [
      ...ranCleanly(observed),
      ...theReportReads(
        observed,
        expectedReport(() => PASSED),
        "A name that is not the template's output is the option being ignored for that test.",
      ),
    ],
  },
  {
    name: "the same template with a tag filter",
    fixture: "template-with-tag-filter.fixture.js",
    // WHAT: the SAME four names as the run above, with the excluded one skipped rather than
    //       passed.
    // WHY:  a test whose reported name depended on whether it ran could not be compared across
    //       runs: a reader would see one test disappear and another appear instead of one test
    //       changing status. So naming a skipped test from the raw title while naming a running
    //       one from the template is the defect, and comparing this report against the one
    //       above is what catches it.
    // HOW:  take the name from one call and use it on both the running and the skipping route.
    judge: (observed) => [
      ...ranCleanly(observed),
      ...theReportReads(
        observed,
        expectedReport((name) =>
          name === THE_EXCLUDED_NAME ? SKIPPED : PASSED,
        ),
        "Only the STATUS may differ from the unfiltered run; every name must be identical.",
      ),
    ],
  },
  {
    name: "a template that throws",
    fixture: "template-throws.fixture.js",
    // WHAT: the run fails and reports no test.
    // WHY:  swallowing the failure would name one test from the template and the next from the
    //       raw title, which is worse than refusing: the report would look complete and two
    //       runs of it could not be compared.
    // HOW:  let the template's throw become one refusal at collection, before any describe.
    judge: (observed) =>
      refusedWithNoTestReported(
        observed,
        "A template that throws cannot name a test, and there is no honest name to fall " +
          "back on.",
      ),
  },
  {
    name: "a template that returns nothing",
    fixture: "template-returns-non-string.fixture.js",
    // WHAT: the same -- failed, no test reported -- for a template that answered undefined,
    //       which is what a consumer gets by forgetting a return.
    // WHY:  the previous engine handed that straight to the runner and produced a test with no
    //       usable name: unreportable, and unselectable by name afterwards. This check is new,
    //       and it is the one that turns a silent mistake into a message.
    // HOW:  check the answer is a non-empty string before it reaches the runner.
    judge: (observed) =>
      refusedWithNoTestReported(
        observed,
        "A test name has to be a non-empty string; anything else produces a test that " +
          "cannot be reported or selected by name.",
      ),
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
      }`,
  );

  if (wrong.length > 0) failures.push({ run: run.name, wrong });
});

if (failures.length > 0) {
  console.error(
    `\nscenarioNameTemplate does not name tests as the contract says. ` +
      `${failures.length} of ${RUNS.length} child runs differ:\n`,
  );
  failures.forEach((failure) => {
    console.error(`  - ${failure.run}`);
    failure.wrong.forEach((one) => console.error(`      ${one}`));
    console.error("");
  });
  process.exit(1);
}

console.log(
  `\nAll ${RUNS.length} child runs hold: every test is reported under its templated name, ` +
    "each Examples row under its own substituted title, a skipped test keeps the name it " +
    "would have had if it ran, and a template that cannot produce a name is refused rather " +
    "than naming a test something Jest cannot report.",
);
