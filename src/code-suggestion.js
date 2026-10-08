// What to tell a consumer whose step binds nothing: the starter code for one step, and the
// one numbered refusal for every unbound step of a feature.
//
// The refusal is the whole value here. "No step definition matches" on its own is the message
// the consumer already had; code they can paste is the message they wanted. So each entry
// carries a verb call in FUSION's own idiom, keyed on that step's recovered keyword, with a
// matcher built from the step's own text and one parameter for every argument the step
// implies.
//
// Pure: no filesystem, no parser, no Jest global. The argument detection, the escaping and the
// parameter naming are carried over from the removed intermediary's code generator
// (code-generation/step-generation.js:19-61); only its output form is not, because it emitted
// a test-callback idiom Fusion has no verb for.

// A number, or a double-quoted substring. The intermediary's pattern had a third alternative
// for an angle-bracket placeholder; it is dead for Fusion, because the step text reaching a
// suggestion is already substituted for its Examples row and no angle brackets survive.
const ARGUMENT_IN_STEP_TEXT = /([-+]?[0-9]*\.?[0-9]+)|"([^"<]+)"/g;

// A plain unsigned integer keeps the familiar (\d+). Any other number the detection above
// accepts (a sign, a decimal point, a leading dot) gets a capture that matches that same shape,
// because (\d+) cannot match "3.14", "-5" or ".5" and the suggested matcher would then fail to
// bind the very step it was suggested for. Inherited from jest-cucumber's generator; found by
// fuzzing on 2026-10-08.
const INTEGER_CAPTURE = "(\\d+)";
const NUMBER_CAPTURE = "([-+]?\\d*\\.?\\d+)";
const QUOTED_CAPTURE = '"(.*)"';

const captureForNumber = (numberText) =>
  /^\d+$/.test(numberText) ? INTEGER_CAPTURE : NUMBER_CAPTURE;

const VERB_FOR_BUCKET = {
  given: "Given",
  when: "When",
  then: "Then",
  and: "And",
  but: "But",
};

// The matcher is emitted as a regex LITERAL, so "/" must be escaped too: unescaped it ends the
// literal early and the suggested code is not valid JavaScript. The same holds for the two
// Unicode line terminators, U+2028 and U+2029: Gherkin splits lines on \r?\n only, so they can
// reach step text, and JavaScript forbids a line terminator inside a regex literal. They are
// written as \u escapes, which match the same character.
const escapedForRegex = (text) =>
  text
    .replace(/[\\^$.*+?()[\]{}|/]/g, "\\$&")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");

const escapedForDoubleQuotes = (text) => text.replace(/[\\"]/g, "\\$&");

// Every argument the step text carries, as {start, end, capture} in text order. One pass with
// indices rather than a sequence of string replacements: a replacement would rewrite the first
// occurrence of the matched text wherever it sat, which is the wrong one as soon as a step
// says the same number twice.
//
// matchAll clones the pattern internally, so a shared lastIndex cannot leak between calls and
// the module-level regex needs no defensive copy of its own.
const argumentsInStepText = (stepText) =>
  [...stepText.matchAll(ARGUMENT_IN_STEP_TEXT)].map((match) => ({
    start: match.index,
    end: match.index + match[0].length,
    capture:
      match[1] === undefined ? QUOTED_CAPTURE : captureForNumber(match[1]),
  }));

// An ANCHORED regex literal over the step's own text, with each detected argument replaced by
// a capture group and everything around it escaped so it matches literally.
const matcherRegexFor = (stepText, argumentsFound) => {
  const pattern = argumentsFound.reduce(
    (built, argument) => ({
      source:
        built.source +
        escapedForRegex(stepText.slice(built.consumedTo, argument.start)) +
        argument.capture,
      consumedTo: argument.end,
    }),
    { source: "", consumedTo: 0 }
  );

  return `/^${
    pattern.source + escapedForRegex(stepText.slice(pattern.consumedTo))
  }$/`;
};

// One parameter per detected argument, then the Gherkin argument LAST if the step carries one,
// named for the shape it actually is. Fusion hands a step its captures and then its Gherkin
// argument, so this order is the order the values arrive in.
//
// The Gherkin argument is read by PRESENCE: an empty docstring is "" and still earns a
// parameter, because the step really does receive it.
const parametersFor = (argumentsFound, stepArgument) => {
  const captures = argumentsFound.map((each, index) => `arg${index}`);

  if (stepArgument == null) return captures;

  return captures.concat([
    typeof stepArgument === "string" ? "docString" : "table",
  ]);
};

// The starter code for one step: the verb for its keyword, a matcher for its text, and a step
// function with the parameters the step implies and an empty body to fill in.
const starterCodeFor = (step) => {
  const argumentsFound = argumentsInStepText(step.stepText);
  const matcher =
    argumentsFound.length > 0
      ? matcherRegexFor(step.stepText, argumentsFound)
      : `"${escapedForDoubleQuotes(step.stepText)}"`;
  const parameters = parametersFor(argumentsFound, step.stepArgument);

  return `${VERB_FOR_BUCKET[step.keyword]}(${matcher}, (${parameters.join(
    ", "
  )}) => {});`;
};

// One step may be unbound in several scenarios of one feature: a Background step is unbound in
// every one of them. The consumer writes ONE definition for it, so it earns one entry, kept
// where it first appears.
const distinctSteps = (unboundSteps) =>
  unboundSteps.filter(
    (step, index) =>
      unboundSteps.findIndex(
        (earlier) =>
          earlier.keyword === step.keyword && earlier.stepText === step.stepText
      ) === index
  );

// The refusal for every unbound step of one feature, numbered, in feature order.
//
// Refusing on the first unbound step instead bills the consumer one full re-run per missing
// definition, and the message would be telling the truth about a fraction of the state.
//
// The phrase "No step definition matches:" followed by the step text in double quotes opens
// every entry and appears nowhere else in the message. That is a designed constraint, not a
// turn of phrase: it is what the existing undefined-step guard and two seam regressions match
// on, and what lets a reader count the entries.
const unmatchedStepRefusal = (featureTitle, unboundSteps) => {
  const steps = distinctSteps(unboundSteps);
  const entries = steps.map(
    (step, index) =>
      `  ${index + 1}. No step definition matches: "${step.stepText}"\n` +
      `     ${starterCodeFor(step)}`
  );

  return new Error(
    `Fusion found ${steps.length} step${
      steps.length === 1 ? "" : "s"
    } in the feature "${featureTitle}" that no registered step definition matches.\n\n` +
      `WHY:  Fusion runs each step through the definition registered for that step's own\n` +
      `      Gherkin keyword, so a step with no definition has nothing to run and the\n` +
      `      scenario holding it cannot be reported honestly.\n` +
      `HOW:  register a definition for each step below. The starter code under each one is\n` +
      `      the verb, the matcher and the parameters that step needs. Or pass\n` +
      `      errors: { stepsMustMatchFeatureFile: false } to have the scenarios holding them\n` +
      `      reported as skipped tests instead.\n\n` +
      `${entries.join("\n\n")}\n`
  );
};

module.exports.starterCodeFor = starterCodeFor;
module.exports.unmatchedStepRefusal = unmatchedStepRefusal;
