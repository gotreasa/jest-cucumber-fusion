// Which registered definition owns a step, and what that definition is called with.
//
// The step text arriving here is CONCRETE: a Scenario Outline row reaches this module with
// its Examples values already substituted, so an outline step is bound by ordinary matching.
// The heuristic that used to guess whether a definition could own a step whose text still
// held `<placeholders>` is gone with the need for it, and with it went the two defects that
// lived in it.
//
// Every answer is a bound step, an UNBOUND step, or a refusal.
//
// Unbound is a returned result rather than a throw, and that carrier is the whole of what this
// module decides. A throw cannot express "unbound, and tolerated", which is precisely what a
// consumer asks for by switching the step check off, and a throw on the first unbound step
// can never reach the caller that holds the option, nor let it see the other unbound steps.
// So the lookup reports, and the caller holding the options decides.
//
// Ambiguity stays a refusal from here: it is not switchable, because there is no reading of
// two matching definitions under which Fusion could pick one.
const UNBOUND = Object.freeze({ isBound: false });

const findMatchingStep = (featureRegistry, currentStep) => {
  const bucket = currentStep.keyword;
  const stepText = currentStep.stepText;
  const matchingSteps = Object.keys(featureRegistry[bucket]).filter(
    (matcherKey) => {
      return isFunctionForScenario(
        stepText,
        featureRegistry[bucket][matcherKey]
      );
    }
  );
  if (matchingSteps.length === 0) return UNBOUND;

  if (matchingSteps.length > 1) {
    const competingMatchers = matchingSteps
      .map((matcherSource) => `"${matcherSource}"`)
      .join(", ");
    throw new Error(
      `Ambiguous step definition: "${stepText}" matches ${matchingSteps.length} step definitions: ${competingMatchers}`
    );
  }

  // The winning definition is resolved here, where its key was just filtered, and handed over
  // resolved. Passing the registry, the bucket and the key instead would be asking the next
  // function to repeat a lookup this one has already done.
  return boundStepFor(
    featureRegistry[bucket][matchingSteps[0]],
    stepText,
    currentStep.stepArgument
  );
};

const isFunctionForScenario = (stepText, stepDefinition) => {
  if (stepDefinition.stepRegExp)
    return stepText.match(stepDefinition.stepRegExp);

  return stepText === stepDefinition.stepExpression;
};

const boundStepFor = (stepDefinition, stepText, stepArgs) => {
  // A string matcher captures nothing; a regex matcher captures its groups out of the
  // concrete step text. Both may still carry a Gherkin argument.
  const captures = stepDefinition.stepRegExp
    ? (stepDefinition.stepRegExp.exec(stepText) || []).slice(1)
    : [];

  // Forward the step's Gherkin argument on PRESENCE, never on its type. A type test drops
  // half the shapes: Gherkin parses a data table to an array but a docstring to a string,
  // and an empty docstring to "", which a `.length` test would drop too. Absent, the
  // argument is null, so this is the whole distinction that matters.
  const stepArguments =
    stepArgs == null ? captures : captures.concat([stepArgs]);

  return { isBound: true, stepArguments, stepFn: stepDefinition.stepFn };
};

module.exports.findMatchingStep = findMatchingStep;
