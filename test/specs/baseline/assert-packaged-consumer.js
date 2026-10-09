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

const { routes, broken } = forbiddenRoutesIn(treeOf(projectDirectory));

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
    `  names refused:    ${FORBIDDEN.join(
      ", ",
    )}, absent from the whole installed tree\n` +
    "  temporary project removed.",
);
