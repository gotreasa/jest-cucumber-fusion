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

const isRuntimeFile = (file) =>
  ["package.json", "README.md", "LICENSE", ...BUILT_FILES].includes(file) ||
  /^src\/[^/]+\.(js|d\.ts)$/.test(file);

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
