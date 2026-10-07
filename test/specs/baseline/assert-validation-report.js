#!/usr/bin/env node
/**
 * What the errors option does, read from Jest's own report rather than from a spy.
 *
 * The central promise of this value is negative: switching validation off must never turn an
 * unwired scenario into a PASSING test, and must never make it disappear. A spy on test.skip
 * would prove only that Fusion called a function -- it would say nothing about what a consumer
 * sees. So this script runs jest in a child process, once per consumer fixture under
 * test/specs/fixtures, with an explicit testMatch, and reads the status Jest itself recorded.
 *
 * Six runs, each a different answer the option has to give:
 *
 *   unbound, default              -> the file is refused at collection, no test runs, and the
 *                                    refusal carries the starter code
 *   unbound, errors false         -> the unwired scenario is reported SKIPPED, its sibling
 *                                    passes
 *   unbound, one key false        -> the same skip, and the key the consumer did not name is
 *                                    still in force
 *   duplicate titles, default     -> the file is refused at collection, no test runs
 *   duplicate titles, key false   -> the file is accepted and the repeated names all pass
 *   outline rows, default         -> three rows of one declared title are not duplicates
 *
 * The fixtures end in .fixture.js so the repository runner does not collect them: two of them
 * MUST fail collection, which would break the whole-repository vector. This script reaches
 * them with an explicit testMatch instead, and needs no change to the Jest configuration.
 *
 * Exits 0 only when all six observations were actually made and all six held. A child run
 * that cannot be started, or whose report cannot be read, prints which run it was and exits
 * non-zero: "I could not look" must never share an exit status with "I looked and it is fine".
 */

const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const repositoryRoot = path.resolve(__dirname, "..", "..", "..");

const SKIPPED = "pending"; // what Jest calls a test registered through test.skip
const PASSED = "passed";

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

// One child jest over exactly one fixture. The report is written outside the repository so a
// failed run leaves nothing behind in the tree.
const childRun = (runName, fixtureFileName) => {
  const reportDirectory = fs.mkdtempSync(
    path.join(os.tmpdir(), "fusion-validation-report-")
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

    if (run.error) {
      cannotObserve(
        runName,
        `jest could not be started: ${run.error.message}`,
        "the status Jest records is the only evidence this script accepts",
        "install the dependencies (npm ci) and try again"
      );
    }
    if (!fs.existsSync(reportFile)) {
      cannotObserve(
        runName,
        "the child jest wrote no JSON report",
        "there is no recorded status to read, so nothing is observed either way",
        `check the child output:\n${(run.stderr || run.stdout || "").trim()}`
      );
    }

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

    if (!Array.isArray(report.testResults) || report.testResults.length !== 1) {
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
    }

    const suite = report.testResults[0];

    return {
      exitStatus: run.status,
      suiteStatus: suite.status,
      collectionFailure: withoutAnsi(suite.message),
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

const statusOf = (observed, testName) => {
  const found = observed.tests.filter((each) => each.name === testName);
  if (found.length === 0) return "<absent>";
  if (found.length > 1) return `<${found.length} tests of that name>`;
  return found[0].status;
};

// A title and its declared count have to appear together, not merely both somewhere in a long
// message. A window keeps that honest without pinning the refusal's layout.
const nearTheTitle = (message, title, howMany) => {
  const collapsed = message.replace(/\s+/g, " ");
  const at = collapsed.toLowerCase().indexOf(title.toLowerCase());
  if (at === -1) return false;
  const window = collapsed.slice(Math.max(0, at - 60), at + title.length + 60);
  return new RegExp(`(^|[^0-9])${howMany}([^0-9]|$)`).test(window);
};

const refusedAtCollection = (observed) => {
  const wrong = [];
  if (observed.exitStatus === 0)
    wrong.push("the child run exited 0; the file was not refused");
  if (observed.suiteStatus !== "failed")
    wrong.push(`the suite status was "${observed.suiteStatus}", not "failed"`);
  if (observed.tests.length !== 0)
    wrong.push(
      `${observed.tests.length} test(s) ran: ${observed.tests
        .map((each) => `"${each.name}" (${each.status})`)
        .join(
          ", "
        )}. A refusal must stop the file before any describe, so no ` +
        "test of it is registered and none is fabricated to carry the failure"
    );
  return wrong;
};

const everyTestPassed = (observed) => {
  const wrong = [];
  if (observed.exitStatus !== 0)
    wrong.push(
      `the child run exited ${observed.exitStatus}, not 0:\n        ` +
        observed.collectionFailure
          .trim()
          .split("\n")
          .slice(0, 6)
          .join("\n        ")
    );
  observed.tests
    .filter((each) => each.status !== PASSED)
    .forEach((each) =>
      wrong.push(`"${each.name}" was ${each.status}, not ${PASSED}`)
    );
  return wrong;
};

const RUNS = [
  {
    name: "unbound step, default options",
    fixture: "unbound-step-default.fixture.js",
    // WHAT: the file is refused at collection and the refusal carries the starter code.
    // WHY:  this is what a consumer actually sees in their terminal. A refusal that never
    //       reaches Jest's report, or one that reaches it without the code to paste, leaves
    //       them to work out the binding from the step text alone.
    // HOW:  raise one refusal out of Fusion before any describe, built by src/code-suggestion.js.
    judge: (observed) => {
      const wrong = refusedAtCollection(observed);
      const message = observed.collectionFailure;

      if (!message.includes('No step definition matches: "the shop is closed"'))
        wrong.push(
          'the refusal does not carry the line No step definition matches: "the shop is ' +
            'closed", which is the phrase undefined-step.steps.js and two seam regressions ' +
            "match on"
        );
      if (!/Given\(\s*"the shop is closed"\s*,/.test(message))
        wrong.push(
          "the refusal carries no starter code in Fusion's verb idiom for that step: no " +
            'Given("the shop is closed", ...) appears in what Jest reported'
        );
      if (!/=>/.test(message))
        wrong.push("the starter code carries no step function to paste");

      return wrong;
    },
  },
  {
    name: "unbound step, errors false",
    fixture: "unbound-step-errors-false.fixture.js",
    // WHAT: the unwired scenario is SKIPPED in Jest's report, its sibling passes, and the run
    //       exits 0.
    // WHY:  the whole point of the ruling. Validation can be switched off, never switched into
    //       silence: a passing test for a scenario with no definitions is a lie, and an absent
    //       test hides the gap just as well.
    // HOW:  register the affected scenario through test.skip under its own unannotated name,
    //       and register the scenarios that do bind as ordinary tests.
    judge: (observed) => {
      const wrong = [];
      if (observed.exitStatus !== 0)
        wrong.push(
          `the child run exited ${observed.exitStatus}, not 0:\n        ` +
            observed.collectionFailure
              .trim()
              .split("\n")
              .slice(0, 6)
              .join("\n        ")
        );

      const unwired = statusOf(observed, "Closing the shop");
      const sibling = statusOf(observed, "Opening the shop");

      if (unwired !== SKIPPED)
        wrong.push(
          `"Closing the shop" was ${unwired}, not ${SKIPPED}. ` +
            (unwired === PASSED
              ? "A scenario whose step binds nothing reported as PASSED is the silent pass " +
                "this value exists to make impossible."
              : "It has to be present and skipped, not absent.")
        );
      if (sibling !== PASSED)
        wrong.push(
          `"Opening the shop" was ${sibling}, not ${PASSED}. Switching the check off must ` +
            "cost the consumer only the scenarios that are genuinely unwired."
        );
      if (observed.tests.length !== 2)
        wrong.push(
          `the run reported ${observed.tests.length} tests, not the 2 scenarios the feature ` +
            "declares"
        );

      return wrong;
    },
  },
  {
    name: "unbound step, stepsMustMatchFeatureFile false only",
    fixture: "unbound-step-steps-key-false.fixture.js",
    // WHAT: the same skip through the explicit key, plus the fixture's own test proving the
    //       key the consumer never named is still in force.
    // WHY:  an object-valued errors that REPLACED the defaults would switch off the duplicate
    //       check too, so asking about one validation would quietly remove another.
    // HOW:  merge an object-valued errors key-wise over the defaults.
    judge: (observed) => {
      const wrong = [];
      if (observed.exitStatus !== 0)
        wrong.push(
          `the child run exited ${observed.exitStatus}, not 0:\n        ` +
            observed.collectionFailure
              .trim()
              .split("\n")
              .slice(0, 6)
              .join("\n        ")
        );

      const unwired = statusOf(observed, "Closing the shop");
      const sibling = statusOf(observed, "Opening the shop");
      const keyWiseMerge = statusOf(
        observed,
        "naming one errors key leaves the key the consumer did not name alone"
      );

      if (unwired !== SKIPPED)
        wrong.push(`"Closing the shop" was ${unwired}, not ${SKIPPED}`);
      if (sibling !== PASSED)
        wrong.push(`"Opening the shop" was ${sibling}, not ${PASSED}`);
      if (keyWiseMerge !== PASSED)
        wrong.push(
          `the fixture's own key-wise-merge test was ${keyWiseMerge}, not ${PASSED}: naming ` +
            "stepsMustMatchFeatureFile did not leave scenariosMustMatchFeatureFile alone"
        );

      return wrong;
    },
  },
  {
    name: "duplicate declared titles, default options",
    fixture: "duplicate-titles-default.fixture.js",
    // WHAT: the file is refused at collection, no test of it runs, and the refusal names every
    //       duplicated title with how many times it is declared and both ways to proceed.
    // WHY:  Fusion generates one test per scenario, so two scenarios of one title cannot be
    //       told apart in a report. Refusing on the first duplicate, or refusing without
    //       saying which title or what to do, bills the consumer a re-run to find out.
    // HOW:  compare declared scenario and outline titles case-insensitively, Rule children
    //       included, and raise one refusal naming all of them before any describe.
    judge: (observed) => {
      const wrong = refusedAtCollection(observed);
      const message = observed.collectionFailure;

      if (!nearTheTitle(message, "selling a shirt", 3))
        wrong.push(
          'the refusal does not name "Selling a shirt" together with the 3 times it is ' +
            "declared (two at feature level, one inside the Rule, one differing only in case)"
        );
      if (!nearTheTitle(message, "refunding a shirt", 2))
        wrong.push(
          'the refusal does not name "Refunding a shirt" together with the 2 times it is ' +
            "declared, so it is not naming every duplicated title in one message"
        );
      if (!message.includes("scenariosMustMatchFeatureFile"))
        wrong.push(
          "the refusal does not tell the consumer that scenariosMustMatchFeatureFile accepts " +
            "the file, so it states a problem without a way forward"
        );

      return wrong;
    },
  },
  {
    name: "duplicate declared titles, scenariosMustMatchFeatureFile false",
    fixture: "duplicate-titles-key-false.fixture.js",
    // WHAT: the file is accepted and every scenario, repeated names included, runs and passes.
    // WHY:  a consumer who switches the check off has asked for exactly this. A check that
    //       cannot be switched off is not an option, it is a rule.
    // HOW:  read scenariosMustMatchFeatureFile and skip the comparison when it is false.
    judge: (observed) => {
      const wrong = everyTestPassed(observed);
      const names = observed.tests.map((each) => each.name).sort();

      if (
        JSON.stringify(names) !==
        JSON.stringify([
          "Refunding a shirt",
          "Refunding a shirt",
          "Selling a shirt",
          "Selling a shirt",
          "selling a shirt",
        ])
      )
        wrong.push(
          `the accepted file produced ${names.length} tests ${JSON.stringify(
            names
          )}, not the five scenarios it declares. Accepting the file means registering ` +
            "every one of them, repeats and all"
        );

      return wrong;
    },
  },
  {
    name: "one outline, three rows of one declared title, default options",
    fixture: "outline-rows-not-duplicates.fixture.js",
    // WHAT: three tests of the same generated name, all passing, under the DEFAULT.
    // WHY:  this is the whole correctness of the duplicate check. One Scenario Outline
    //       contributes one declared title however many rows it has, and the 2.0.0 baseline
    //       holds three tests named "Selling all of one" from exactly this shape. A check that
    //       compared generated names would reject a file the baseline depends on.
    // HOW:  compare declared definitions, never generated test names.
    judge: (observed) => {
      const wrong = everyTestPassed(observed);
      const names = observed.tests.map((each) => each.name);

      if (
        names.length !== 3 ||
        !names.every((name) => name === "Selling all of one")
      )
        wrong.push(
          `the run reported ${names.length} test(s) ${JSON.stringify(
            names
          )}, not the three identically named Examples rows the outline declares`
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
        observed.tests
          .map((each) => `${each.name} [${each.status}]`)
          .join(", ") || "none"
      }`
  );

  if (wrong.length > 0) failures.push({ run: run.name, wrong });
});

if (failures.length > 0) {
  console.error(
    `\nThe errors option does not behave as the contract says. ` +
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
  `\nAll ${RUNS.length} child runs hold: an unbound step is refused with the code that would ` +
    "bind it, switching the check off reports the scenario skipped and never passed, a " +
    "duplicated declared title is refused by default and accepted when the key says so, and " +
    "an outline's repeated row names are not duplicates."
);
