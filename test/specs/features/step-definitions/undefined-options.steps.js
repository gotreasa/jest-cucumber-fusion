// An option whose value is `undefined` counts as not set, at every layer and inside `errors`.
//
// Forwarding an environment variable is the natural way to write a per-call option, and an
// unset variable is `undefined`: `Fusion(feature, { tagFilter: process.env.TAGS })`. A key-wise
// Object.assign copied that `undefined` over the global setFusionConfiguration value, so the
// global filter silently vanished, and `errors: { stepsMustMatchFeatureFile: undefined }`
// silently switched the check off. Found by the PR #16 adversarial review (F4), 2026-10-09.
import fs from "fs";
import os from "os";
import path from "path";

import {
  Given,
  Fusion,
  setFusionConfiguration,
} from "../../../../src/index.js";
import { mergeFusionOptions } from "../../../../src/configuration.js";

const featureDir = fs.mkdtempSync(path.join(os.tmpdir(), "fusion-undefined-"));
const feature = path.join(featureDir, "undefined-options.feature");
fs.writeFileSync(
  feature,
  "Feature: Undefined options\n" +
    "  Scenario: Opening\n" +
    "    Given the shop is open\n\n" +
    "  @wip\n" +
    "  Scenario: Not written yet\n" +
    "    Given a step nobody wrote\n",
);
afterAll(() => fs.rmSync(featureDir, { recursive: true, force: true }));

const UNSET = undefined;

const firstLineOfRefusal = (options) => {
  Given("the shop is open", () => {});
  try {
    Fusion(feature, options);
  } catch (refusal) {
    return String(refusal.message).split("\n")[0];
  }
  return null;
};

// Collected at module load, where Fusion registers.
setFusionConfiguration({ tagFilter: "not @wip" });
const withUnsetTagFilter = firstLineOfRefusal({ tagFilter: UNSET });
// null is a value, not an absence: it CLEARS the global for this call, so the @wip scenario is
// selected again and its unbound step is refused.
const withClearedTagFilter = firstLineOfRefusal({ tagFilter: null });
const template = () => "templated";
setFusionConfiguration({ scenarioNameTemplate: template });
const mergedWithUnsetTemplate = mergeFusionOptions({
  scenarioNameTemplate: UNSET,
});
setFusionConfiguration({});
const withUnsetValidationKey = firstLineOfRefusal({
  errors: { stepsMustMatchFeatureFile: UNSET },
});

describe("an option set to undefined", () => {
  test("a per-call tagFilter of undefined keeps the global filter", () => {
    expect(withUnsetTagFilter).toBeNull();
  });

  test("a per-call scenarioNameTemplate of undefined keeps the global template", () => {
    expect(mergedWithUnsetTemplate.scenarioNameTemplate).toBe(template);
  });

  test("a validation key of undefined leaves that validation on", () => {
    expect(withUnsetValidationKey).toMatch(/^Fusion found 1 step/);
  });

  test("a per-call tagFilter of null clears the global filter for that call", () => {
    expect(withClearedTagFilter).toMatch(/^Fusion found 1 step/);
  });
});
