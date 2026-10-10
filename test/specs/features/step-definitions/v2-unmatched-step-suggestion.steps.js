/**
 * A consumer whose steps bind nothing is handed the code that would bind them.
 *
 * This file is an ordinary consumer step definition file. It requires the package's public
 * surface, registers ONE definition, and calls Fusion() on a feature whose other six steps
 * deliberately have none. The refusal leaves Fusion synchronously at collection, exactly where
 * it does today, so the file catches it at the top level and asserts on its text from inside
 * ordinary tests -- the same shape test/specs/features/step-definitions/undefined-step.steps.js
 * already uses.
 *
 * WHAT IT PINS, one obligation per observation:
 *   1. ONE refusal names every unbound step in the feature, in feature order, numbered.
 *      Refusing on the first one bills the consumer a full re-run per missing definition.
 *   2. The step that DOES bind is not named. A refusal that lists a bound step is telling the
 *      consumer to write a definition they already have.
 *   3. Each entry opens with the phrase No step definition matches and the step's text in
 *      double quotes. That phrase is a designed constraint: undefined-step.steps.js and two
 *      seam regressions match on it.
 *   4. Nothing is registered. The refusal is not carried by a fabricated failing test, so a
 *      wiring defect never looks like a behavioural one.
 *   5. Each entry carries starter code in FUSION's verb idiom, keyed on that step's own
 *      recovered keyword, so an And step suggests And and not the keyword above it.
 *   6. A step with no detectable argument suggests the verb with its text as a double-quoted
 *      string and a step function with no parameters and an empty body.
 *   7. A step whose text holds a number or a double-quoted substring suggests an anchored
 *      slash-delimited regex with one capture group and one parameter per detected argument --
 *      and that regex, pasted, actually matches the step and captures the argument.
 *   8. A step carrying a data table or a docstring adds a table or a docString parameter,
 *      after any captures.
 *
 * WHAT IT DOES NOT PIN, because the authority does not fix it: the name of a capture's
 * parameter, the inner pattern of a generated capture group, the punctuation of the entry
 * numbering, and the surrounding prose of the refusal. Those are judged by what they DO -- the
 * regex is compiled and run against the step text, the parameter count and the last parameter
 * name are checked -- rather than by their bytes.
 *
 * CURRENT STATUS against the value-1 tree:
 *   RED   — src/step-matching.js:23-24 throws on the FIRST unbound step, so the refusal holds
 *           one entry of six, carries no starter code and is not numbered. Every observation
 *           above except 2 and 4 fails on an assertion, not on a crash.
 *   GREEN — the bound step is not named, and nothing is registered. Both are preservation.
 */

// --- counting what Fusion registers while it refuses ----------------------------------------
// Installed before the package is required and removed the moment the refusal is in hand, so
// the ordinary tests below run under the real Jest globals.
const realJestGlobals = { describe: global.describe, test: global.test };
const registered = { describes: 0, tests: 0 };

const counting = (globalName, countKey) =>
  Object.assign((...whateverThePackagePassed) => {
    registered[countKey] += 1;
    return realJestGlobals[globalName](...whateverThePackagePassed);
  }, realJestGlobals[globalName]);

global.describe = counting("describe", "describes");
global.test = counting("test", "tests");
global.test.skip = counting("test", "tests");

import { Given, Fusion } from "../../../../src/index.js";

// The one definition that does bind, so the refusal has something it must NOT name.
const THE_BOUND_STEP = "the shop is open";
Given(THE_BOUND_STEP, () => {});

// The six steps with no definition, in the order the feature declares them.
const THE_UNBOUND_STEPS = [
  "the shop is closed",
  "3 shirts are in stock",
  'the shopper wants "Rick Astley t-shirt"',
  "the shopper adds 2 of these items:",
  "the shopper leaves this note:",
  "the receipt is printed",
];

let refusal = null;
try {
  Fusion("../v2-unmatched-step-suggestion.feature");
} catch (thrown) {
  refusal = thrown;
}

const registeredWhileRefusing = { ...registered };
global.describe = realJestGlobals.describe;
global.test = realJestGlobals.test;

const refusalText = refusal ? refusal.message : "";

// --- reading the refusal --------------------------------------------------------------------
// The entry opener is looked up by the step text this file already knows, rather than parsed
// out of the message. A step text may itself hold double quotes, so a parser would have to
// guess where one ends; looking up the exact text asserts the whole first line at the same
// time.
const OPENER = 'No step definition matches: "';
const openerFor = (stepText) => `${OPENER}${stepText}"`;

const explain = (what, why, how) =>
  new Error(
    `WHAT: ${what}\nWHY:  ${why}\nHOW:  ${how}\n\nThe refusal read:\n${refusalText}`,
  );

const entryIndexFor = (stepText) => refusalText.indexOf(openerFor(stepText));

// One entry: from its own opener to the next one, or to the end of the message.
const entryFor = (stepText) => {
  const at = entryIndexFor(stepText);
  if (at === -1)
    throw explain(
      `the refusal does not name the unbound step "${stepText}".`,
      "one refusal has to name every unbound step in the feature; a consumer who fixes the " +
        "one step it did name pays another full run to be told about the next.",
      "collect every step that binds nothing while binding the feature, then refuse once " +
        "with all of them.",
    );

  const after = refusalText.slice(at + openerFor(stepText).length);
  const nextOpener = after.indexOf(OPENER);
  return nextOpener === -1 ? after : after.slice(0, nextOpener);
};

const VERB_CALL = /(Given|When|Then|And|But)\(/;

// A snippet in Fusion's verb idiom: Verb(matcher, (params) => { body }). The regex form is
// tried first because a matcher starting with / is never a quoted string.
const REGEX_FORM =
  /^(Given|When|Then|And|But)\(\s*(\/\^[\s\S]*?\$\/[a-z]*)\s*,\s*\(([^)]*)\)\s*=>\s*\{([\s\S]*)$/;
const STRING_FORM =
  /^(Given|When|Then|And|But)\(\s*"((?:[^"\\]|\\.)*)"\s*,\s*\(([^)]*)\)\s*=>\s*\{([\s\S]*)$/;

const parameterNames = (parameterList) =>
  parameterList
    .split(",")
    .map((each) => each.trim())
    .filter((each) => each !== "");

const suggestionFor = (stepText) => {
  const entry = entryFor(stepText);
  const at = entry.search(VERB_CALL);

  if (at === -1)
    throw explain(
      `the entry for "${stepText}" carries no starter code: nothing in it calls one of ` +
        "Fusion's verbs.",
      "the whole value of this refusal is code the consumer can paste. Naming the step and " +
        "leaving them to work out the matcher and the parameters is the message they already " +
        "had.",
      "emit the verb for that step's own keyword, a matcher for its text, and a step " +
        "function with a parameter for each argument the step implies.",
    );

  const snippet = entry.slice(at);
  const asRegex = REGEX_FORM.exec(snippet);
  if (asRegex)
    return {
      verb: asRegex[1],
      matcher: { kind: "regex", literal: asRegex[2] },
      parameters: parameterNames(asRegex[3]),
      body: asRegex[4],
      snippet,
    };

  const asString = STRING_FORM.exec(snippet);
  if (asString)
    return {
      verb: asString[1],
      matcher: { kind: "string", text: asString[2] },
      parameters: parameterNames(asString[3]),
      body: asString[4],
      snippet,
    };

  throw explain(
    `the starter code for "${stepText}" is in neither shape Fusion promises. It reads:\n` +
      `  ${snippet.split("\n").slice(0, 4).join("\n  ")}`,
    "a consumer pastes this. It has to be a verb call whose matcher is either a double-quoted " +
      "string or an ANCHORED slash-delimited regex, followed by a step function.",
    'emit Verb("exact text", () => {}) for a step with no detectable argument, or ' +
      "Verb(/^text with (capture)$/, (arg) => {}) for one that has them.",
  );
};

// The regex literal, compiled, so the suggestion is judged by what it MATCHES rather than by
// how it is spelled.
const asCompiledRegExp = (literal) => {
  const lastSlash = literal.lastIndexOf("/");
  return new RegExp(literal.slice(1, lastSlash), literal.slice(lastSlash + 1));
};

const capturesOf = (suggestion, stepText) => {
  if (suggestion.matcher.kind !== "regex")
    throw explain(
      `the starter code for "${stepText}" matches the step by its exact text, so it captures ` +
        `nothing. It reads:\n  ${suggestion.snippet.split("\n")[0]}`,
      "this step carries an argument in its text, and a consumer who pastes an exact-text " +
        "matcher gets a definition that binds this one sentence and hands over no argument. " +
        "The regex is the whole reason the suggestion is worth pasting.",
      "detect a number or a double-quoted substring in the step text and replace each with a " +
        "capture group in an anchored slash-delimited regex.",
    );

  const matched = asCompiledRegExp(suggestion.matcher.literal).exec(stepText);

  if (!matched)
    throw explain(
      `the suggested matcher ${suggestion.matcher.literal} does not match the step text it ` +
        `was suggested for, "${stepText}".`,
      "starter code that does not bind the step it was offered for is worse than no starter " +
        "code: the consumer pastes it, the step stays unbound, and the refusal now lies.",
      "build the matcher from the step's own text, escaping it and replacing only the " +
        "detected arguments with capture groups.",
    );

  return matched.slice(1);
};

// The marker in front of an entry's opener, on its own line. "numbered" is fixed by the
// contract; its punctuation is not, so any non-alphanumeric decoration around the digit is
// accepted.
const markerBefore = (stepText) => {
  const at = entryIndexFor(stepText);
  return refusalText.slice(refusalText.lastIndexOf("\n", at) + 1, at);
};

// --- the observations -----------------------------------------------------------------------

test("an unbound step refuses at collection without registering anything", () => {
  // WHAT: Fusion threw on the way out, and registered no describe and no test while doing it.
  // WHY:  a step with no definition is a wiring defect, not a behavioural one. Registering a
  //       test whose body throws would report it as a failing scenario, hide it behind -t
  //       filters, and break the three existing guards that catch this throw at collection.
  // HOW:  bind every step of every scenario before registering anything, and raise the
  //       refusal from there.
  expect(refusal).not.toBeNull();
  expect(registeredWhileRefusing).toStrictEqual({ describes: 0, tests: 0 });
});

test("one refusal names every unbound step of the feature, in feature order, and numbers them", () => {
  const named = THE_UNBOUND_STEPS.filter((each) => entryIndexFor(each) !== -1);
  const entryCount = refusalText.split(OPENER).length - 1;

  // WHAT: all six unbound steps named, out of the six the feature declares, with no seventh
  //       entry, each where the feature puts it and each carrying its position.
  // WHY:  refusing on the first unbound step bills a consumer one full dispatch per missing
  //       definition, and the message would be telling the truth about a fraction of the
  //       state. The count is checked against the population so a refusal that grew an extra
  //       entry fails here too.
  // HOW:  collect the unbound steps while binding the feature and refuse once, numbering the
  //       entries in the order the steps appear.
  expect({ named, entryCount }).toStrictEqual({
    named: THE_UNBOUND_STEPS,
    entryCount: THE_UNBOUND_STEPS.length,
  });

  const positions = THE_UNBOUND_STEPS.map(entryIndexFor);
  expect(positions).toStrictEqual([...positions].sort((a, b) => a - b));

  const misnumbered = THE_UNBOUND_STEPS.filter(
    (stepText, index) =>
      !new RegExp(`(^|[^0-9])${index + 1}([^0-9]|$)`).test(
        markerBefore(stepText),
      ),
  );
  expect(misnumbered).toStrictEqual([]);
});

test("the step that does bind is not named", () => {
  // WHAT: the one step with a definition appears nowhere in the refusal.
  // WHY:  a refusal that lists a bound step tells the consumer to write a definition they
  //       already have, and makes the list useless for deciding what is left to do.
  // HOW:  collect only the steps that bound nothing.
  expect(refusalText).not.toContain(openerFor(THE_BOUND_STEP));
  expect(refusalText).not.toContain(`"${THE_BOUND_STEP}"`);
});

test("a step with no detectable argument suggests the verb, its text in quotes and an empty step function", () => {
  const suggestion = suggestionFor("the shop is closed");

  // WHAT: Given("the shop is closed", () => {}) -- the verb for the step's keyword, its exact
  //       text as a double-quoted string, no parameters, and an empty body.
  // WHY:  this is the form the ruling names. A consumer pastes it, fills in the body, and the
  //       step binds. A matcher that is not the exact text, or a parameter the step cannot
  //       supply, means the pasted code does not work first time.
  // HOW:  for a step whose text holds no number and no quoted substring, quote the text as
  //       written.
  expect({
    verb: suggestion.verb,
    matcher: suggestion.matcher,
    parameters: suggestion.parameters,
    bodyIsEmpty: /^\s*\}/.test(suggestion.body),
  }).toStrictEqual({
    verb: "Given",
    matcher: { kind: "string", text: "the shop is closed" },
    parameters: [],
    bodyIsEmpty: true,
  });
});

test("a step whose text holds a number suggests an anchored regex that captures that number", () => {
  const suggestion = suggestionFor("3 shirts are in stock");
  const captures = capturesOf(suggestion, "3 shirts are in stock");

  // WHAT: an anchored slash-delimited regex which, pasted and run against the step, captures
  //       the number -- and exactly one step-function parameter to receive it.
  // WHY:  this is judged by what the matcher DOES, not by how it is spelled: the promise is
  //       code that binds the step and hands the argument over. A suggestion with no capture
  //       group leaves the consumer to find the argument themselves; one with two leaves them
  //       with a parameter nothing fills.
  // HOW:  escape the step text, replace each detected argument with a capture group, anchor
  //       the result, and give the step function one parameter per group.
  expect({
    kind: suggestion.matcher.kind,
    captures,
    parameterCount: suggestion.parameters.length,
  }).toStrictEqual({ kind: "regex", captures: ["3"], parameterCount: 1 });
});

test("a step whose text holds a quoted substring suggests an anchored regex that captures it", () => {
  const stepText = 'the shopper wants "Rick Astley t-shirt"';
  const suggestion = suggestionFor(stepText);
  const captures = capturesOf(suggestion, stepText);

  // WHAT: one capture group that, run against the step, yields the quoted value, and one
  //       parameter to receive it. Whether the quotes fall inside or outside the group is not
  //       pinned -- the authority does not fix it, and both paste and work.
  // WHY:  a quoted substring is the other argument shape a consumer writes. Missing it means
  //       the suggested matcher binds only the one sentence it was generated from.
  // HOW:  detect a double-quoted substring as an argument, exactly as a number is detected.
  expect({
    kind: suggestion.matcher.kind,
    captureCount: captures.length,
    parameterCount: suggestion.parameters.length,
  }).toStrictEqual({ kind: "regex", captureCount: 1, parameterCount: 1 });
  expect(captures[0]).toContain("Rick Astley t-shirt");
});

test("a step carrying a data table adds a table parameter after its captures", () => {
  const stepText = "the shopper adds 2 of these items:";
  const suggestion = suggestionFor(stepText);
  const captures = capturesOf(suggestion, stepText);

  // WHAT: the capture first, then a parameter named table, in that order.
  // WHY:  Fusion hands a step its captures and then its Gherkin argument, so starter code
  //       whose parameters are in the other order compiles and then receives the wrong values
  //       -- the worst kind of wrong, because it looks right.
  // HOW:  append the Gherkin-argument parameter after the captures, named for the shape the
  //       step actually carries.
  expect({
    captures,
    parameters: suggestion.parameters.length,
    last: suggestion.parameters[suggestion.parameters.length - 1],
  }).toStrictEqual({ captures: ["2"], parameters: 2, last: "table" });
});

test("a step carrying a docstring adds a docString parameter", () => {
  const suggestion = suggestionFor("the shopper leaves this note:");

  // WHAT: a single parameter named docString, and no capture group, for a step whose text
  //       holds no argument but which carries a docstring.
  // WHY:  a data table and a docstring reach a step function as different shapes, so starter
  //       code that names them both table would tell the consumer the wrong thing about what
  //       they are about to receive.
  // HOW:  read the step's shaped Gherkin argument by presence and name the parameter for the
  //       shape it is.
  expect({
    matcher: suggestion.matcher,
    parameters: suggestion.parameters,
  }).toStrictEqual({
    matcher: { kind: "string", text: "the shopper leaves this note:" },
    parameters: ["docString"],
  });
});

test("an And step suggests And, not the keyword of the step above it", () => {
  const suggestion = suggestionFor("the receipt is printed");

  // WHAT: the verb is And. The step before it in the feature is a When.
  // WHY:  Fusion's registry is keyed by keyword, so a definition registered under the wrong
  //       verb does not bind the step the suggestion was offered for. A consumer who pastes
  //       it gets the same refusal back, and no reason why.
  // HOW:  key the suggested verb on the step's own recovered keyword bucket, the same bucket
  //       the registry lookup uses.
  expect({
    verb: suggestion.verb,
    matcher: suggestion.matcher,
    parameters: suggestion.parameters,
  }).toStrictEqual({
    verb: "And",
    matcher: { kind: "string", text: "the receipt is printed" },
    parameters: [],
  });
});
