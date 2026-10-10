import { expectType, expectError } from "tsd";
import { Given, When, Then, And, But, StepChain } from "..";

// Normal two-argument form still type-checks and returns a chain.
expectType<StepChain>(Given("I am set up", () => {}));
expectType<StepChain>(When(/^I act$/, () => {}));

// Chained single-argument form: And(...) returns a chain (the H2 fix).
expectType<StepChain>(And(/^the mission was said to be '(.*)'$/, () => {}));

// Passing a chain straight into another step verb type-checks and returns a
// chain. This is the exact H2 reproduction from
// test/specs/features/step-definitions/reuse-definition.steps.js:16-20 —
// it would NOT compile under the old `void` return typing.
expectType<StepChain>(Then(And(/^x$/, () => {})));
expectType<StepChain>(But(When("a chained step", () => {})));

// Genuine misuse: a bare number matches neither the (name, callback) form nor
// the single StepChain form.
expectError(And(42));

// A step may declare the arguments it receives: each capture and a docstring
// arrive as a string, a data table as an array of row records. Under strict
// function types these were refused (TS2345) until 2026-10-10, because the
// callback type promised every argument could be either.
expectType<StepChain>(Given(/^I launch (\d+) rockets$/, (count: string) => {}));
expectType<StepChain>(
  When(/^(\w+) pays (\w+)$/, (payer: string, payee: string) => {}),
);
expectType<StepChain>(
  Then("the rows are", (table: Array<Record<string, string>>) => {}),
);
expectType<StepChain>(Given("an async step", async (text: string) => {}));

// An argument left undeclared is still either kind, so using it as a string
// needs a check first.
Given(/^(.*)$/, (value) => {
  expectType<string | Array<Record<string, string>>>(value);
});

// A type Fusion never passes is still refused.
expectError(Given(/^(\d+)$/, (count: number) => {}));
