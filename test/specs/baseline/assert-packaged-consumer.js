#!/usr/bin/env node
/**
 * A real consumer project, installing the real tarball, gets a working Fusion and no advisory.
 *
 * test/specs/baseline/assert-no-advisory-dependency.js reads THIS repository's tree. That is
 * necessary and not sufficient: a packaging mistake -- a files field, an .npmignore, a source
 * file left out of the tarball -- shows up only once someone installs the package somewhere
 * else. So this script closes the lineage a paying consumer actually walks:
 *
 *   this repository -> npm pack -> one tarball -> a fresh empty project outside the
 *   repository -> npm install -> that project's own jest -> a passing test and a tree with
 *   no jest-cucumber and no uuid
 *
 * Every link is the real one: the real packer, one tarball identified by path and byte size,
 * a project in a temporary directory that cannot borrow anything from this checkout, and that
 * project's own jest binary running its own .feature and .steps.js files.
 *
 * KNOWN GAP, stated rather than hidden: this installs a tarball, not a published 3.0.0 from
 * the registry, so it cannot catch anything only the real publish introduces (a registry-side
 * version or provenance problem). It does catch the class that matters here -- a packaging
 * defect, and the dependency-path claim the Request exists for.
 *
 * It needs the registry, because installing the tarball resolves this package's own
 * dependencies. That is no new capability: npm ci is already the first verification vector.
 * If it cannot pack, cannot create the project, cannot install, cannot run the consumer suite
 * or cannot read the resulting tree, it prints which step it could not run and exits
 * non-zero. It never exits 0 on an observation it did not make.
 */

import fs from "fs";
import os from "os";
import path from "path";
import { spawnSync } from "child_process";

const FORBIDDEN = ["jest-cucumber", "uuid"];

const repositoryRoot = path.resolve(import.meta.dirname, "..", "..", "..");
const manifest = JSON.parse(
  fs.readFileSync(path.join(repositoryRoot, "package.json"), "utf8"),
);

let workspace = null;

const cleanUp = () => {
  if (workspace) fs.rmSync(workspace, { recursive: true, force: true });
  workspace = null;
};

const cannotObserve = (step, what, why, how) => {
  console.error(`CANNOT OBSERVE the packaged consumer journey: ${step}.`);
  console.error(`  WHAT: ${what}`);
  console.error(`  WHY:  ${why}`);
  console.error(`  HOW:  ${how}`);
  cleanUp();
  process.exit(2);
};

const run = (step, command, argv, options) => {
  const result = spawnSync(command, argv, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    ...options,
  });

  if (result.error) {
    cannotObserve(
      step,
      `${command} could not be run: ${result.error.message}`,
      "the journey cannot be walked at all, so nothing is proved either way",
      `run this where ${command} is on PATH`,
    );
  }

  return result;
};

const packTheRepository = (into) => {
  const packed = run(
    "npm pack",
    "npm",
    ["pack", "--json", `--pack-destination=${into}`],
    { cwd: repositoryRoot },
  );

  if (packed.status !== 0) {
    cannotObserve(
      "npm pack",
      `npm pack exited ${packed.status}`,
      "without a tarball there is nothing for a consumer to install",
      `npm said:\n${(packed.stderr || packed.stdout || "").trim()}`,
    );
  }

  let described;
  try {
    described = JSON.parse(packed.stdout);
  } catch (unreadable) {
    return cannotObserve(
      "npm pack",
      `npm pack did not print JSON: ${unreadable.message}`,
      "the tarball has to be identified exactly, or a later step might install a different one",
      "run `npm pack --json` by hand and look at what it printed",
    );
  }

  const filename =
    Array.isArray(described) && described[0] && described[0].filename;
  const tarball = filename ? path.join(into, path.basename(filename)) : null;

  if (!tarball || !fs.existsSync(tarball)) {
    return cannotObserve(
      "npm pack",
      `npm pack reported ${
        filename || "no filename"
      } but no such file exists in ${into}`,
      "an unidentified tarball cannot be the subject of the rest of the journey",
      "check the npm version supports --pack-destination (npm 7 and above)",
    );
  }

  return tarball;
};

const writeTheConsumerProject = (projectDirectory) => {
  fs.writeFileSync(
    path.join(projectDirectory, "package.json"),
    `${JSON.stringify(
      {
        name: "fusion-packaged-consumer",
        version: "1.0.0",
        private: true,
        jest: { testMatch: ["**/*.steps.js"] },
      },
      null,
      2,
    )}\n`,
  );

  fs.writeFileSync(
    path.join(projectDirectory, "sales.feature"),
    [
      "Feature: A consumer writes a feature and it runs",
      "",
      "  Scenario: A sale is recorded",
      "    Given the shop is open",
      '    When a consumer buys 2 of "Rick Astley t-shirt"',
      "    Then the shop has taken 2 orders",
      "",
    ].join("\n"),
  );

  fs.writeFileSync(
    path.join(projectDirectory, "sales.steps.js"),
    [
      "// Exactly what a consumer writes: require the published name, nothing else.",
      'const { Given, When, Then, Fusion } = require("@g_package/jest-cucumber-fusion");',
      "",
      "let orders = [];",
      "",
      'Given("the shop is open", () => {',
      "  orders = [];",
      "});",
      "",
      'When(/^a consumer buys (\\d+) of "(.+)"$/, (howMany, item) => {',
      "  orders.push({ howMany: Number(howMany), item });",
      "});",
      "",
      "Then(/^the shop has taken (\\d+) orders$/, (expected) => {",
      "  expect(orders).toStrictEqual([",
      '    { howMany: Number(expected), item: "Rick Astley t-shirt" },',
      "  ]);",
      "});",
      "",
      'Fusion("sales.feature");',
      "",
    ].join("\n"),
  );

  // The same steps, written as an ES module: a consumer who imports the package.
  fs.writeFileSync(
    path.join(projectDirectory, "sales.steps.mjs"),
    fs
      .readFileSync(path.join(projectDirectory, "sales.steps.js"), "utf8")
      .replace(
        'const { Given, When, Then, Fusion } = require("@g_package/jest-cucumber-fusion");',
        'import { Given, When, Then, Fusion } from "@g_package/jest-cucumber-fusion";',
      ),
  );

  // A setup script that require()s the package and steps that import it. Under a dual package
  // they reach two copies of Fusion, so the global this setup sets must still reach the steps:
  // the @wip scenario's step is bound by nothing, and only the filter keeps it from being
  // refused.
  fs.writeFileSync(
    path.join(projectDirectory, "setup-global.cjs"),
    [
      'const { setFusionConfiguration } = require("@g_package/jest-cucumber-fusion");',
      'setFusionConfiguration({ tagFilter: "not @wip" });',
      "",
    ].join("\n"),
  );
  fs.writeFileSync(
    path.join(projectDirectory, "mixed.feature"),
    [
      "Feature: A global set by require reaches steps that import",
      "",
      "  Scenario: Selected",
      "    Given the shop is open",
      "",
      "  @wip",
      "  Scenario: Not written yet",
      "    Given a step nobody has written",
      "",
    ].join("\n"),
  );
  fs.writeFileSync(
    path.join(projectDirectory, "mixed.steps.mjs"),
    [
      'import { Given, Fusion } from "@g_package/jest-cucumber-fusion";',
      "",
      'Given("the shop is open", () => {});',
      "",
      'Fusion("mixed.feature");',
      "",
    ].join("\n"),
  );

  const jestConfig = (name, config) =>
    fs.writeFileSync(
      path.join(projectDirectory, name),
      `${JSON.stringify({ rootDir: ".", collectCoverage: false, ...config }, null, 2)}\n`,
    );
  jestConfig("jest.esm.json", { testMatch: ["<rootDir>/sales.steps.mjs"] });
  jestConfig("jest.mixed.json", {
    testMatch: ["<rootDir>/mixed.steps.mjs"],
    setupFiles: ["<rootDir>/setup-global.cjs"],
  });

  // A shared step library written as CommonJS, with a hook, used by a step file written as an
  // ES module: the shape of a project moving its steps to ES modules one file at a time. Its
  // definitions and its hook are registered through the CommonJS copy of Fusion and must be
  // bound by the ES module copy's Fusion() call.
  fs.writeFileSync(
    path.join(projectDirectory, "shared-steps.cjs"),
    [
      'const { Given, Before } = require("@g_package/jest-cucumber-fusion");',
      "",
      "Before(() => {",
      "  globalThis.sharedBeforeRan = true;",
      "});",
      'Given("the shared step runs", () => {});',
      "",
    ].join("\n"),
  );
  fs.writeFileSync(
    path.join(projectDirectory, "library.feature"),
    [
      "Feature: A shared CommonJS step library serves an ES module step file",
      "",
      "  Scenario: Shared steps and hooks are bound",
      "    Given the shared step runs",
      "    Then the shared Before hook ran",
      "",
    ].join("\n"),
  );
  fs.writeFileSync(
    path.join(projectDirectory, "library.steps.mjs"),
    [
      'import "./shared-steps.cjs";',
      'import { Then, Fusion } from "@g_package/jest-cucumber-fusion";',
      "",
      'Then("the shared Before hook ran", () => {',
      "  expect(globalThis.sharedBeforeRan).toBe(true);",
      "});",
      "",
      'Fusion("library.feature");',
      "",
    ].join("\n"),
  );
  jestConfig("jest.library.json", {
    testMatch: ["<rootDir>/library.steps.mjs"],
  });
};

// A second consumer, set up exactly as the README's Getting Started (ES modules) says: "type":
// "module", the README's testMatch, the documented `npm test` script, an ES module setupFiles
// script, a shared step file that exports a function (docs/ReusingStepDefinitions.md), a
// relative import with its extension, and `jest` imported from @jest/globals. The README's
// earlier ES module example named its file .steps.mjs beside a testMatch of **/*.steps.js, so
// following it ran no tests at all (found 2026-10-10). It shares the first consumer's
// node_modules through a link, so it needs no second install.
const writeTheDocumentedEsModuleProject = (
  esModuleDirectory,
  installedFrom,
) => {
  fs.symlinkSync(
    path.join(installedFrom, "node_modules"),
    path.join(esModuleDirectory, "node_modules"),
    "dir",
  );
  fs.writeFileSync(
    path.join(esModuleDirectory, "package.json"),
    `${JSON.stringify(
      {
        name: "fusion-documented-es-module-consumer",
        version: "1.0.0",
        private: true,
        type: "module",
        scripts: {
          test: "node --experimental-vm-modules node_modules/jest/bin/jest.js",
        },
        jest: {
          testMatch: ["**/*.steps.js"],
          setupFiles: ["./jest-fusion-config"],
        },
      },
      null,
      2,
    )}\n`,
  );
  const write = (name, lines) =>
    fs.writeFileSync(path.join(esModuleDirectory, name), lines.join("\n"));

  write("jest-fusion-config.js", [
    'import { setFusionConfiguration } from "@g_package/jest-cucumber-fusion";',
    "",
    'setFusionConfiguration({ tagFilter: "not @wip" });',
    "",
  ]);
  write("rocket.js", [
    "export class Rocket {",
    "  launch() {",
    "    this.isInSpace = true;",
    "  }",
    "}",
    "",
  ]);
  write("reuse-code.js", [
    'import { When, Then } from "@g_package/jest-cucumber-fusion";',
    "",
    "export default function registerRelaunchSteps(fnRocket) {",
    '  When("I relaunch the rocket", () => {',
    "    fnRocket().launch();",
    "  });",
    '  Then("the rocket end up in space again", () => {',
    "    expect(fnRocket().isInSpace).toBe(true);",
    "  });",
    "}",
    "",
  ]);
  write("reuse-definition.feature", [
    "Feature: Rocket reuse",
    "",
    "  Scenario: Reusing a SpaceX rocket",
    "    Given I am Elon Musk and I launched a rocket in space already",
    "    When I relaunch the rocket",
    "    Then the rocket end up in space again",
    "    And the countdown was announced once",
    "",
    "  @wip",
    "  Scenario: Not written yet",
    "    Given a step nobody has written",
    "",
  ]);
  write("reuse-definition.steps.js", [
    'import { jest } from "@jest/globals";',
    'import { Given, And, Fusion } from "@g_package/jest-cucumber-fusion";',
    'import { Rocket } from "./rocket.js";',
    'import registerRelaunchSteps from "./reuse-code.js";',
    "",
    "let rocket;",
    "const announce = jest.fn();",
    "",
    'Given("I am Elon Musk and I launched a rocket in space already", () => {',
    "  rocket = new Rocket();",
    "  announce();",
    "});",
    "",
    'And("the countdown was announced once", () => {',
    "  expect(announce).toHaveBeenCalledTimes(1);",
    "});",
    "",
    "registerRelaunchSteps(() => rocket);",
    "",
    'Fusion("reuse-definition.feature");',
    "",
  ]);
};

// Two TypeScript consumers, set up as the README's "Using TypeScript" says: ts-jest's ES module
// preset with "type": "module" (types checked by `tsc --noEmit`), and ts-jest compiling to
// CommonJS (types checked during the run too). Each step declares the type it receives: a
// capture and a docstring as string, a table as rows. Before 2026-10-10 the CallBack type
// refused those declarations under strict (TS2345). They share the first consumer's
// node_modules, into which the TypeScript tools are installed after the advisory check.
const writeTheTypeScriptProject = (directory, installedFrom, style) => {
  fs.symlinkSync(
    path.join(installedFrom, "node_modules"),
    path.join(directory, "node_modules"),
    "dir",
  );
  const esModule = style === "esm";
  fs.writeFileSync(
    path.join(directory, "package.json"),
    `${JSON.stringify(
      {
        name: `fusion-typescript-${style}-consumer`,
        version: "1.0.0",
        private: true,
        ...(esModule ? { type: "module" } : {}),
        scripts: {
          test: esModule
            ? "node --experimental-vm-modules node_modules/jest/bin/jest.js"
            : "jest",
          typecheck: "tsc --noEmit",
        },
      },
      null,
      2,
    )}\n`,
  );
  fs.writeFileSync(
    path.join(directory, "tsconfig.json"),
    `${JSON.stringify(
      {
        compilerOptions: esModule
          ? {
              target: "ES2022",
              module: "NodeNext",
              moduleResolution: "NodeNext",
              isolatedModules: true,
              strict: true,
              types: ["jest"],
            }
          : // CommonJS, as the README says: with NodeNext ts-jest warns TS151002.
            {
              target: "ES2022",
              module: "CommonJS",
              strict: true,
              types: ["jest"],
            },
      },
      null,
      2,
    )}\n`,
  );
  const jestConfig = {
    preset: esModule ? "ts-jest/presets/default-esm" : "ts-jest",
    testMatch: ["**/*.steps.ts"],
    moduleNameMapper: { "^(\\.{1,2}/.*)\\.js$": "$1" },
  };
  fs.writeFileSync(
    path.join(directory, "jest.config.js"),
    `${esModule ? "export default" : "module.exports ="} ${JSON.stringify(
      jestConfig,
      null,
      2,
    )};\n`,
  );
  const write = (name, lines) =>
    fs.writeFileSync(path.join(directory, name), lines.join("\n"));

  write("rocket.ts", [
    "export class Rocket {",
    "  launched = 0;",
    "  count: number;",
    "",
    "  constructor(count: number) {",
    "    this.count = count;",
    "  }",
    "",
    "  countdown(word: string): void {",
    '    if (word === "ignition") this.launched = this.count;',
    "  }",
    "}",
    "",
  ]);
  write("launch.feature", [
    "Feature: Typed steps",
    "",
    "  Scenario: Launching",
    "    Given I am launching 3 rockets",
    "    When the countdown says",
    '      """',
    "      ignition",
    '      """',
    "    Then the manifest has",
    "      | name   |",
    "      | Falcon |",
    "",
  ]);
  write("launch.steps.ts", [
    'import { Given, When, Then, Fusion } from "@g_package/jest-cucumber-fusion";',
    'import { Rocket } from "./rocket.js";',
    "",
    "let rocket: Rocket;",
    "",
    "Given(/^I am launching (\\d+) rockets$/, (count: string) => {",
    "  rocket = new Rocket(Number(count));",
    "});",
    "",
    'When("the countdown says", (words: string) => {',
    "  rocket.countdown(words.trim());",
    "});",
    "",
    'Then("the manifest has", (rows: Array<Record<string, string>>) => {',
    '  expect(rows).toStrictEqual([{ name: "Falcon" }]);',
    "  expect(rocket.launched).toBe(3);",
    "});",
    "",
    'Fusion("launch.feature");',
    "",
  ]);
};

const treeOf = (projectDirectory) => {
  const listing = run("npm ls", "npm", ["ls", "--all", "--json"], {
    cwd: projectDirectory,
  });

  if (!listing.stdout || listing.stdout.trim() === "") {
    cannotObserve(
      "npm ls in the consumer project",
      "npm printed nothing",
      "an empty answer is not evidence that the consumer tree is clean",
      `npm said:\n${(listing.stderr || "").trim()}`,
    );
  }

  try {
    return JSON.parse(listing.stdout);
  } catch (unreadable) {
    return cannotObserve(
      "npm ls in the consumer project",
      `npm did not print JSON: ${unreadable.message}`,
      "an unparseable listing cannot be searched, so it proves nothing either way",
      "run `npm ls --all --json` in the consumer project by hand",
    );
  }
};

const forbiddenRoutesIn = (tree) => {
  const routes = [];
  const broken = [];

  const walk = (node, trail) => {
    Object.entries(node.dependencies || {}).forEach(([name, child]) => {
      const route = [...trail, `${name}@${child.version || "?"}`];
      if (child.missing || child.invalid) {
        broken.push(
          `${route.join(" > ")} (${child.missing ? "missing" : "invalid"})`,
        );
      }
      if (FORBIDDEN.includes(name)) routes.push(route.join(" > "));
      walk(child, route);
    });
  };

  walk(tree, [`${tree.name || "consumer"}@${tree.version || "1.0.0"}`]);
  return { routes, broken };
};

// --- main ----------------------------------------------------------------------------------

process.on("exit", cleanUp);

workspace = fs.mkdtempSync(path.join(os.tmpdir(), "fusion-packaged-consumer-"));
const tarballDirectory = path.join(workspace, "tarball");
const projectDirectory = path.join(workspace, "project");
fs.mkdirSync(tarballDirectory);
fs.mkdirSync(projectDirectory);

const tarball = packTheRepository(tarballDirectory);
console.log(`packed:  ${tarball} (${fs.statSync(tarball).size} bytes)`);
console.log(`project: ${projectDirectory}`);

writeTheConsumerProject(projectDirectory);

const install = run(
  "npm install",
  "npm",
  ["install", "--no-audit", "--no-fund", tarball],
  {
    cwd: projectDirectory,
  },
);
if (install.status !== 0) {
  cannotObserve(
    "npm install of the tarball",
    `npm install exited ${install.status}`,
    "a consumer who cannot install the package tells us nothing about what the package does",
    `npm said:\n${(install.stderr || install.stdout || "").trim()}`,
  );
}

const installed = path.join(
  projectDirectory,
  "node_modules",
  manifest.name,
  "package.json",
);
if (!fs.existsSync(installed)) {
  cannotObserve(
    "npm install of the tarball",
    `${manifest.name} is not present in the consumer project after install`,
    "there is no installed package to drive, so the journey stops here",
    "check the package name and the tarball contents",
  );
}

const consumerJest = path.join(
  projectDirectory,
  "node_modules",
  ".bin",
  "jest",
);
if (!fs.existsSync(consumerJest)) {
  cannotObserve(
    "the consumer's own jest",
    "the consumer project has no jest binary after installing the tarball",
    "the promise is that installing this package is enough to run a feature file; without a " +
      "runner that promise cannot be observed at all",
    "keep jest a dependency of this package, or state the peer requirement and give the " +
      "consumer project its own jest",
  );
}

const consumerRun = run(
  "the consumer suite",
  consumerJest,
  ["--coverage=false"],
  {
    cwd: projectDirectory,
  },
);

// The same consumer project under Jest's ES module mode, once importing the package and once
// mixing a require()ing setup script with importing steps.
const esModuleRun = (configFile) =>
  run(
    `the consumer suite, ${configFile}`,
    consumerJest,
    ["--config", configFile],
    {
      cwd: projectDirectory,
      env: { ...process.env, NODE_OPTIONS: "--experimental-vm-modules" },
    },
  );
const consumerImportRun = esModuleRun("jest.esm.json");
const consumerMixedRun = esModuleRun("jest.mixed.json");
const consumerLibraryRun = esModuleRun("jest.library.json");

// The documented ES module consumer runs through its own `npm test` script, with NODE_OPTIONS
// removed, so the flag reaches Jest only the way the README says to give it.
const esModuleDirectory = path.join(workspace, "documented-es-module-project");
fs.mkdirSync(esModuleDirectory);
writeTheDocumentedEsModuleProject(esModuleDirectory, projectDirectory);
const documentedEnvironment = { ...process.env };
delete documentedEnvironment.NODE_OPTIONS;
const documentedEsModuleRun = run(
  "the documented ES module consumer",
  "npm",
  ["test", "--silent", "--", "--coverage=false", "--json"],
  { cwd: esModuleDirectory, env: documentedEnvironment },
);
let documentedResults;
try {
  documentedResults = JSON.parse(documentedEsModuleRun.stdout);
} catch {
  documentedResults = null;
}

const { routes, broken } = forbiddenRoutesIn(treeOf(projectDirectory));

// Only now, with the advisory check's tree read, the TypeScript tools join the shared
// node_modules, so that check stays about what Fusion itself brings.
const typeScriptTools = run(
  "npm install of the TypeScript tools",
  "npm",
  [
    "install",
    "--no-audit",
    "--no-fund",
    "ts-jest@29",
    "typescript@6",
    "@types/jest@30",
  ],
  { cwd: projectDirectory },
);
if (typeScriptTools.status !== 0) {
  cannotObserve(
    "npm install of the TypeScript tools",
    `npm install exited ${typeScriptTools.status}`,
    "without ts-jest and typescript the TypeScript consumers cannot be run at all",
    `npm said:\n${(typeScriptTools.stderr || typeScriptTools.stdout || "").trim()}`,
  );
}
const typeScriptRun = (style) => {
  const directory = path.join(workspace, `typescript-${style}-project`);
  fs.mkdirSync(directory);
  writeTheTypeScriptProject(directory, projectDirectory, style);
  const tests = run(
    `the TypeScript ${style} consumer`,
    "npm",
    ["test", "--silent", "--", "--coverage=false", "--json"],
    { cwd: directory, env: documentedEnvironment },
  );
  let passed;
  try {
    passed = JSON.parse(tests.stdout).numPassedTests;
  } catch {
    passed = null;
  }
  const types = run(
    `tsc --noEmit in the TypeScript ${style} consumer`,
    "npm",
    ["run", "--silent", "typecheck"],
    { cwd: directory },
  );
  return { style, tests, passed, types };
};
const typeScriptRuns = [typeScriptRun("esm"), typeScriptRun("cjs")];

if (broken.length > 0) {
  cannotObserve(
    "npm ls in the consumer project",
    `the listing records packages as missing or invalid:\n        ${broken.join(
      "\n        ",
    )}`,
    "a partly installed tree cannot be searched exhaustively, so an absence in it means nothing",
    "install again and re-run",
  );
}

const failures = [];

if (consumerRun.status !== 0) {
  failures.push(
    "WHAT: the consumer's own jest run exited " +
      `${consumerRun.status}, not 0.\n` +
      "    WHY:  a consumer installs this package to run their feature files. An install that\n" +
      "          packs cleanly but cannot run one feature end to end has delivered nothing.\n" +
      "    HOW:  ship every source file the public surface requires inside the tarball, and keep\n" +
      "          every runtime dependency loadable by require under the consumer's jest.\n" +
      "    The consumer run said:\n" +
      `${(consumerRun.stderr || consumerRun.stdout || "").trim()}`,
  );
}

if (consumerImportRun.status !== 0) {
  failures.push(
    "WHAT: the consumer's jest exited " +
      `${consumerImportRun.status}, not 0, for steps that import the package.\n` +
      "    WHY:  the package is dual: `import` resolves to the ES module source in src/. A\n" +
      "          consumer writing ES module steps must get the same Fusion a require()r does.\n" +
      "    HOW:  keep package.json's exports `import` condition pointing at src/index.js and\n" +
      "          ship every module src/index.js imports.\n" +
      "    The consumer run said:\n" +
      `${(consumerImportRun.stderr || consumerImportRun.stdout || "").trim()}`,
  );
}

if (consumerLibraryRun.status !== 0) {
  failures.push(
    "WHAT: the consumer's jest exited " +
      `${consumerLibraryRun.status}, not 0, when a shared step library written as CommonJS\n` +
      "          registers steps and a hook that an ES module step file's Fusion() call needs.\n" +
      "    WHY:  the library registers through dist/index.cjs and the step file calls Fusion()\n" +
      "          through src/. A registry each copy owns leaves the step unbound (refused as\n" +
      "          unregistered, though it was registered) and the hook never run.\n" +
      "    HOW:  keep the step and hook registry in the store both copies share\n" +
      "          (src/shared-state.js, on globalThis), as the global configuration is.\n" +
      "    The consumer run said:\n" +
      `${(consumerLibraryRun.stderr || consumerLibraryRun.stdout || "").trim()}`,
  );
}

if (consumerMixedRun.status !== 0) {
  failures.push(
    "WHAT: the consumer's jest exited " +
      `${consumerMixedRun.status}, not 0, when a setup script require()s the package and the\n` +
      "          steps import it.\n" +
      "    WHY:  those are two copies of Fusion (dist/index.cjs and src/), and the global the\n" +
      "          setup script sets has to reach the steps' copy. When it does not, the @wip\n" +
      "          scenario is not filtered out and its unbound step is refused.\n" +
      "    HOW:  keep the global configuration somewhere both copies share (globalThis), not in\n" +
      "          a module-level variable each copy owns.\n" +
      "    The consumer run said:\n" +
      `${(consumerMixedRun.stderr || consumerMixedRun.stdout || "").trim()}`,
  );
}

// Exit 0 alone would accept a run that found no tests under --passWithNoTests-like settings,
// so the documented consumer must also report its one selected scenario as passed and the
// @wip one as skipped.
const documentedCounts = documentedResults && {
  passed: documentedResults.numPassedTests,
  skipped: documentedResults.numPendingTests,
  failed: documentedResults.numFailedTests,
};
if (
  documentedEsModuleRun.status !== 0 ||
  !documentedCounts ||
  documentedCounts.passed !== 1 ||
  documentedCounts.skipped !== 1 ||
  documentedCounts.failed !== 0
) {
  failures.push(
    "WHAT: the consumer set up as the README's Getting Started (ES modules) says exited " +
      `${documentedEsModuleRun.status} with ${JSON.stringify(documentedCounts)}, not exit 0\n` +
      "          with 1 passed, 1 skipped and 0 failed.\n" +
      "    WHY:  a reader copies that set-up as written. If it finds no tests, loses the setup\n" +
      "          script's global, or cannot import a shared step file, the documentation is wrong.\n" +
      "    HOW:  keep the README section, docs/ReusingStepDefinitions.md and this consumer in\n" +
      "          step; change all three together.\n" +
      "    The consumer run said:\n" +
      `${(documentedEsModuleRun.stderr || documentedEsModuleRun.stdout || "").trim()}`,
  );
}

typeScriptRuns
  .filter(
    ({ tests, passed, types }) =>
      tests.status !== 0 || passed !== 1 || types.status !== 0,
  )
  .forEach(({ style, tests, passed, types }) =>
    failures.push(
      `WHAT: the TypeScript ${style} consumer set up as the README's "Using TypeScript" says\n` +
        `          gave npm test exit ${tests.status} with ${passed} passed, and tsc --noEmit\n` +
        `          exit ${types.status}; expected 0, 1 passed and 0.\n` +
        "    WHY:  a TypeScript reader copies that set-up as written, with steps that declare the\n" +
        "          argument types they receive. A refusal there (TS2345 on a typed capture) or a\n" +
        "          run that finds no tests means the documentation or the types are wrong.\n" +
        "    HOW:  keep src/index.d.ts's CallBack accepting declared string and table arguments\n" +
        "          (test-d/index.test-d.ts), and keep the README section and this consumer in step.\n" +
        "    npm test said:\n" +
        `${(tests.stderr || "").trim().split("\n").slice(-15).join("\n")}\n` +
        "    tsc said:\n" +
        `${(types.stdout || types.stderr || "").trim()}`,
    ),
  );

if (routes.length > 0) {
  failures.push(
    `WHAT: ${routes.length} path(s) to an advisory carrier in the installed consumer tree:\n` +
      `          ${routes.join("\n          ")}\n` +
      "    WHY:  uuid carries GHSA-w5hq-g745-h8pq in runtime scope and jest-cucumber is the only\n" +
      "          route to it. This is the tree a consumer audits, so a clean repository tree with\n" +
      "          a dirty installed tree is still the defect the Request exists to remove.\n" +
      "    HOW:  remove jest-cucumber from this package's dependencies and regenerate\n" +
      "          package-lock.json, then pack again.",
  );
}

if (failures.length > 0) {
  console.error("\nThe packaged consumer journey does not hold.");
  failures.forEach((failure) => console.error(`  - ${failure}\n`));
  process.exit(1);
}

console.log(
  "A fresh project that installs the packed tarball runs a feature file green and reaches no " +
    "advisory carrier.\n" +
    `  consumer suite:   exit 0 (${path.relative(
      projectDirectory,
      consumerJest,
    )}), steps that require() the package\n` +
    "  ES module steps:  exit 0, steps that import it, under Jest's ES module mode\n" +
    "  mixed:            exit 0, a require()ing setup script's global reaches importing steps\n" +
    "  shared library:   exit 0, a CommonJS step library's steps and hook serve an ES module file\n" +
    "  README ES module: exit 0, 1 passed and 1 skipped, set up as the README documents\n" +
    "  TypeScript:       ES module and CommonJS consumers, typed steps: tests and tsc exit 0\n" +
    `  names refused:    ${FORBIDDEN.join(
      ", ",
    )}, absent from the whole installed tree\n` +
    "  temporary project removed.",
);
