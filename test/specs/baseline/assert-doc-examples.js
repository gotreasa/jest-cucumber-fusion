#!/usr/bin/env node
/**
 * Every guide page's example runs as written, on the real tarball.
 *
 * A documentation review on 2026-10-10 (gSmith's pedagogy reviewer, nWave's documentarist and
 * an adversarial pass that ran the code) found guide examples that failed when a reader copied
 * them: a Gherkin tables page that passed only against a buggy fixture class it never showed,
 * a Language page with two of five step definitions, and pages whose import and Fusion paths
 * fit only this repository's own folders. Nothing ran them, so nothing noticed.
 *
 * So each page names the file every block belongs in, on the block's first line (second for a
 * feature that opens with `# language:`): `// filename: test/features/x.steps.js` or
 * `# filename: test/features/x.feature`. This script writes each page's named blocks into a
 * fresh ES module project laid out as the README's Getting Started is, installs the packed
 * tarball, runs the README's `npm test`, and requires every steps file to load and every test
 * to pass. A block without a filename is a fragment and is not run. A section headed
 * "Written as CommonJS" is skipped: its files repeat the ES module ones by name.
 *
 * Like assert-packaged-consumer.js it needs the registry for the install, and it prints which
 * step it could not run and exits 2 rather than pass on an observation it did not make.
 */

import fs from "fs";
import os from "os";
import path from "path";
import { spawnSync } from "child_process";

const PAGES = [
  "docs/GherkinTables.md",
  "docs/ScenarioOutlines.md",
  "docs/StepDefinitionArguments.md",
  "docs/Language.md",
  "docs/ReusingStepDefinitions.md",
  "docs/AdditionalConfiguration.md",
];

const repositoryRoot = path.resolve(import.meta.dirname, "..", "..", "..");
const FILENAME = /^(?:\/\/|#+)\s*filename:\s*(\S+)/;

let workspace = null;
const cleanUp = () => {
  if (workspace) fs.rmSync(workspace, { recursive: true, force: true });
  workspace = null;
};

const cannotObserve = (step, what, how) => {
  console.error(`CANNOT OBSERVE the documentation examples: ${step}.`);
  console.error(`  WHAT: ${what}`);
  console.error(`  HOW:  ${how}`);
  cleanUp();
  process.exit(2);
};

const run = (command, argv, options) =>
  spawnSync(command, argv, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    ...options,
  });

// The named blocks of one page, as { file: contents }, the last block for a name winning.
const namedBlocksOf = (page) => {
  const text = fs.readFileSync(path.join(repositoryRoot, page), "utf8");
  const cut = text.indexOf("\n## Written as CommonJS");
  const runnable = cut === -1 ? text : text.slice(0, cut);
  const files = {};
  for (const match of runnable.matchAll(/```[a-z]*\n([\s\S]*?)```/g)) {
    const lines = match[1].split("\n");
    const named = lines.slice(0, 2).map((line) => FILENAME.exec(line));
    const found = named.find(Boolean);
    if (found) files[found[1]] = match[1];
  }
  return files;
};

process.on("exit", cleanUp);
workspace = fs.mkdtempSync(path.join(os.tmpdir(), "fusion-doc-examples-"));

const packed = run(
  "npm",
  ["pack", "--json", `--pack-destination=${workspace}`],
  {
    cwd: repositoryRoot,
  },
);
if (packed.status !== 0) {
  cannotObserve(
    "npm pack",
    `npm pack exited ${packed.status}`,
    (packed.stderr || "").trim(),
  );
}
const tarball = path.join(workspace, JSON.parse(packed.stdout)[0].filename);

// One install, shared by every page's project through a link.
const installed = path.join(workspace, "installed");
fs.mkdirSync(installed);
fs.writeFileSync(
  path.join(installed, "package.json"),
  '{ "name": "installed", "private": true }\n',
);
const install = run(
  "npm",
  ["install", "--no-audit", "--no-fund", tarball, "@jest/globals"],
  { cwd: installed },
);
if (install.status !== 0) {
  cannotObserve(
    "npm install of the tarball",
    `npm install exited ${install.status}`,
    (install.stderr || "").trim(),
  );
}

const environment = { ...process.env };
delete environment.NODE_OPTIONS;

const failures = [];
const summaries = [];

PAGES.forEach((page) => {
  const files = namedBlocksOf(page);
  const stepsFiles = Object.keys(files).filter((name) =>
    name.endsWith(".steps.js"),
  );
  if (stepsFiles.length === 0) {
    failures.push(
      `${page}: names no steps file, so none of its examples can be run.\n` +
        "    HOW:  put `// filename: test/features/<name>.steps.js` on the first line of the\n" +
        "          page's steps example, and name its feature and code under test the same way.",
    );
    return;
  }

  const project = path.join(workspace, path.basename(page, ".md"));
  fs.mkdirSync(project);
  fs.symlinkSync(
    path.join(installed, "node_modules"),
    path.join(project, "node_modules"),
    "dir",
  );
  fs.writeFileSync(
    path.join(project, "package.json"),
    `${JSON.stringify(
      {
        name: path.basename(page, ".md").toLowerCase(),
        private: true,
        type: "module",
        scripts: {
          test: "node --experimental-vm-modules node_modules/jest/bin/jest.js",
        },
        jest: { testMatch: ["**/*.steps.js"] },
      },
      null,
      2,
    )}\n`,
  );
  Object.entries(files).forEach(([name, contents]) => {
    const target = path.join(project, name);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, contents);
  });

  const tests = run(
    "npm",
    ["test", "--silent", "--", "--coverage=false", "--json"],
    { cwd: project, env: environment },
  );
  let results = null;
  try {
    results = JSON.parse(tests.stdout);
  } catch {
    results = null;
  }
  const counts = results && {
    suites: results.numTotalTestSuites,
    failedSuites: results.numFailedTestSuites,
    passed: results.numPassedTests,
    failed: results.numFailedTests,
  };
  summaries.push(`${page}: ${JSON.stringify(counts)}`);

  if (
    tests.status !== 0 ||
    !counts ||
    counts.suites !== stepsFiles.length ||
    counts.failedSuites !== 0 ||
    counts.failed !== 0 ||
    counts.passed === 0
  ) {
    failures.push(
      `${page}: its examples, written into a project as the page names them, gave exit\n` +
        `          ${tests.status} with ${JSON.stringify(counts)}; expected exit 0, ${stepsFiles.length}\n` +
        "          suite(s), none failed, at least one test passed.\n" +
        "    WHY:  a reader copies the page as written. An example that does not run teaches the\n" +
        "          wrong thing, and a reader cannot tell which part is wrong.\n" +
        "    HOW:  make the page's feature, steps and code under test agree, using the README's\n" +
        "          layout (feature beside steps under test/features/, code under test in src/).\n" +
        "    Jest said:\n" +
        `${(tests.stderr || "").trim().split("\n").slice(0, 40).join("\n")}`,
    );
  }
});

if (failures.length > 0) {
  console.error("\nSome documentation examples do not run as written.");
  failures.forEach((failure) => console.error(`  - ${failure}\n`));
  process.exit(1);
}

console.log(
  "Every guide page's examples run as written on the packed tarball.\n" +
    summaries.map((line) => `  ${line}`).join("\n"),
);
