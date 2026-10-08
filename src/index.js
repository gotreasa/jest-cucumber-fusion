// The public surface: the step verbs, the hooks, the registry they write into, and Fusion.
//
// Everything Fusion does beyond holding the registry is delegated: the option merge to
// src/configuration.js, the outside world (the feature file, the parser, the caller stack) to
// src/feature-source.js, and the Jest runner to src/test-registration.js. Both ports are
// required by module path and are never exported, so they stay internal.
const {
  mergeFusionOptions,
  setFusionConfiguration,
} = require("./configuration");
const featureSource = require("./feature-source");
const testRegistration = require("./test-registration");

const emptyStepsDefinition = () => ({
  given: {},
  when: {},
  then: {},
  and: {},
  but: {},
  before: [],
  after: [],
});

// Module-level registry. Rebuilt from the empty shape above once a feature has been
// loaded, so a second Fusion() in the same module starts from a clean slate rather
// than inheriting the previous feature's step definitions and hooks.
let stepsDefinition = emptyStepsDefinition();

const addDefinitionFunction = (
  definitionType,
  regexpSentence,
  fnForDefinition
) => {
  if (stepsDefinition[definitionType]) {
    if (regexpSentence.constructor === RegExp) {
      throwIfDuplicateMatcher(definitionType, regexpSentence.source);
      stepsDefinition[definitionType][regexpSentence.source] = {
        stepRegExp: regexpSentence,
        stepExpression: null,
        stepFn: fnForDefinition,
      };
    } else if (typeof regexpSentence === "string") {
      throwIfDuplicateMatcher(definitionType, regexpSentence);
      stepsDefinition[definitionType][regexpSentence] = {
        stepRegExp: null,
        stepExpression: regexpSentence,
        stepFn: fnForDefinition,
      };
    }
  }
};

const throwIfDuplicateMatcher = (definitionType, matcherKey) => {
  if (stepsDefinition[definitionType][matcherKey])
    throw new Error(
      `Duplicate step definition: "${matcherKey}" is already registered for "${definitionType}"`
    );
};

const Given = (regexpSentenceOrChainedObject, fnForDefinition) => {
  return defineAndChain(
    "given",
    regexpSentenceOrChainedObject,
    fnForDefinition
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
      stepObjectOrSentence.stepFnDefinition
    );

    return stepObjectOrSentence;
  }

  addDefinitionFunction(stepType, stepObjectOrSentence, fnForStep);

  return { stepSentence: stepObjectOrSentence, stepFnDefinition: fnForStep };
};

const Before = (fnDefinition) => {
  stepsDefinition.before.push(fnDefinition);
};
const After = (fnDefinition) => {
  stepsDefinition.after.push(fnDefinition);
};

const Fusion = (featureFileToLoad, optionsForThisFeature) => {
  try {
    const absoluteFeatureFilePath =
      featureSource.resolveFeaturePath(featureFileToLoad);
    const effectiveOptions = mergeFusionOptions(optionsForThisFeature);

    const loadedFeature = featureSource.loadFeature(
      absoluteFeatureFilePath,
      effectiveOptions
    );

    // This feature binds the definitions and hooks registered for IT, captured before the
    // registry is reset below, so the binding never depends on registration that came after.
    const registryForThisFeature = stepsDefinition;

    testRegistration.registerFeature(
      loadedFeature,
      registryForThisFeature,
      effectiveOptions
    );
  } finally {
    // Unconditional: Fusion() always leaves a clean slate (normal return OR throw). Rebinding
    // the module-level registry (never mutating it in place) keeps the object captured above
    // intact for whoever still holds it, while the next Fusion() starts empty and must
    // re-register.
    stepsDefinition = emptyStepsDefinition();
  }
};

module.exports.Before = Before;
module.exports.After = After;
module.exports.Given = Given;
module.exports.When = When;
module.exports.Then = Then;
module.exports.And = And;
module.exports.But = But;
module.exports.Fusion = Fusion;
// Re-exported, not re-implemented: the module that owns the merge owns the layer the setter
// writes, so the entry point keeps no state of its own.
module.exports.setFusionConfiguration = setFusionConfiguration;
