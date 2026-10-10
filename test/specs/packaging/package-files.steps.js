// The published package carries only what a consumer runs: the source, its type definitions and
// npm's own always-included files. Without an allow-list npm packs the whole checkout, and the
// published 2.0.0 shipped a 10.4 MB `codecov` binary that CI had downloaded into it, plus the
// test tree (docs/feature/drop-jest-cucumber/plan.md, "Post-delivery probes").
import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";

const repositoryRoot = path.resolve(import.meta.dirname, "../../..");

// Packed once per suite: both tests read the same list.
let packed = null;
const packedFiles = () => packed || (packed = packOnce());

const packOnce = () => {
  const run = spawnSync(
    "npm",
    ["pack", "--dry-run", "--json", "--ignore-scripts"],
    {
      cwd: repositoryRoot,
      encoding: "utf8",
    },
  );
  if (run.status !== 0)
    throw new Error(
      `npm pack --dry-run failed (exit ${run.status}), so the package contents could not be read.\n${run.stderr}`,
    );
  return JSON.parse(run.stdout)[0]
    .files.map((file) => file.path)
    .sort();
};

// The CommonJS entry point and its typings and bundled licences, built by scripts/build-cjs.js
// (npm test builds it first, through the pretest script).
const BUILT_FILES = [
  "dist/THIRD_PARTY_LICENSES.txt",
  "dist/index.cjs",
  "dist/index.d.cts",
];

// The prepare script runs at install time from a directory or a `file:` dependency, so it ships
// (see the prepare test below); nothing else from scripts/ does.
const INSTALL_TIME_FILES = ["scripts/prepare-hooks.js"];

const isRuntimeFile = (file) =>
  [
    "package.json",
    "README.md",
    "LICENSE",
    ...BUILT_FILES,
    ...INSTALL_TIME_FILES,
  ].includes(file) || /^src\/[^/]+\.(js|d\.ts)$/.test(file);

test("the package carries only runtime files", () => {
  const files = packedFiles();
  expect(files.filter((file) => !isRuntimeFile(file))).toEqual([]);
});

test("the package carries the entry point, its types and every source module", () => {
  const files = packedFiles();
  expect(files).toEqual(
    expect.arrayContaining([
      "package.json",
      "src/index.js",
      "src/index.d.ts",
      ...BUILT_FILES,
    ]),
  );
  const sourceModules = fs
    .readdirSync(path.join(repositoryRoot, "src"))
    .map((name) => `src/${name}`);
  expect(files).toEqual(expect.arrayContaining(sourceModules));
});

// npm runs the `prepare` script when the package is installed from a directory or a `file:`
// dependency, so any script file it runs must be in the package. The packed 3.0.0 ran
// scripts/prepare-hooks.js without shipping it, and such an install failed with
// MODULE_NOT_FOUND (fresh fuzz of PR #16, 2026-10-10, finding B4).
test("every file the published prepare script runs is in the package", () => {
  const manifest = JSON.parse(
    fs.readFileSync(path.join(repositoryRoot, "package.json"), "utf8"),
  );
  const prepare = (manifest.scripts && manifest.scripts.prepare) || "";
  const scriptFiles = prepare.match(/[\w./-]+\.(?:c|m)?js\b/g) || [];
  const files = packedFiles();
  expect(scriptFiles.filter((file) => !files.includes(file))).toEqual([]);
});

// The Node versions the package declares are Jest 30's own, because jest is a runtime dependency
// and the CommonJS build runs on all of them. The ES module entry needs more (Node 20.11, for
// the import attributes @cucumber/gherkin 42 uses), which docs/Migrating.md states. Found by the
// PR #16 review round 4 (F2): no engines were declared, and the docs claimed Node 18 for both.
test("the package declares the Node versions its runtime dependency jest supports", () => {
  const manifest = JSON.parse(
    fs.readFileSync(path.join(repositoryRoot, "package.json"), "utf8"),
  );
  const jestManifest = JSON.parse(
    fs.readFileSync(
      path.join(repositoryRoot, "node_modules", "jest", "package.json"),
      "utf8",
    ),
  );
  expect(manifest.engines && manifest.engines.node).toBe(
    jestManifest.engines.node,
  );
});
