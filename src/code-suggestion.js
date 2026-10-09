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
// A quoted value never holds a double quote (the detection above stops at one), so the capture
// stops at one too. jest-cucumber's "(.*)" is greedy: it spans several quoted arguments and the
// text between them, so the matcher for `"a" "b"` also matched `"a" "b" 3 "c"` and two pasted
// definitions were refused as ambiguous. And "." matches no line terminator, which a quoted
// value may hold (a lone \r, U+2028 and U+2029 survive Gherkin's \r?\n line split); a negated
// class matches every character but the quote. Found by the review of the PR #16 fixes.
const QUOTED_CAPTURE = '"([^"]*)"';

// One capture for every value an argument position takes across the steps it must bind, so
// one definition binds them all: the integer capture only if every value is an unsigned
// integer.
const captureForNumbers = (numberTexts) =>
  numberTexts.every((numberText) => /^\d+$/.test(numberText))
    ? INTEGER_CAPTURE
    : NUMBER_CAPTURE;

const captureFor = (kind, valueTexts) =>
  kind === "number" ? captureForNumbers(valueTexts) : QUOTED_CAPTURE;

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
// written as \u escapes, which match the same character. A lone \r reaches step text the same
// way and ends a regex or a string literal just as early, so it is written \r in both.
const escapedLineTerminators = (text) =>
  text
    .replace(/\r/g, "\\r")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");

const escapedForRegex = (text) =>
  escapedLineTerminators(text.replace(/[\\^$.*+?()[\]{}|/]/g, "\\$&"));

const escapedForDoubleQuotes = (text) =>
  escapedLineTerminators(text.replace(/[\\"]/g, "\\$&"));

// Every argument the step text carries, as {start, end, kind, value} in text order. One pass
// with indices rather than a sequence of string replacements: a replacement would rewrite the
// first occurrence of the matched text wherever it sat, which is the wrong one as soon as a
// step says the same number twice.
//
// matchAll clones the pattern internally, so a shared lastIndex cannot leak between calls and
// the module-level regex needs no defensive copy of its own.
const argumentsInStepText = (stepText) =>
  [...stepText.matchAll(ARGUMENT_IN_STEP_TEXT)].map((match) => ({
    start: match.index,
    end: match.index + match[0].length,
    kind: match[1] === undefined ? "quoted" : "number",
    value: match[1] === undefined ? match[2] : match[1],
  }));

// A step's SHAPE: its verb and its literal text, with each argument reduced to its kind. Steps
// of one shape are bound by one definition, whatever their values.
const shapeOf = (step) => {
  const argumentsFound = argumentsInStepText(step.stepText);
  const shape = argumentsFound.reduce(
    (built, argument) => ({
      text:
        built.text +
        step.stepText.slice(built.consumedTo, argument.start) +
        `\u0000${argument.kind}\u0000`,
      consumedTo: argument.end,
    }),
    { text: "", consumedTo: 0 }
  );

  return `${step.keyword}\u0000${
    shape.text + step.stepText.slice(shape.consumedTo)
  }`;
};

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

const matcherFor = (stepText, argumentsFound) =>
  argumentsFound.length > 0
    ? matcherRegexFor(stepText, argumentsFound)
    : `"${escapedForDoubleQuotes(stepText)}"`;

// The starter code for steps of ONE shape: the verb for their keyword, a matcher built from the
// first step's text with each capture wide enough for every step's value at that position, and
// a step function with the parameters they imply and an empty body to fill in. The Gherkin
// argument parameter is named for the first step that carries one.
const starterCodeForShape = (steps) => {
  const valuesByStep = steps.map((step) => argumentsInStepText(step.stepText));
  const argumentsFound = valuesByStep[0].map((argument, position) => ({
    start: argument.start,
    end: argument.end,
    capture: captureFor(
      argument.kind,
      valuesByStep.map((values) => values[position].value)
    ),
  }));
  const stepWithArgument = steps.find((step) => step.stepArgument != null);
  const parameters = parametersFor(
    argumentsFound,
    stepWithArgument ? stepWithArgument.stepArgument : null
  );

  return `${VERB_FOR_BUCKET[steps[0].keyword]}(${matcherFor(
    steps[0].stepText,
    argumentsFound
  )}, (${parameters.join(", ")}) => {});`;
};

const starterCodeFor = (step) => starterCodeForShape([step]);

// The unbound steps of one feature, each named once (a Background step is unbound in every
// scenario), grouped by shape in order of first appearance. Every row of an outline, and any
// two steps that differ only in their values, share a shape. The consumer writes ONE definition
// for them: two definitions would be refused when pasted, as a duplicate when their matchers
// are equal, and as ambiguous when one is wider ("(\d+)" beside a decimal capture both match
// "1"). A step with a table and the same step without one share a shape too; parameters do not
// make two definitions distinct.
const stepsByShape = (unboundSteps) => {
  const groups = new Map();
  const named = new Set();
  unboundSteps.forEach((step) => {
    const identity = `${step.keyword}\u0000${step.stepText}`;
    if (named.has(identity)) return;
    named.add(identity);
    const shape = shapeOf(step);
    if (!groups.has(shape)) groups.set(shape, []);
    groups.get(shape).push(step);
  });
  return [...groups.values()];
};

// The refusal for every unbound step of one feature, numbered, in feature order.
//
// Refusing on the first unbound step instead bills the consumer one full re-run per missing
// definition, and the message would be telling the truth about a fraction of the state.
//
// The phrase "No step definition matches:" followed by the step text in double quotes opens
// every entry and appears nowhere else in the message. That is a designed constraint, not a
// turn of phrase: it is what the existing undefined-step guard and two seam regressions match
// on, and what lets a reader count the entries. One entry is one definition to write; the
// other steps it binds follow on lines of their own, so every unbound step is still named, and
// the header counts steps, not entries.
const unmatchedStepRefusal = (featureTitle, unboundSteps) => {
  const shapes = stepsByShape(unboundSteps);
  const stepCount = shapes.reduce((count, steps) => count + steps.length, 0);
  const entries = shapes.map(
    (steps, index) =>
      `  ${index + 1}. No step definition matches: "${steps[0].stepText}"\n` +
      steps
        .slice(1)
        .map((step) => `     nor: "${step.stepText}"\n`)
        .join("") +
      `     ${starterCodeForShape(steps)}`
  );

  return new Error(
    `Fusion found ${stepCount} step${
      stepCount === 1 ? "" : "s"
    } in the feature "${featureTitle}" that no registered step definition matches.\n\n` +
      `WHY:  Fusion runs each step through the definition registered for that step's own\n` +
      `      Gherkin keyword, so a step with no definition has nothing to run and the\n` +
      `      scenario holding it cannot be reported honestly.\n` +
      `HOW:  register a definition for each entry below. The starter code under each one is\n` +
      `      the verb, the matcher and the parameters its steps need, and one definition\n` +
      `      binds every step its entry names. Or pass\n` +
      `      errors: { stepsMustMatchFeatureFile: false } to have the scenarios holding them\n` +
      `      reported as skipped tests instead.\n\n` +
      `${entries.join("\n\n")}\n`
  );
};

module.exports.starterCodeFor = starterCodeFor;
module.exports.unmatchedStepRefusal = unmatchedStepRefusal;
