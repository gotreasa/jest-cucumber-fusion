// The type tests (npm run test-d) check the published declarations twice: test-d/index.test-d.ts
// as an ES module consumer, and its generated twin test-d/index.test-d.cts as a CommonJS one
// (issue #58). These tests guard the machinery around them, which the type tests cannot see.
import fs from "fs";
import os from "os";
import path from "path";
import { spawnSync } from "child_process";
import ts from "typescript";

const repositoryRoot = path.resolve(import.meta.dirname, "../../..");
const typeTests = path.join(repositoryRoot, "test-d");

// TypeScript's own answer to "which declaration file does this importer get?", under the
// NodeNext resolution tstyche's baseline uses. Asking the resolver, not reading the exports map,
// is what catches a map that points the require condition at the ES module declarations.
// The importer's module format comes from TypeScript too: its extension and the nearest
// package.json "type", as the compiler decides it.
const options = {
  module: ts.ModuleKind.NodeNext,
  moduleResolution: ts.ModuleResolutionKind.NodeNext,
};
const resolveTypesFrom = (importer) => {
  const file = path.join(typeTests, importer);
  return ts.resolveModuleName(
    "@g_package/jest-cucumber-fusion",
    file,
    options,
    ts.sys,
    undefined,
    undefined,
    ts.getImpliedNodeFormatForFile(file, undefined, ts.sys, options),
  ).resolvedModule?.resolvedFileName;
};

test("a CommonJS type test resolves the CommonJS declarations", () => {
  expect(resolveTypesFrom("index.test-d.cts")).toBe(
    path.join(repositoryRoot, "dist", "index.d.cts"),
  );
});

test("an ES module type test resolves the ES module declarations", () => {
  expect(resolveTypesFrom("index.test-d.ts")).toBe(
    path.join(repositoryRoot, "src", "index.d.ts"),
  );
});

// prepack runs the build, so anything the build reads is on the release path. The type tests
// are not: a copy of the checkout with no test-d/ must still build, and the build must not
// write one.
test("the build neither reads nor writes the type tests", () => {
  const copy = fs.mkdtempSync(path.join(os.tmpdir(), "fusion-build-"));
  try {
    for (const entry of ["package.json", "src", "scripts"])
      fs.cpSync(path.join(repositoryRoot, entry), path.join(copy, entry), {
        recursive: true,
      });
    fs.symlinkSync(
      path.join(repositoryRoot, "node_modules"),
      path.join(copy, "node_modules"),
      "dir",
    );

    const run = spawnSync(process.execPath, ["scripts/build-cjs.js"], {
      cwd: copy,
      encoding: "utf8",
    });

    expect(run.stderr).not.toMatch(/ENOENT/);
    expect(run.status).toBe(0);
    expect(fs.existsSync(path.join(copy, "dist", "index.d.cts"))).toBe(true);
    expect(
      fs.existsSync(path.join(copy, "dist", "THIRD_PARTY_LICENSES.txt")),
    ).toBe(true);
    expect(fs.existsSync(path.join(copy, "test-d"))).toBe(false);
  } finally {
    fs.rmSync(copy, { recursive: true, force: true });
  }
});

// The ES module file names its twin in a reference directive, so a run without the twin fails
// with ts(6053) instead of passing half the assertions. The twin must drop that line, since a
// file cannot reference itself (ts(1006)), and must otherwise be the source unchanged.
test("the CommonJS twin is the ES module type test minus its reference to the twin", () => {
  const source = fs.readFileSync(
    path.join(typeTests, "index.test-d.ts"),
    "utf8",
  );
  const twin = fs.readFileSync(
    path.join(typeTests, "index.test-d.cts"),
    "utf8",
  );
  const reference = '/// <reference path="./index.test-d.cts" />\n';

  expect(source.startsWith(reference)).toBe(true);
  expect(twin).not.toContain(reference);
  expect(twin.slice(twin.indexOf("\n") + 1)).toBe(
    source.slice(reference.length),
  );
});
