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
