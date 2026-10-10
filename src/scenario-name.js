// What one test is called.
//
// With no scenarioNameTemplate the answer is the scenario's own title and nothing here is
// entered. With a template, this module assembles the four variables the template is declared
// to receive, calls it, and checks that what came back can actually name a test.
//
// The consumer's template is UNTRUSTED: it may throw, and it may answer with anything at all.
// Both are refusals rather than something to paper over, because there is no honest name to
// fall back on: naming one test from the template and the next from the raw title would leave
// a report that looks complete and cannot be compared with the next run.
//
// Pure: no filesystem, no parser, no Jest global. The port calls it; it calls the template.

import { describeValue } from "./value-description.js";

// Kept as the first line of the refusal because the previous engine used it, so anything a
// consumer greps for still matches.
const TEMPLATE_FAILED =
  "An error occurred while executing a scenario name template";

// Tags reach a template lowercased and with their leading at sign, which is what the previous
// engine passed: it built its lists from AST tag names, and a Gherkin AST tag name carries the
// at sign. The value 3 carrier deliberately keeps the original case, so the lowercasing
// happens here, where the variables are assembled.
const asTemplateTags = (tagNames) =>
  (tagNames || []).map((tagName) => String(tagName).toLowerCase());

// The four variables, and only those four: a consumer's existing template was written against
// this shape.
//
// scenarioTitle is the title of THIS test. For an Examples row that is the row's own
// substituted title, which is the whole point of this value: the previous engine called the
// template with the outline's un-substituted title and then registered the row under its own
// name anyway, so the option was silently inert on every row.
//
// scenarioTags is the tag set that reached this scenario with the feature's declared tags
// removed, which reproduces both of the previous engine's lists from the one source this
// package has. Named residue: a tag written on BOTH the feature and a scenario appears only in
// featureTags, where the previous engine would have had it in both.
const templateVariablesFor = (loadedFeature, scenario) => {
  const featureTags = asTemplateTags(loadedFeature.featureTags);
  const tagsThatReachedTheScenario = asTemplateTags(scenario.tags);

  return {
    featureTitle: loadedFeature.title,
    featureTags,
    scenarioTitle: scenario.title,
    scenarioTags: tagsThatReachedTheScenario.filter(
      (tagName) => !featureTags.includes(tagName),
    ),
  };
};

const describeWhatCameBack = (answer) =>
  typeof answer === "string" ? `the empty string` : describeValue(answer);

const refuseUnusableName = (scenarioTitle, what, how) =>
  new Error(
    `${TEMPLATE_FAILED}.\n\n` +
      `WHAT: ${what}\n` +
      `      It was naming the scenario "${scenarioTitle}".\n` +
      `WHY:  every test needs a name before it can be registered, and a template that cannot\n` +
      `      produce one leaves no honest name to fall back on. Naming this test from its raw\n` +
      `      title while its siblings keep their templated names would give a report that\n` +
      `      looks complete and cannot be compared with the next run.\n` +
      `HOW:  ${how}`,
  );

// Calling the untrusted template, and nothing else. Whatever it answers comes back as it is;
// only a throw is turned into the refusal here, because that is the one outcome this function
// cannot hand on.
const answerFromTemplate = (loadedFeature, scenario, scenarioNameTemplate) => {
  try {
    return scenarioNameTemplate(templateVariablesFor(loadedFeature, scenario));
  } catch (templateFailure) {
    // A consumer's template can throw anything, so it is read as anything: its message when it
    // has one, otherwise the value itself.
    const thrown = /** @type {any} */ (templateFailure);
    throw refuseUnusableName(
      scenario.title,
      `the scenarioNameTemplate threw: ${
        thrown && thrown.message ? thrown.message : thrown
      }`,
      "make the template total over the four variables it is handed: featureTitle, " +
        "featureTags, scenarioTitle and scenarioTags. A tag list may be empty, and a title " +
        "may hold any character a feature file allows.",
    );
  }
};

const nameForScenario = (loadedFeature, scenario, scenarioNameTemplate) => {
  if (!scenarioNameTemplate) return scenario.title;

  // Named for what it is. Called anyway, a non-function was reported as a template that threw
  // "scenarioNameTemplate is not a function" (fresh fuzz of PR #16, 2026-10-10).
  if (typeof scenarioNameTemplate !== "function")
    throw refuseUnusableName(
      scenario.title,
      `the scenarioNameTemplate is ${describeValue(scenarioNameTemplate)}, not a function.`,
      "pass a function that takes the template variables and returns the test's name.",
    );

  const answer = answerFromTemplate(
    loadedFeature,
    scenario,
    scenarioNameTemplate,
  );

  // An async template's Promise was described as "object {}", its JSON (fresh fuzz of PR #16).
  if (answer && typeof answer.then === "function")
    throw refuseUnusableName(
      scenario.title,
      "the scenarioNameTemplate returned a Promise.",
      "return the name directly. The template runs while Fusion registers the tests, before " +
        "any of them runs, so it cannot wait for anything.",
    );

  if (typeof answer !== "string" || answer.length === 0)
    throw refuseUnusableName(
      scenario.title,
      `the scenarioNameTemplate returned ${describeWhatCameBack(answer)}.`,
      "return a non-empty string. A missing return answers undefined, which produces a test " +
        "that cannot be reported or selected by name.",
    );

  return answer;
};

export { nameForScenario };
