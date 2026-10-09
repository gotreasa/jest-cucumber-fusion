// The CommonJS build's exports are plain, writable values, as 2.0.0's were.
//
// esbuild exposes a bundle's exports as getters on a non-configurable object, so
// `jest.spyOn(require("@g_package/jest-cucumber-fusion"), "Fusion")` failed with
// `Cannot redefine property: Fusion`, where 2.0.0 passed: a consumer who spied on or patched an
// export broke. Found by the PR #16 review round 4 (F3), 2026-10-10.
//
// dist/index.cjs is built by `npm test` (the pretest script) before this runs.
import path from "path";
import { createRequire } from "module";
import { jest } from "@jest/globals";

const repositoryRoot = path.resolve(import.meta.dirname, "../../..");
// A real require of the bundle, the way a consumer's CommonJS steps file loads it.
const exportsOfTheBundle = () =>
  createRequire(import.meta.url)(
    path.join(repositoryRoot, "dist", "index.cjs"),
  );

test("every export of the CommonJS build is a plain writable value", () => {
  const fusion = exportsOfTheBundle();
  const notPlain = Object.keys(fusion).filter((name) => {
    const descriptor = Object.getOwnPropertyDescriptor(fusion, name);
    return !(
      "value" in descriptor &&
      descriptor.writable &&
      descriptor.configurable
    );
  });
  expect(Object.keys(fusion).length).toBe(9);
  expect(notPlain).toEqual([]);
});

test("jest.spyOn works on an export of the CommonJS build", () => {
  const fusion = exportsOfTheBundle();
  const spy = jest.spyOn(fusion, "setFusionConfiguration");
  spy.mockImplementation(() => {});
  fusion.setFusionConfiguration({ tagFilter: "@smoke" });
  expect(spy).toHaveBeenCalledWith({ tagFilter: "@smoke" });
  spy.mockRestore();
});
