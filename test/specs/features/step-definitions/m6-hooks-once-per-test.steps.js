/**
 * M6 regression: hooks must run once per test, not once per scenario block.
 *
 * The wrapper used to register beforeEach/afterEach inside its per-scenario loop, while
 * jest-cucumber wraps the whole feature in ONE describe. Each registration applied to
 * every test, so a feature with N scenario blocks ran every hook N times per test. A
 * resetting hook hides that; these count, so they cannot.
 *
 * Real jest-cucumber, no fakes. Two features in this file:
 * - mixed: 3 scenarios + a 2-row outline = 4 blocks, 5 tests;
 * - outline-only: no plain scenario at all, 3 rows. Its hooks must still be wired.
 * Each Fusion() starts from an empty registry (M3), so the second feature registers its
 * own hooks, and neither feature may run the other's.
 */
import { Given, Before, After, Fusion } from "../../../../src/index.js";

// The hooks that close one test, in registration order.
const closingHooks = ["after:first", "after:second"];

// --- mixed feature ---------------------------------------------------------------
const mixedLog = [];
let mixedTestsStarted = 0;

Before(() => {
  mixedLog.push("before:first");
});
Before(() => {
  mixedLog.push("before:second");
});
After(() => {
  mixedLog.push("after:first");
});
After(() => {
  mixedLog.push("after:second");
});

Given(/^the hooks have run once for this test$/, () => {
  mixedTestsStarted += 1;

  // Every earlier test contributed exactly its two Before and two After hooks, in
  // order; this one has only run its two Before hooks so far, once each.
  const earlierTests = Array.from({ length: mixedTestsStarted - 1 }, () => [
    "before:first",
    "before:second",
    ...closingHooks,
  ]).flat();
  expect(mixedLog).toEqual([...earlierTests, "before:first", "before:second"]);
});

Fusion("../m6-hooks-once-per-test.feature");

// --- outline-only feature --------------------------------------------------------
const outlineOnlyLog = [];
let outlineOnlyRowsStarted = 0;

Before(() => {
  outlineOnlyLog.push("before");
});
After(() => {
  outlineOnlyLog.push("after");
});

Given(/^the outline-only hooks have run once for this row$/, () => {
  outlineOnlyRowsStarted += 1;

  const earlierRows = Array.from({ length: outlineOnlyRowsStarted - 1 }, () => [
    "before",
    "after",
  ]).flat();
  expect(outlineOnlyLog).toEqual([...earlierRows, "before"]);
});

Fusion("../m6-hooks-outline-only.feature");

afterAll(() => {
  // The LAST test of each feature is closed only here: its After hooks ran exactly
  // once, in order. Counted against the tests that actually ran, so filtering with
  // `jest -t` does not fail it falsely.
  expect(mixedTestsStarted + outlineOnlyRowsStarted).toBeGreaterThan(0);
  if (mixedTestsStarted > 0) expect(mixedLog.slice(-2)).toEqual(closingHooks);
  expect(mixedLog.filter((entry) => entry === "after:first")).toHaveLength(
    mixedTestsStarted,
  );
  expect(outlineOnlyLog.filter((entry) => entry === "after")).toHaveLength(
    outlineOnlyRowsStarted,
  );
  // Neither feature ran the other's hooks.
  expect(mixedLog.every((entry) => entry.includes(":"))).toBe(true);
  expect(outlineOnlyLog.every((entry) => !entry.includes(":"))).toBe(true);
});
