#!/usr/bin/env node
/**
 * The names a consumer's CI history is keyed on have not moved.
 *
 * Runs the repository suite once and compares, for every suite recorded in
 * test/specs/baseline/test-names-2.0.0.txt, the describe titles and the ORDERED list of test
 * names this package generates from that suite's committed feature file. The baseline file is
 * the population: a suite with no entry there is not compared, and the reason for every
 * exclusion is written down in that file.
 *
 * Exits 0 only when the comparison was actually made and every recorded suite matched.
 * Anything that stops the comparison being made -- no runner, no JSON report, a suite that
 * failed to collect -- is reported and exits non-zero. It never reports success for an
 * observation it did not make.
 *
 * It does NOT require the suite to pass. Names are the subject; whether a test is green is
 * the business of the other verification vectors.
 */

const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const repositoryRoot = path.resolve(__dirname, "..", "..", "..");
const baselineFile = path.join(__dirname, "test-names-2.0.0.txt");

const cannotObserve = (what, why, how) => {
  console.error(`CANNOT OBSERVE the generated test names.`);
  console.error(`  WHAT: ${what}`);
  console.error(`  WHY:  ${why}`);
  console.error(`  HOW:  ${how}`);
  process.exit(2);
};

const parseBaseline = (text) => {
  const suites = [];
  let current = null;

  text.split("\n").forEach((rawLine, lineIndex) => {
    const line = rawLine.replace(/\s+$/, "");
    if (line === "" || line.startsWith("#")) return;

    const separator = line.indexOf(": ");
    const label = separator === -1 ? line : line.slice(0, separator);
    const value = separator === -1 ? "" : line.slice(separator + 2);

    if (label === "suite") {
      current = { suitePath: value, entries: [] };
      suites.push(current);
      return;
    }
    if (!current) {
      cannotObserve(
        `${baselineFile}:${
          lineIndex + 1
        } holds a "${label}" line before any "suite:" line`,
        "every recorded name has to belong to a named suite, or the comparison has no subject",
        "put a `suite: <path>` line above it"
      );
    }
    if (label === "describe" || label === "test") {
      current.entries.push({ kind: label, name: value });
      return;
    }
    cannotObserve(
      `${baselineFile}:${lineIndex + 1} holds an unknown label "${label}"`,
      "an unreadable baseline cannot be compared against anything",
      "use only `suite:`, `describe:` and `test:` lines, or a `#` comment"
    );
  });

  return suites;
};

const runTheSuite = () => {
  const reportDirectory = fs.mkdtempSync(
    path.join(os.tmpdir(), "fusion-baseline-names-")
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
        `the test runner could not be started: ${run.error.message}`,
        "without a run there are no generated names to compare",
        "install the dependencies (npm ci) and try again"
      );
    }
    if (!fs.existsSync(reportFile)) {
      cannotObserve(
        "the test runner wrote no JSON report",
        "the names are read from that report, so there is nothing to compare",
        `check the runner output:\n${(run.stderr || run.stdout || "").trim()}`
      );
    }

    try {
      return JSON.parse(fs.readFileSync(reportFile, "utf8"));
    } catch (unreadable) {
      return cannotObserve(
        `the JSON report could not be parsed: ${unreadable.message}`,
        "an unparseable report is not evidence that the names are unchanged",
        "re-run `npx jest --json` by hand and look at what it wrote"
      );
    }
  } finally {
    fs.rmSync(reportDirectory, { recursive: true, force: true });
  }
};

const namesGeneratedBy = (suiteResult) => {
  const entries = [];
  let currentDescribe = null;

  suiteResult.assertionResults.forEach((assertion) => {
    const describeTitle = assertion.ancestorTitles.join(" > ");
    if (describeTitle !== currentDescribe) {
      entries.push({ kind: "describe", name: describeTitle });
      currentDescribe = describeTitle;
    }
    entries.push({ kind: "test", name: assertion.title });
  });

  return entries;
};

const asLines = (entries) =>
  entries.map((entry) => `${entry.kind}: ${entry.name}`);

const firstDifference = (recorded, observed) => {
  const limit = Math.max(recorded.length, observed.length);
  for (let index = 0; index < limit; index += 1) {
    if (recorded[index] !== observed[index]) {
      return {
        index,
        recorded: recorded[index] === undefined ? "<nothing>" : recorded[index],
        observed: observed[index] === undefined ? "<nothing>" : observed[index],
      };
    }
  }
  return null;
};

// --- main ----------------------------------------------------------------------------------

if (!fs.existsSync(baselineFile)) {
  cannotObserve(
    `the baseline ${baselineFile} is missing`,
    "the recorded 2.0.0 names are the only thing the run can be compared against",
    "restore the file from git rather than regenerating it from the current tree"
  );
}

const recordedSuites = parseBaseline(fs.readFileSync(baselineFile, "utf8"));
if (recordedSuites.length === 0) {
  cannotObserve(
    `the baseline ${baselineFile} records no suite`,
    "an empty baseline would make every possible run pass",
    "restore the file from git"
  );
}

const report = runTheSuite();
if (!Array.isArray(report.testResults)) {
  cannotObserve(
    "the JSON report holds no testResults array",
    "there is nowhere to read the generated names from",
    "check that the installed jest supports --json --outputFile"
  );
}

const observedBySuite = new Map(
  report.testResults.map((suiteResult) => [
    path.relative(repositoryRoot, suiteResult.name),
    suiteResult,
  ])
);

const failures = [];

recordedSuites.forEach((recorded) => {
  const observed = observedBySuite.get(recorded.suitePath);

  if (!observed) {
    failures.push(
      `${recorded.suitePath}\n` +
        `    WHAT: the suite did not appear in the run at all.\n` +
        `    WHY:  a baseline suite that is deleted, renamed, or no longer calls Fusion() on its\n` +
        `          feature file silently removes the names it used to protect.\n` +
        `    HOW:  keep the suite at that path driving that feature file; if it genuinely has to\n` +
        `          move, move its entry in the baseline in the same change and say why.`
    );
    return;
  }

  const observedLines = asLines(namesGeneratedBy(observed));
  const recordedLines = asLines(recorded.entries);

  if (observedLines.length === 0) {
    failures.push(
      `${recorded.suitePath}\n` +
        `    WHAT: the suite reported no tests at all.\n` +
        `    WHY:  a suite that fails to collect generates no names, so this run is no evidence\n` +
        `          that the names are unchanged.\n` +
        `    HOW:  make the suite collect (run it on its own), then compare again.`
    );
    return;
  }

  const difference = firstDifference(recordedLines, observedLines);
  if (difference) {
    failures.push(
      `${recorded.suitePath}\n` +
        `    WHAT: entry ${
          difference.index + 1
        } of the generated names differs.\n` +
        `          2.0.0 recorded: ${difference.recorded}\n` +
        `          this run gives: ${difference.observed}\n` +
        `    WHY:  a consumer's CI report and test history are keyed on these strings in this\n` +
        `          order. A rename, a reorder, a dropped Examples-row substitution or two\n` +
        `          identically titled rows collapsed into one all read as a regression to them.\n` +
        `    HOW:  generate one describe per feature title and one test per scenario and per\n` +
        `          Examples row, with the row's values substituted into the title, keeping every\n` +
        `          plain scenario of a feature ahead of that feature's Examples rows and leaving\n` +
        `          repeated titles repeated in place.`
    );
  }
});

if (failures.length > 0) {
  console.error(
    `The generated describe and test names have moved away from the 2.0.0 baseline.\n` +
      `Compared ${recordedSuites.length} recorded suite(s) in ${baselineFile}; ` +
      `${failures.length} differ:\n`
  );
  failures.forEach((failure) => console.error(`  - ${failure}\n`));
  process.exit(1);
}

const totalNames = recordedSuites.reduce(
  (count, suite) =>
    count + suite.entries.filter((entry) => entry.kind === "test").length,
  0
);

console.log(
  `Every suite recorded in the 2.0.0 baseline is still present and still generates an ` +
    `identical ordered list of names.\n` +
    `  suites compared: ${recordedSuites.length} of ${recordedSuites.length} recorded ` +
    `(of ${report.testResults.length} suites in the run)\n` +
    `  test names compared: ${totalNames}, repeats kept in place\n` +
    `  baseline: ${path.relative(repositoryRoot, baselineFile)}`
);
