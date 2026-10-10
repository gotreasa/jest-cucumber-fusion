// Driven port: the Jest runner.
//
// This is the ONLY module under src/ allowed to name describe, test, beforeEach or afterEach,
// and that is an architectural law rather than a convention (see
// test/specs/arch/dependency-direction.steps.js). It takes a LoadedFeature and the registry
// that feature's definitions were registered in, and from them it owns four things the
// removed intermediary used to own: one describe per feature, the hook wiring, one test per
// scenario, and running the steps of a test in order.

import { findMatchingStep } from "./step-matching.js";
import { unmatchedStepRefusal } from "./code-suggestion.js";
import { nameForScenario } from "./scenario-name.js";

// BIND BEFORE REGISTERING. Every step of every scenario is matched up front, so a refusal
// (an unmatched step, an ambiguous one, an unsupported keyword) leaves Fusion() on the way
// out, synchronously, at collection time. Inside a describe body it would be reported as a
// broken suite instead, and a consumer who wrapped Fusion() in a try/catch would never see
// it (test/specs/features/step-definitions/undefined-step.steps.js drives exactly that).
//
// Binding up front is also what lets ONE refusal name every unbound step of the feature: the
// lookup reports an unbound step rather than throwing on it, so this pass sees all of them.
const boundScenarios = (loadedFeature, featureRegistry) =>
  loadedFeature.scenarios.map((scenario) => {
    const steps = scenario.steps.map((step) => ({
      step,
      bound: findMatchingStep(featureRegistry, step),
    }));

    return {
      scenario,
      // Read by truthiness and carried through untouched: a LoadedFeature staged without it,
      // as a test double's fabricated one is, reads as "not excluded".
      excludedByTagFilter: !!scenario.excludedByTagFilter,
      steps,
      unboundSteps: steps
        .filter((each) => !each.bound.isBound)
        .map((each) => each.step),
    };
  });

// NAME BEFORE REGISTERING, for the same reason as binding. A template may throw on the third
// scenario after naming the first two, and a refusal that arrived mid-describe would leave
// those two registered: a report that looks complete and cannot be compared with the next run.
// Asking for every name first makes it one refusal with nothing registered.
//
// One call per test, and the name is kept. Both registration routes below take it from here,
// so a scenario's name never depends on whether it ran, and nothing re-derives it in a test
// body: an expensive template is paid for once, and an impure one cannot disagree with the
// name its test was registered under.
const namedScenarios = (loadedFeature, scenarios, scenarioNameTemplate) =>
  scenarios.map((scenario) =>
    Object.assign({}, scenario, {
      name: nameForScenario(
        loadedFeature,
        scenario.scenario,
        scenarioNameTemplate,
      ),
    }),
  );

// The failing-step decoration, byte for byte as it has always read: the step's text in double
// quotes, the JSON of the arguments it was called with, then the original message, each on
// its own line with a blank line between. Every consumer failure output, and anything that
// greps it, is this shape.
//
// An Error is decorated IN PLACE and rethrown, as jest-cucumber did: its class, its stack
// frames in the consumer's steps file (Jest's code frame) and properties such as expect's
// matcherResult all survive. A new Error lost every one of them (fresh review of PR #16,
// 2026-10-10, finding B1). The stack's first line repeats the message, so it is rewritten to
// match. Recognised by its tag rather than instanceof, which fails for an error made in another
// realm (Node's own, from inside Jest's test context). Anything that cannot be rewritten (a
// frozen error) is wrapped with the original as its cause; anything else thrown is wrapped.
const isError = (value) =>
  Object.prototype.toString.call(value) === "[object Error]";

const decorationOf = (stepText, stepArguments, originalMessage) =>
  `Failing step: "${stepText}"\n\n` +
  `Step arguments: ${JSON.stringify(stepArguments)}\n\n` +
  `Error: ${originalMessage}`;

const decorateInPlace = (failure, decorated) => {
  const oldHeader = `${failure.name}: ${failure.message}`;
  const { stack } = failure;
  failure.message = decorated;
  if (typeof stack === "string" && stack.startsWith(oldHeader))
    failure.stack = `${failure.name}: ${decorated}${stack.slice(oldHeader.length)}`;
  return failure;
};

const decorate = (stepText, stepArguments, failure) => {
  if (!isError(failure))
    return new Error(
      decorationOf(
        stepText,
        stepArguments,
        failure && failure.message ? failure.message : failure,
      ),
    );
  const decorated = decorationOf(stepText, stepArguments, failure.message);
  try {
    return decorateInPlace(failure, decorated);
  } catch {
    return new Error(decorated, { cause: failure });
  }
};

// One test body: the scenario's steps, in order, each awaited before the next begins. A step
// that throws or whose promise rejects ends the scenario there: running on would report a
// second, invented failure and hide the first.
const runScenario = (scenario) => async () => {
  for (const step of scenario.steps) {
    try {
      await step.bound.stepFn(...step.bound.stepArguments);
    } catch (failure) {
      throw decorate(step.step.stepText, step.bound.stepArguments, failure);
    }
  }
};

// Each hook registered exactly ONCE per feature. The describe below already wraps every test
// of the feature, so one registration runs the hook around each of them; N registrations
// would run every hook N times per test.
const registerHooks = (featureRegistry, beforeEachFn, afterEachFn) => {
  featureRegistry.before.forEach((beforeHook) => beforeEachFn(beforeHook));
  featureRegistry.after.forEach((afterHook) => afterEachFn(afterHook));
};

const registerFeature = (loadedFeature, featureRegistry, options) => {
  const scenarios = boundScenarios(loadedFeature, featureRegistry);

  // THE errors DECISION, taken here because this is the only module from which either outcome
  // is reachable. With the step check on, one refusal names every unbound step of the feature
  // and nothing is registered. With it off, the scenarios holding them become skipped tests,
  // never passing ones, and never absent ones. Validation can be switched off; it is never
  // switched into silence.
  //
  // Only the scenarios the tag filter KEPT are counted. A consumer who excluded a scenario is
  // not asking for its steps to be bound, and excluding a half-written scenario is one of the
  // main reasons to reach for a filter at all.
  const unboundSteps = scenarios
    .filter((scenario) => !scenario.excludedByTagFilter)
    .flatMap((scenario) => scenario.unboundSteps);

  if (unboundSteps.length > 0 && options.errors.stepsMustMatchFeatureFile)
    throw unmatchedStepRefusal(loadedFeature.title, unboundSteps);

  // Every name, before anything is registered. With no template this is each scenario's own
  // title; with one it is what the template answered, and a template that cannot answer
  // refuses here.
  const named = namedScenarios(
    loadedFeature,
    scenarios,
    options.scenarioNameTemplate,
  );

  // A feature with no scenarios registers no describe at all, and therefore no hooks: an
  // empty describe is a reported suite that observes nothing, and hooks inside it would wrap
  // nothing.
  if (named.length === 0) return;

  describe(loadedFeature.title, () => {
    registerHooks(featureRegistry, beforeEach, afterEach);

    named.forEach((scenario) => {
      // ONE skip route, for either reason, and ONE name whichever route is taken. A scenario
      // the filter excluded and a scenario left unwired are both registered as a skipped test
      // under the name they would have carried had they run, and a scenario that is both is
      // registered ONCE: two registrations would put two tests of one name in the report.
      // Everything else runs: switching a check off, or filtering, costs the consumer only the
      // scenarios it actually names.
      if (scenario.excludedByTagFilter || scenario.unboundSteps.length > 0)
        test.skip(scenario.name, () => {});
      else test(scenario.name, runScenario(scenario));
    });
  });
};

export { registerFeature };
