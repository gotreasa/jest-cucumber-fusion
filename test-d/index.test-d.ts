/// <reference path="./index.test-d.cts" />
import { expect } from "tstyche";
import {
  Given,
  When,
  Then,
  And,
  But,
  Before,
  After,
  Fusion,
  setFusionConfiguration,
  StepChain,
  StepArgument,
} from "@g_package/jest-cucumber-fusion";

// Normal two-argument form still type-checks and returns a chain.
expect(Given("I am set up", () => {})).type.toBe<StepChain>();
expect(When(/^I act$/, () => {})).type.toBe<StepChain>();

// The chain's shape, spelled out. The assertions above compare against the StepChain the
// package exports, so they hold whatever that interface says; this one fails if it changes.
expect(Given("I am set up", () => {})).type.toBe<{
  stepSentence: string | RegExp;
  stepFnDefinition: (
    ...args: ReadonlyArray<string | Array<Record<string, string>>>
  ) => void | Promise<void>;
}>();

// Chained single-argument form: And(...) returns a chain (the H2 fix).
expect(
  And(/^the mission was said to be '(.*)'$/, () => {}),
).type.toBe<StepChain>();

// Passing a chain straight into another step verb type-checks and returns a
// chain. This is the exact H2 reproduction from
// test/specs/features/step-definitions/reuse-definition.steps.js:16-20 —
// it would NOT compile under the old `void` return typing.
expect(Then(And(/^x$/, () => {}))).type.toBe<StepChain>();
expect(But(When("a chained step", () => {}))).type.toBe<StepChain>();

// Genuine misuse: a bare number matches neither the (name, callback) form nor
// the single StepChain form. Each refusal names its diagnostic code, so an unrelated error
// (a missing export, say) cannot satisfy it.
expect(And(42)).type.toRaiseError(2345);

// A step may declare the arguments it receives: each capture and a docstring
// arrive as a string, a data table as an array of row records. Under strict
// function types these were refused (TS2345) until 2026-10-10, because the
// callback type promised every argument could be either.
expect(
  Given(/^I launch (\d+) rockets$/, (count: string) => {}),
).type.toBe<StepChain>();
expect(
  When(/^(\w+) pays (\w+)$/, (payer: string, payee: string) => {}),
).type.toBe<StepChain>();
expect(
  Then("the rows are", (table: Array<Record<string, string>>) => {}),
).type.toBe<StepChain>();
expect(
  Given("an async step", async (text: string) => {}),
).type.toBe<StepChain>();

// An argument left undeclared is still either kind, so using it as a string
// needs a check first. The package exports that union as StepArgument.
Given(/^(.*)$/, (value) => {
  expect(value).type.toBe<string | Array<Record<string, string>>>();
  expect(value).type.toBe<StepArgument>();
});

// A type Fusion never passes is still refused.
expect(Given(/^(\d+)$/, (count: number) => {})).type.toRaiseError(2345);

// Hooks take a callback with no arguments, synchronous or not.
expect(Before(() => {})).type.toBe<void>();
expect(After(async () => {})).type.toBe<void>();
expect(Before((count: number) => {})).type.toRaiseError(2345);

// null is a value, not "unset": it clears a global tagFilter for one call, as the
// configuration page documents, so strict TypeScript accepts it in both places.
expect(Fusion("launch.feature", { tagFilter: null })).type.toBe<void>();
expect(setFusionConfiguration({ tagFilter: null })).type.toBe<void>();
expect(Fusion("launch.feature", { tagFilter: 42 })).type.toRaiseError(2322);

// errors is a boolean, or an object naming any of its three checks.
expect(Fusion("launch.feature", { errors: false })).type.toBe<void>();
expect(
  Fusion("launch.feature", {
    errors: {
      stepsMustMatchFeatureFile: false,
      scenariosMustMatchFeatureFile: true,
      allowScenariosNotInFeatureFile: false,
    },
  }),
).type.toBe<void>();
expect(Fusion("launch.feature", { errors: "strict" })).type.toRaiseError(2322);
expect(
  Fusion("launch.feature", { errors: { stepsMustMatch: false } }),
).type.toRaiseError(2353);

expect(Fusion("launch.feature", { loadRelativePath: true })).type.toBe<void>();
expect(Fusion("launch.feature", { loadRelativePath: "yes" })).type.toRaiseError(
  2322,
);

// scenarioNameTemplate is handed the four documented variables and must return a string.
expect(
  Fusion("launch.feature", {
    scenarioNameTemplate: (vars) => {
      expect(vars).type.toBe<{
        featureTitle: string;
        scenarioTitle: string;
        scenarioTags: string[];
        featureTags: string[];
      }>();
      return `${vars.featureTitle}: ${vars.scenarioTitle}`;
    },
  }),
).type.toBe<void>();
expect(
  Fusion("launch.feature", { scenarioNameTemplate: () => 42 }),
).type.toRaiseError(2322);
