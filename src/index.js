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

const defineAndChain = (stepType, stepObjectOrSentence, fnForStep) => {
  if (
    !fnForStep &&
    stepObjectOrSentence instanceof Object &&
    Object.prototype.toString.call(stepObjectOrSentence) !==
      "[object RegExp]" &&
    stepObjectOrSentence.stepSentence
  ) {
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

const Fusion = (featureFileToLoad, optionsToPassToJestCucumber) => {
  try {
    const path = require("path");
    const callerSites = require("callsites");
    // Resolve the feature path from the FIRST stack frame outside this package, so
    // an in-package re-export/wrapper frame does not retarget it; guard a shallow
    // stack (no external frame) so we never call getFileName() on undefined.
    const externalFrame = callerSites
      .default()
      .find((currentFrame) => currentFrame.getFileName() !== __filename);
    const callerSiteCaller = externalFrame ? externalFrame.getFileName() : "";
    const dirOfCaller = path.dirname(callerSiteCaller || "");
    const absoluteFeatureFilePath = path.resolve(
      dirOfCaller,
      featureFileToLoad
    );

    const jestCucumber = require("jest-cucumber");
    const feature = jestCucumber.loadFeature(
      absoluteFeatureFilePath,
      optionsToPassToJestCucumber
    );

    // When jest-cucumber's own step-count validation is disabled ({ errors: false }),
    // the wrapper must fail loudly on an unmatched step itself; otherwise stay silent
    // so jest-cucumber's native validation remains the (transparent) source of truth.
    const failOnUnmatchedStep = !!(
      optionsToPassToJestCucumber &&
      optionsToPassToJestCucumber.errors === false
    );

    // This feature binds the definitions and hooks registered for IT — captured before the
    // registry is reset below, so the binding does not depend on when jest-cucumber invokes
    // the callback.
    const registryForThisFeature = stepsDefinition;

    jestCucumber.defineFeature(feature, (testFn) => {
      if (feature.scenarios.length > 0)
        matchJestTestSuiteWithCucumberFeature(
          registryForThisFeature,
          feature.scenarios,
          beforeEach,
          afterEach,
          testFn,
          false,
          failOnUnmatchedStep
        );

      if (feature.scenarioOutlines.length > 0)
        matchJestTestSuiteWithCucumberFeature(
          registryForThisFeature,
          feature.scenarioOutlines,
          beforeEach,
          afterEach,
          testFn,
          true,
          failOnUnmatchedStep
        );
    });
  } finally {
    // Unconditional: Fusion() always leaves a clean slate — normal return OR throw. Rebinding
    // the module-level registry (never mutating it in place) keeps the object captured above
    // intact for the callback, while the next Fusion() starts empty and must re-register.
    stepsDefinition = emptyStepsDefinition();
  }
};

const matchJestTestSuiteWithCucumberFeature = (
  featureRegistry,
  featureScenariosOrOutline,
  beforeEachFn,
  afterEachFn,
  testFn,
  isOutline,
  failOnUnmatchedStep
) => {
  featureScenariosOrOutline.forEach((currentScenarioOrOutline) => {
    featureRegistry.before.forEach((beforeHook) => beforeEachFn(beforeHook));

    matchJestTestWithCucumberScenario(
      featureRegistry,
      currentScenarioOrOutline.title,
      currentScenarioOrOutline.steps,
      testFn,
      isOutline,
      failOnUnmatchedStep
    );

    featureRegistry.after.forEach((afterHook) => afterEachFn(afterHook));
  });
};

const matchJestTestWithCucumberScenario = (
  featureRegistry,
  currentScenarioTitle,
  currentScenarioSteps,
  testFn,
  isOutline,
  failOnUnmatchedStep
) => {
  testFn(currentScenarioTitle, ({ given, when, then, and, but }) => {
    currentScenarioSteps.forEach((currentStep) => {
      matchJestDefinitionWithCucumberStep(
        featureRegistry,
        { given, when, then, and, but },
        currentStep,
        isOutline,
        failOnUnmatchedStep
      );
    });
  });
};

const matchJestDefinitionWithCucumberStep = (
  featureRegistry,
  verbFunction,
  currentStep,
  isOutline,
  failOnUnmatchedStep
) => {
  const foundMatchingStep = findMatchingStep(
    featureRegistry,
    currentStep,
    isOutline
  );
  if (!foundMatchingStep) {
    if (failOnUnmatchedStep)
      throw new Error(`No step definition matches: "${currentStep.stepText}"`);
    return;
  }

  // this will be the "given", "when", "then"...functions
  verbFunction[currentStep.keyword](
    foundMatchingStep.stepExpression,
    foundMatchingStep.stepFn
  );
};

const findMatchingStep = (featureRegistry, currentStep, isOutline) => {
  const scenarioType = currentStep.keyword;
  const scenarioSentence = currentStep.stepText;
  const matchingSteps = Object.keys(featureRegistry[scenarioType]).filter(
    (currentStepDefinitionFunction) => {
      return isFunctionForScenario(
        scenarioSentence,
        featureRegistry[scenarioType][currentStepDefinitionFunction],
        isOutline
      );
    }
  );
  if (matchingSteps.length === 0) return null;

  if (matchingSteps.length > 1) {
    const competingMatchers = matchingSteps
      .map((matcherSource) => `"${matcherSource}"`)
      .join(", ");
    throw new Error(
      `Ambiguous step definition: "${scenarioSentence}" matches ${matchingSteps.length} step definitions: ${competingMatchers}`
    );
  }

  return injectVariable(
    featureRegistry,
    scenarioType,
    scenarioSentence,
    matchingSteps[0],
    currentStep.stepArgument
  );
};

const isFunctionForScenario = (
  scenarioSentence,
  stepDefinitionFunction,
  isOutline
) => {
  if (stepDefinitionFunction.stepRegExp) {
    if (isOutline && /<[\w]*>/.test(scenarioSentence)) {
      return isPotentialStepFunctionForScenario(
        scenarioSentence,
        stepDefinitionFunction.stepRegExp
      );
    } else return scenarioSentence.match(stepDefinitionFunction.stepRegExp);
  }

  return scenarioSentence === stepDefinitionFunction.stepExpression;
};

const isPotentialStepFunctionForScenario = (
  scenarioDefinition,
  regStepFunc
) => {
  //so this one is tricky, to ensure we only find the
  // step definition corresponding to actual steps function in the case of outlined gherkin
  // we have to "disable" the outlining (since it can replace regular expression
  // and then ensure that all "non-outlined" part do respect the regular expression of
  // of the step function
  // FIRST, we clean the string version of the step definition that has outline variable
  const cleanedStepFunc = regStepFunc.source
    .replace(/^\^/, "")
    // .replace( /\\\(/g, '(' )
    // .replace( /\\\)/g, ')')
    // .replace( /\\\^/g, '^')
    // .replace( /\\\$/g, '$')
    .replace(/\$$/, "");
  // .replace( /\([.\\]+[sSdDwWbB*][*?+]?\)|\(\[.*\](?:[+?*]{1}|\{\d\})\)/g, '' )

  let currentScenarioPart;
  let currentStepFuncLeft = cleanedStepFunc;
  let currentScenarioDefLeft = scenarioDefinition;

  //we step through each of the scenario outline variables
  // from there, we will try to detect any regexp present in the
  // step definition, so that we can ensure to find the right match
  while (
    (currentScenarioPart = /<[\w]*>/gi.exec(currentScenarioDefLeft)) != null
  ) {
    let fixedPart = currentScenarioPart.input.substring(
      0,
      currentScenarioPart.index
    );
    let idxCutScenarioPart =
      currentScenarioPart.index + currentScenarioPart[0].length;

    // The character class spans the source of a capturing group. It must include the digits 0-9:
    // spelled `0` alone it cannot span a group whose source holds a digit 1-9, which makes EVERY
    // bounded quantifier — "(\d{4})" — invisible to this detector and therefore unbindable in an
    // outline, while "(\d+)" (no digit in its source) binds. Braces are not the cause; the digits are.
    const regEscapedStepFunc = /\([a-zA-Z0-9!|,:?*+.^=${}><\\\-]+\)/g.exec(
      currentStepFuncLeft
        .replace(/\\\(/g, "(")
        .replace(/\\\)/g, ")")
        .replace(/\\\^/g, "^")
        .replace(/\\\$/g, "$")
    );
    const regStepFuncLeft = /\([a-zA-Z0-9!|,:?*+.^=${}><\\\-]+\)/g.exec(
      currentStepFuncLeft
    );

    if (
      regStepFuncLeft &&
      regEscapedStepFunc.index == currentScenarioPart.index
    ) {
      //if we have a regex inside our step function definition
      // and that regex is at the same position than our Outlined variable
      // we just need to check that the sentence match,
      // so we can "evaluate" the step function and remove the regex in it
      currentStepFuncLeft =
        regEscapedStepFunc.input.substring(0, regEscapedStepFunc.index) +
        currentStepFuncLeft.substring(
          regStepFuncLeft.index + regStepFuncLeft[0].length
        );
    } else if (
      regStepFuncLeft &&
      regStepFuncLeft.index < currentScenarioPart.index
    ) {
      //if we have a regex inside our step function definition
      // but that regex is not at the same position than our outlined variable
      // we need to evaluate the regex against the scenario part
      const strRegexToEvaluate = regStepFuncLeft.input.substring(
        0,
        regStepFuncLeft.index + regStepFuncLeft[0].length
      );
      const regexToEvaluate = new RegExp(strRegexToEvaluate);
      const regIntermediatePart = regexToEvaluate.exec(
        currentScenarioPart.input
      );
      if (regIntermediatePart) {
        fixedPart = regStepFuncLeft.input.substring(
          0,
          regStepFuncLeft.index + regStepFuncLeft[0].length
        );
        idxCutScenarioPart = regIntermediatePart[0].length;
      }
    }

    const partIndex = currentStepFuncLeft.indexOf(fixedPart);
    if (partIndex !== -1) {
      currentStepFuncLeft = currentStepFuncLeft.substring(
        partIndex + fixedPart.length
      );
      currentScenarioDefLeft =
        currentScenarioDefLeft.substring(idxCutScenarioPart);
    } else {
      return false;
    }
  }

  return (
    (currentScenarioDefLeft === "" && currentStepFuncLeft === "") ||
    evaluateStepFuncEndVsScenarioEnd(
      currentStepFuncLeft,
      currentScenarioDefLeft
    )
  );
};

// A leftover fragment holds a CAPTURING group — so it has to be evaluated as a regex, not compared
// as a literal. Escaped parens are stripped first (`\(n\)` is literal text, not a group) and `(?...)`
// is skipped (non-capturing), so this recognises exactly the real groups.
const holdsCapturingGroup = (stepFunctionDef) =>
  /\((?!\?)[^()]*\)/.test(stepFunctionDef.replace(/\\[()]/g, ""));

const evaluateStepFuncEndVsScenarioEnd = (
  stepFunctionDef,
  scenarioDefinition
) => {
  // The leftover is regex SOURCE, so a capturing group in it must be evaluated as a regex. The old
  // test only recognised a group holding one of [sSdDwWbB*], which made the group's SPELLING the
  // discriminator rather than its presence: " lamp is (on|off)" fell through to a literal endsWith
  // (always false — the scenario text reads " lamp is on") and never bound, while the identically
  // shaped " lamp is (on|down)" took the regex branch and bound. Widening is strict: every fragment
  // that already took the regex branch still does.
  if (
    /\(.*(\?\:)?[.\\]*[sSdDwWbB*][*?+]?.*\)|\(\[.*\](?:[+?*]{1}|\{\d\})\)/g.test(
      stepFunctionDef
    ) ||
    holdsCapturingGroup(stepFunctionDef)
  ) {
    return new RegExp(stepFunctionDef).test(scenarioDefinition);
  }

  return stepFunctionDef.endsWith(scenarioDefinition);
};

const injectVariable = (
  featureRegistry,
  scenarioType,
  scenarioSentence,
  stepFunctionDefinition,
  stepArgs
) => {
  const stepObject = featureRegistry[scenarioType][stepFunctionDefinition];

  if (!stepObject.stepRegExp)
    return {
      stepExpression: scenarioSentence,
      // Forward through a rest-param wrapper so the reported arity is 0.
      // jest-cucumber v4.4.0+ treats an arity mismatch (stepFn.length >
      // matched args) as a request for a done() callback and then blocks
      // on a Promise that never resolves. A rest param has length 0 while
      // still passing along whatever args jest-cucumber provides.
      stepFn: (...args) => stepObject.stepFn(...args),
    };

  const exprMatches = stepObject.stepRegExp.exec(scenarioSentence);

  if (!exprMatches || /<.*>/.test(scenarioSentence))
    return {
      stepExpression: stepObject.stepRegExp,
      // See note above: keep arity 0 to avoid jest-cucumber's done-callback
      // heuristic hanging the step (matters for plain scenarios whose text
      // contains "<...>" and for outline template steps).
      stepFn: (...args) => stepObject.stepFn(...args),
    };

  const dynamicMatchThatAreVariables = [];

  exprMatches.forEach((match, groupIndex) => {
    if (groupIndex > 0) dynamicMatchThatAreVariables.push(match);
  });

  if (Array.isArray(stepArgs) && stepArgs.length > 0) {
    dynamicMatchThatAreVariables.push(stepArgs);
  }

  return {
    stepExpression: stepObject.stepRegExp,
    stepFn: () => stepObject.stepFn(...dynamicMatchThatAreVariables),
  };
};

module.exports.Before = Before;
module.exports.After = After;
module.exports.Given = Given;
module.exports.When = When;
module.exports.Then = Then;
module.exports.And = And;
module.exports.But = But;
module.exports.Fusion = Fusion;
