// A regular expression matcher with the global (g) or sticky (y) flag keeps a `lastIndex`
// between uses. Testing the step and then reading its captures each moved it, so a sticky
// matcher bound its step and handed the step function `undefined` instead of its captures, on
// every use. 2.0.0 failed the second use loudly; 3.0.0 passed silently with the wrong value.
// Found by fuzzing PR #16 (finding F5), 2026-10-09.
const fs = require("fs");
const os = require("os");
const path = require("path");

const { Given, Fusion } = require("../../../../src");

const featureDir = fs.mkdtempSync(path.join(os.tmpdir(), "fusion-flags-"));
const feature = path.join(featureDir, "regex-flags.feature");
fs.writeFileSync(
  feature,
  "Feature: Regex flags\n" +
    "  Scenario: Twice in one scenario\n" +
    "    Given sticky 7\n" +
    "    Given sticky 8\n" +
    "    Given global 9\n" +
    "    Given global 10\n\n" +
    "  Scenario Outline: Row <n>\n" +
    "    Given sticky <n>\n" +
    "    Given global <n>\n\n" +
    "    Examples:\n" +
    "      | n |\n" +
    "      | 1 |\n" +
    "      | 2 |\n"
);
afterAll(() => fs.rmSync(featureDir, { recursive: true, force: true }));

const received = [];
const sticky = /sticky (\d+)/y;
const global = /global (\d+)/g;
Given(sticky, (n) => received.push(["sticky", n]));
Given(global, (n) => received.push(["global", n]));
Fusion(feature);

// The consumer owns these RegExp objects, so Fusion leaves no trace on them: a lastIndex left
// advanced would shift the next match wherever else the consumer uses one (found by the review
// of the PR #16 fixes).
afterAll(() => {
  expect([sticky.lastIndex, global.lastIndex]).toEqual([0, 0]);
});

afterAll(() => {
  // Every step ran with its own capture, in feature order: plain scenarios, then outline rows.
  expect(received).toEqual([
    ["sticky", "7"],
    ["sticky", "8"],
    ["global", "9"],
    ["global", "10"],
    ["sticky", "1"],
    ["global", "1"],
    ["sticky", "2"],
    ["global", "2"],
  ]);
});
