/**
 * Regression test — M4: brittle callsites()[1].
 * RCA: docs/feature/review-hardening/discuss/rca.md (M4, MED).
 *
 * Caller resolution hard-coded `callsites.default()[1].getFileName()` — it assumed the step
 * file is EXACTLY one stack frame above Fusion, and that frame [1] always exists. Two
 * sub-contracts:
 *   (a) resolve the feature path from the first stack frame OUTSIDE this package, so an
 *       in-package re-export/wrapper frame does not retarget the path;
 *   (b) guard a missing frame — a shallow stack must not make `.getFileName()` throw a
 *       TypeError (the `|| ""` guards AFTER the throw, so it guards the wrong thing).
 *
 * MECHANISM: `callsites` is an external stack-introspection port, and reading the feature file
 * is the other half of the driven port src/feature-source.js. Faking callsites lets us present
 * a controlled stack through Fusion's public surface. src/feature-source.js is doubled on its
 * LOADING half only — `resolveFeaturePath` stays the real one, so the resolution under test is
 * the production code running against the faked stack, while the doubled `loadFeature`
 * captures the absolute path it was handed. No src internals are stubbed.
 *
 * CURRENT STATUS: GREEN (guard) — authored RED against
 *   (a) frame [1] is the in-package wrapper, so the path resolves relative to src/, not the caller;
 *   (b) frame [1] is undefined, so `.getFileName()` throws a TypeError.
 *
 * MODELING NOTE (see report): (a) models "inside the package" as a frame whose filename is the
 * package entry (src/index.js) — the natural `!== __filename` / `startsWith(packageDir)` fix.
 * The resolution now lives in src/feature-source.js and excludes every frame inside src/, so
 * both the entry frame and the port's own frame are transparent.
 */

const path = require("path");

const mockState = { feature: null, loadedPath: null, frames: [] };

jest.mock("callsites", () => ({
  default: jest.fn(() => mockState.frames),
}));
jest.mock("../../../../src/feature-source", () => {
  const realFeatureSource = jest.requireActual(
    "../../../../src/feature-source"
  );

  return {
    // The subject: the real caller resolution, running against the faked stack above.
    resolveFeaturePath: realFeatureSource.resolveFeaturePath,
    loadFeature: jest.fn((absolutePath) => {
      // The real port is handed an ABSOLUTE path and refuses anything it cannot read; a double
      // that accepted a relative path would hide a resolution defect rather than reveal one.
      expect(require("path").isAbsolute(absolutePath)).toBe(true);

      mockState.loadedPath = absolutePath;
      return mockState.feature;
    }),
  };
});

const { Fusion } = require("../../../../src");
// The real, absolute path of the package entry — used as the "inside the package" frame filename.
const packageEntryFile = require.resolve("../../../../src");

const frame = (fileName) => ({ getFileName: () => fileName });

beforeEach(() => {
  mockState.feature = { title: "x", scenarios: [] };
  mockState.loadedPath = null;
});

describe("M4 — robust caller resolution", () => {
  test("(a) an in-package wrapper frame is transparent — the feature path resolves relative to the first caller outside the package", () => {
    const userCaller =
      "/virtual/user-project/step-definitions/checkout.steps.js";
    mockState.frames = [
      frame(packageEntryFile), // [0] Fusion's own frame — inside the package
      frame(packageEntryFile), // [1] a package-internal re-export/wrapper — inside the package
      frame(userCaller), // first frame OUTSIDE the package — the real caller
    ];

    Fusion("sample.feature");

    expect(mockState.loadedPath).toBe(
      path.resolve("/virtual/user-project/step-definitions", "sample.feature")
    );
  });

  test("(b) a shallow stack with no caller frame beyond Fusion does not throw a TypeError", () => {
    // Only Fusion's own frame is present; frame [1] is undefined.
    mockState.frames = [frame(packageEntryFile)];

    expect(() => Fusion("sample.feature")).not.toThrow();
  });
});
