// The public surface: the step verbs, the hooks, the registry they write into, and Fusion.
//
// Everything Fusion does beyond holding the registry is delegated: the option merge to
// src/configuration.js, the outside world (the feature file, the parser, the caller stack) to
// src/feature-source.js, and the Jest runner to src/test-registration.js. Both ports are
// required by module path and are never exported, so they stay internal.
import { inspect } from "util";
import { mergeFusionOptions, setFusionConfiguration } from "./configuration.js";
import * as featureSource from "./feature-source.js";
import * as testRegistration from "./test-registration.js";
import { shared, replaceShared } from "./shared-state.js";

// Each bucket is keyed by step text or regex source, so it has no prototype: a step whose text
// is `constructor` or `toString` would otherwise find the inherited property and be refused as
// a duplicate on its first registration (fresh fuzz of PR #16, 2026-10-10, B2).
const emptyBucket = () => Object.create(null);
const emptyStepsDefinition = () => ({
  given: emptyBucket(),
  when: emptyBucket(),
  then: emptyBucket(),
  and: emptyBucket(),
  but: emptyBucket(),
  before: [],
  after: [],
});

// The registry the verbs and hooks write into. It lives in src/shared-state.js, not in a module
// variable, so that a step file using one copy of the dual package (import) and a shared step
// library using the other (require) register into the same one. Rebuilt from the empty shape
// above once a feature has been loaded, so a second Fusion() starts from a clean slate rather
// than inheriting the previous feature's step definitions and hooks.
const stepsDefinition = () => shared("steps", emptyStepsDefinition);

const isRegExp = (candidate) =>
  Object.prototype.toString.call(candidate) === "[object RegExp]";

const isStepMatcher = (candidate) =>
  typeof candidate === "string" || isRegExp(candidate);

const verbNamed = (definitionType) =>
  definitionType.charAt(0).toUpperCase() + definitionType.slice(1);

const whatTheMatcherWas = (candidate) =>
  candidate === undefined || candidate === null
    ? String(candidate)
    : `${typeof candidate} ${inspect(candidate)}`;

// Refused at the call, like every other misuse. Until 3.0.0 a matcher of any other type was
// silently ignored, so the scenario failed later as an unbound step, far from the mistake.
const refuseUnsupportedMatcher = (definitionType, candidate) =>
  new Error(
    `Unsupported step matcher: ${verbNamed(
      definitionType,
    )} was given ${whatTheMatcherWas(candidate)}.\n\n` +
      `WHY:  Fusion binds a step definition to the feature's steps by its matcher, and only\n` +
      `      a string or a regular expression can match a step's text. Any other matcher\n` +
      `      binds nothing, and the step would then fail as unbound, far from this call.\n` +
      `HOW:  pass the step's text, ${verbNamed(
        definitionType,
      )}("the shop is open", fn), or a regular\n` +
      `      expression, ${verbNamed(
        definitionType,
      )}(/^(\\d+) items? in the basket$/, fn).`,
  );

// Refused at the call too. Accepted, a definition with no function failed only when its step
// ran, as "step.bound.stepFn is not a function" (fresh fuzz of PR #16, 2026-10-10).
const refuseMissingStepFunction = (
  definitionType,
  matcher,
  fnForDefinition,
) => {
  const call = `${verbNamed(definitionType)}(${
    typeof matcher === "string" ? JSON.stringify(matcher) : String(matcher)
  })`;
  return new Error(
    `Missing step function: ${call} was given ${whatTheMatcherWas(
      fnForDefinition,
    )}.\n\n` +
      `WHY:  the function is what runs when a step matches, so a definition without one\n` +
      `      would fail only when its step ran, far from this call.\n` +
      `HOW:  pass the step's code as the second argument, for example\n` +
      `      ${call.slice(0, -1)}, () => { ... }).`,
  );
};

const addDefinitionFunction = (
  definitionType,
  regexpSentence,
  fnForDefinition,
) => {
  if (!isStepMatcher(regexpSentence))
    throw refuseUnsupportedMatcher(definitionType, regexpSentence);
  if (typeof fnForDefinition !== "function")
    throw refuseMissingStepFunction(
      definitionType,
      regexpSentence,
      fnForDefinition,
    );

  if (stepsDefinition()[definitionType]) {
    if (isRegExp(regexpSentence)) {
      throwIfDuplicateMatcher(definitionType, regexpSentence.source);
      stepsDefinition()[definitionType][regexpSentence.source] = {
        stepRegExp: regexpSentence,
        stepExpression: null,
        stepFn: fnForDefinition,
      };
    } else {
      throwIfDuplicateMatcher(definitionType, regexpSentence);
      stepsDefinition()[definitionType][regexpSentence] = {
        stepRegExp: null,
        stepExpression: regexpSentence,
        stepFn: fnForDefinition,
      };
    }
  }
};

const throwIfDuplicateMatcher = (definitionType, matcherKey) => {
  if (stepsDefinition()[definitionType][matcherKey])
    throw new Error(
      `Duplicate step definition: "${matcherKey}" is already registered for "${definitionType}"`,
    );
};

const Given = (regexpSentenceOrChainedObject, fnForDefinition) => {
  return defineAndChain(
    "given",
    regexpSentenceOrChainedObject,
    fnForDefinition,
  );
};
const When = (regexpSentenceOrChainedObject, fnForDefinition) => {
  return defineAndChain("when", regexpSentenceOrChainedObject, fnForDefinition);
};
const Then = (regexpSentenceOrChainedObject, fnForDefinition) => {
  return defineAndChain("then", regexpSentenceOrChainedObject, fnForDefinition);
};
const And = (regexpSentenceOrChainedObject, fnForDefinition) => {
  return defineAndChain("and", regexpSentenceOrChainedObject, fnForDefinition);
};

const But = (regexpSentenceOrChainedObject, fnForDefinition) => {
  return defineAndChain("but", regexpSentenceOrChainedObject, fnForDefinition);
};

// The chained form: a StepChain handed back by an earlier verb, re-registered under a second
// keyword. A single argument carrying a stepSentence is one of those; a matcher is not, and
// the RegExp clause keeps a regex out even though a regex carries no stepSentence either.
const isChainedStepObject = (candidate, fnForStep) =>
  !fnForStep &&
  candidate instanceof Object &&
  Object.prototype.toString.call(candidate) !== "[object RegExp]" &&
  candidate.stepSentence;

const defineAndChain = (stepType, stepObjectOrSentence, fnForStep) => {
  if (isChainedStepObject(stepObjectOrSentence, fnForStep)) {
    addDefinitionFunction(
      stepType,
      stepObjectOrSentence.stepSentence,
      stepObjectOrSentence.stepFnDefinition,
    );

    return stepObjectOrSentence;
  }

  addDefinitionFunction(stepType, stepObjectOrSentence, fnForStep);

  return { stepSentence: stepObjectOrSentence, stepFnDefinition: fnForStep };
};

const Before = (fnDefinition) => {
  stepsDefinition().before.push(fnDefinition);
};
const After = (fnDefinition) => {
  stepsDefinition().after.push(fnDefinition);
};

// Fusion() with no path, or a non-string one, reached Node's path module and failed with its
// raw `The "paths[1]" argument must be of type string` (fresh fuzz of PR #16, 2026-10-10).
const refuseFeaturePathNotAString = (featureFileToLoad) =>
  new Error(
    `Fusion needs the feature file's path as a string, but was given ${whatTheMatcherWas(
      featureFileToLoad,
    )}.\n\n` +
      `HOW:  pass the feature file's path, relative to this steps file, for example\n` +
      `      Fusion("rocket-launching.feature"). A file: URL needs url.fileURLToPath first.`,
  );

const Fusion = (featureFileToLoad, optionsForThisFeature) => {
  try {
    if (typeof featureFileToLoad !== "string")
      throw refuseFeaturePathNotAString(featureFileToLoad);
    const absoluteFeatureFilePath =
      featureSource.resolveFeaturePath(featureFileToLoad);
    const effectiveOptions = mergeFusionOptions(optionsForThisFeature);

    const loadedFeature = featureSource.loadFeature(
      absoluteFeatureFilePath,
      effectiveOptions,
    );

    // This feature binds the definitions and hooks registered for IT, captured before the
    // registry is reset below, so the binding never depends on registration that came after.
    const registryForThisFeature = stepsDefinition();

    testRegistration.registerFeature(
      loadedFeature,
      registryForThisFeature,
      effectiveOptions,
    );
  } finally {
    // Unconditional: Fusion() always leaves a clean slate (normal return OR throw). Replacing
    // the shared registry (never mutating it in place) keeps the object captured above intact
    // for whoever still holds it, while the next Fusion() starts empty and must re-register.
    replaceShared("steps", emptyStepsDefinition());
  }
};

export { Before };
export { After };
export { Given };
export { When };
export { Then };
export { And };
export { But };
export { Fusion };
// Re-exported, not re-implemented: the module that owns the merge owns the layer the setter
// writes, so the entry point keeps no state of its own.
export { setFusionConfiguration };
