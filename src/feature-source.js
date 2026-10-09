// Driven port: everything outside the process boundary that getting a feature file needs.
//
// This is the ONLY module under src/ that requires the filesystem, the Gherkin parser or the
// caller-stack reader: docs/Architecture.md's table says so, and
// test/specs/arch/dependency-direction.steps.js holds every module to its row. It hands the
// rest of the package one plain value (a LoadedFeature), so the core works on values and
// needs no file or parser to be read or tested.
//
// LoadedFeature, the whole of what crosses back:
//   { title, featureTags, scenarios: [ { title, excludedByTagFilter, tags,
//                                        steps: [ { keyword, stepText, stepArgument } ] } ] }
// `keyword` is already a registry bucket, `stepText` is already substituted for its Examples
// row, and `stepArgument` is already the shape a step function receives, so nothing
// downstream has to know a pickle exists. `excludedByTagFilter` is present only when a
// tagFilter was given, and `featureTags` and `tags` are read only when a scenarioNameTemplate
// is given; all three are read by presence or truthiness, so a value staged without them
// behaves exactly as one did before those options did anything.

const fs = require("fs");
const path = require("path");
const url = require("url");
const callerSites = require("callsites");
const gherkin = require("@cucumber/gherkin");
const messages = require("@cucumber/messages");
// The named export, not the default: 9.1.0 publishes both, and `default` is interop
// scaffolding a later major could drop without that being a documented breaking change.
const { parse: parseTagExpression } = require("@cucumber/tag-expressions");

const { bucketForKeyword } = require("./keywords");
const { stepArgumentFrom } = require("./step-argument");
const { tagFilterFor } = require("./tag-filter");

// Resolve the feature path from the FIRST stack frame outside this package, so an in-package
// re-export/wrapper frame does not retarget it; guard a shallow stack (no external frame) so
// we never call getFileName() on undefined.
//
// Only a frame whose file is ON DISK can be the caller: an absolute path, or the file: URL an
// ES module frame reports. Any other frame is skipped: a native function holds one with no file
// name when Fusion is handed straight to it, `[...].forEach(Fusion)`; Node's own modules report
// `node:events` and the like; code run through vm reports `evalmachine.<anonymous>`. Taking any
// of them as the caller resolved the path against the working directory (finding F7 of the
// PR #16 review, and the review of its fix).
const fileOnDisk = (fileName) => {
  if (typeof fileName !== "string") return null;
  if (fileName.startsWith("file:")) return url.fileURLToPath(fileName);
  return path.isAbsolute(fileName) ? fileName : null;
};

const resolveFeaturePath = (featureFileToLoad) => {
  const insideThisPackage = (fileName) =>
    fileName.startsWith(__dirname + path.sep);

  const callerFile = callerSites
    .default()
    .map((currentFrame) => fileOnDisk(currentFrame.getFileName()))
    .find((fileName) => fileName !== null && !insideThisPackage(fileName));
  const dirOfCaller = path.dirname(callerFile || "");

  return path.resolve(dirOfCaller, featureFileToLoad);
};

const readFeatureText = (absoluteFeatureFilePath) => {
  if (!fs.existsSync(absoluteFeatureFilePath))
    throw new Error(
      `Feature file not found (${absoluteFeatureFilePath})` +
        `. Fusion resolves a feature path relative to the directory of the file that calls` +
        ` Fusion, so check the path from there.`,
    );

  return fs.readFileSync(absoluteFeatureFilePath, "utf8");
};

// Parsing and compiling are two steps rather than one so that a check over the parsed AST
// (the duplicate declared-title check below) can refuse before any pickle work is done.
const parseFeature = (featureText) => {
  // One incrementing id source, shared with the compile below: it replaces the uuid v4 the
  // removed intermediary used, which is one of the two routes by which uuid reached a
  // consumer's tree.
  const ids = messages.IdGenerator.incrementing();
  const parser = new gherkin.Parser(
    new gherkin.AstBuilder(ids),
    new gherkin.GherkinClassicTokenMatcher(),
  );

  try {
    return { document: parser.parse(featureText), ids };
  } catch (parseFailure) {
    throw new Error(`Error parsing feature Gherkin: ${parseFailure.message}`);
  }
};

const compilePickles = (document, absoluteFeatureFilePath, ids) => {
  try {
    return gherkin.compile(document, absoluteFeatureFilePath, ids);
  } catch (compileFailure) {
    throw new Error(`Error parsing feature Gherkin: ${compileFailure.message}`);
  }
};

// Every child of a feature, in document order, with a Rule's own children flattened in where
// the Rule is declared. One walker for both views below, so a Rule-nesting fix is made once
// rather than twice in two copies that have to be kept agreeing.
//
// A rule child is visited as well as descended into, not instead: that is what the two copies
// did, and the traversal has to stay equivalent because the registration order read off it is
// the 2.0.0 test-name contract.
const eachChild = (children, visit) => {
  (children || []).forEach((child) => {
    if (child.rule) eachChild(child.rule.children, visit);
    visit(child);
  });
};

// Every AST step, by id, so a pickle step can be resolved back to the keyword a consumer
// registered against. A Rule's Background and scenarios carry steps of their own, which is why
// the walk descends.
const astStepsById = (feature) => {
  const steps = new Map();

  eachChild(feature.children, (child) => {
    const node = child.background || child.scenario;
    if (node) node.steps.forEach((step) => steps.set(step.id, step));
  });

  return steps;
};

// Every AST scenario, in document order, Rule children flattened in where they are declared.
// This is the DEFINITION-level view of the feature, and the only one anywhere in the package:
// one entry per declared Scenario or Scenario Outline, whatever its Examples do. Both the
// registration order and the duplicate-title check are read off it.
const astScenarios = (feature) => {
  const scenarios = [];

  eachChild(feature.children, (child) => {
    if (child.scenario) scenarios.push(child.scenario);
  });

  return scenarios;
};

const byId = (scenarios) =>
  new Map(scenarios.map((scenario) => [scenario.id, scenario]));

// Titles declared more than once, in the order they are first declared, each with its count.
// Compared case-insensitively, as the removed intermediary compared them
// (scenario-validation.js:8 and :14-17).
//
// DECLARED titles, never generated test names. One Scenario Outline contributes exactly one
// title however many Examples rows it has, which is the whole correctness of this check: a
// check over generated names would reject test/specs/features/scenario-outlines.feature,
// whose single outline produces three tests all named "Selling all of one", three names the
// 2.0.0 baseline records.
const duplicatedTitles = (scenarios) => {
  const countByComparableTitle = new Map();

  scenarios.forEach((scenario) => {
    const comparable = scenario.name.trim().toLowerCase();
    const seen = countByComparableTitle.get(comparable);

    if (seen) seen.count += 1;
    else
      countByComparableTitle.set(comparable, {
        title: scenario.name,
        count: 1,
      });
  });

  return [...countByComparableTitle.values()].filter((each) => each.count > 1);
};

const refuseDuplicatedTitles = (featureTitle, duplicated) => {
  const entries = duplicated.map(
    (each, index) =>
      `  ${index + 1}. "${each.title}" is declared ${each.count} times`,
  );

  throw new Error(
    `Duplicate scenario title: ${duplicated.length} title${
      duplicated.length === 1 ? " is" : "s are"
    } declared more than once in the feature "${featureTitle}".\n\n` +
      `${entries.join("\n")}\n\n` +
      `WHY:  Fusion generates one test per scenario, named for that scenario, so two\n` +
      `      scenarios declared with the same title cannot be told apart in a Jest report,\n` +
      `      by a -t filter, or in a test history. Titles are compared ignoring case, and a\n` +
      `      scenario inside a Rule counts with the rest.\n` +
      `HOW:  rename one of each pair, or pass\n` +
      `      errors: { scenariosMustMatchFeatureFile: false } to accept the file as it\n` +
      `      stands. A Scenario Outline counts once however many Examples rows it has, so\n` +
      `      repeated ROW names are never this refusal.`,
  );
};

// The first of a pickle node's astNodeIds that names something in the given index wins. A
// pickle step carries the ids of every AST node it was compiled from, and a pickle carries its
// scenario's and, on an Examples row, that row's: only some of them are in any one index.
const firstAstNodeOf = (pickleNode, byAstNodeId) =>
  (pickleNode.astNodeIds || [])
    .map((astNodeId) => byAstNodeId.get(astNodeId))
    .find((candidate) => candidate !== undefined);

const keywordOfPickleStep = (pickleStep, stepsById, language) => {
  const astStep = firstAstNodeOf(pickleStep, stepsById);

  if (!astStep)
    throw new Error(
      `Unresolvable step: "${pickleStep.text}" carries no astNodeId that names a step of` +
        ` the parsed feature, so the Gherkin keyword it was written with cannot be` +
        ` recovered and Fusion cannot tell which step definitions may bind it.`,
    );

  return bucketForKeyword(
    astStep.keyword,
    gherkin.dialects[language],
    language,
  );
};

// Reproduce the registration order the previous engine produced: within one feature, EVERY
// plain scenario comes before ANY Examples row, each group in document order. Compiling
// pickles yields document order, so this partition is the whole of the difference, and a
// consumer's CI history is keyed on it (test/specs/baseline/test-names-2.0.0.txt).
//
// Rule-nested scenarios and outlines take part in the same two groups, flattened: the
// previous engine read one flat scenario list and one flat outline list for the whole
// feature, with no Rule in between.
const PLAIN_SCENARIOS_FIRST = 0;
const EXAMPLES_ROWS_AFTER = 1;

const scenarioOrder = (pickle, scenariosById) => {
  const astScenario = firstAstNodeOf(pickle, scenariosById);

  return astScenario && (astScenario.examples || []).length > 0
    ? EXAMPLES_ROWS_AFTER
    : PLAIN_SCENARIOS_FIRST;
};

const inRegistrationOrder = (pickles, scenariosById) =>
  [PLAIN_SCENARIOS_FIRST, EXAMPLES_ROWS_AFTER].flatMap((group) =>
    pickles.filter((pickle) => scenarioOrder(pickle, scenariosById) === group),
  );

// The tag set a filter is evaluated against is the compiled pickle's own, which already unions
// the scenario's tags, the feature's tags and, for an Examples row, that Examples set's tags.
// One source makes that union correct by construction; the previous engine assembled it by
// hand in two places and had to keep them agreeing.
// The same shape reads a feature node's own declared tags, which is the other list a
// scenarioNameTemplate is handed. One reader of the tag shape rather than two.
const tagNamesOf = (tagged) => (tagged.tags || []).map((tag) => tag.name);

// No tagFilter means no filter is constructed and no scenario is marked, so loading is
// byte-for-byte what it was before this option did anything.
const tagFilterFrom = (options) =>
  options.tagFilter
    ? tagFilterFor(options.tagFilter, parseTagExpression)
    : null;

// `options` is the merged configuration, which always carries a complete three-key errors
// object. Two keys govern this port: scenariosMustMatchFeatureFile for the duplicate check,
// and tagFilter for the selection.
const loadFeature = (absoluteFeatureFilePath, options) => {
  const featureText = readFeatureText(absoluteFeatureFilePath);
  const { document, ids } = parseFeature(featureText);

  const feature = document.feature;
  if (!feature) return { title: "", scenarios: [] };

  const scenarios = astScenarios(feature);

  // Refused before the pickles are compiled: nothing downstream can make sense of a feature
  // whose scenarios cannot be told apart, so the work is not worth doing. It stays ahead of
  // the tags deliberately: a duplicated title is a property of the FILE, so a selection must
  // never be able to make a duplicate-title file acceptable.
  if (options.errors.scenariosMustMatchFeatureFile) {
    const duplicated = duplicatedTitles(scenarios);
    if (duplicated.length > 0) refuseDuplicatedTitles(feature.name, duplicated);
  }

  // Parsed before the pickles too, so an unreadable expression is a refusal that costs the
  // consumer nothing else and reaches them before anything is registered.
  const selects = tagFilterFrom(options);

  const pickles = compilePickles(document, absoluteFeatureFilePath, ids);
  const stepsById = astStepsById(feature);
  const scenariosById = byId(scenarios);

  return {
    title: feature.name,
    // The feature's own declared tags, kept apart from the scenarios'. Only a
    // scenarioNameTemplate reads them, and it needs the two lists separately.
    featureTags: tagNamesOf(feature),
    scenarios: inRegistrationOrder(pickles, scenariosById).map((pickle) => ({
      title: pickle.name,
      // Marked, never dropped: a scenario a filter excludes still has to appear in the report
      // under its own name, or a tag filter is indistinguishable from deleting a scenario.
      excludedByTagFilter: selects ? !selects(tagNamesOf(pickle)) : false,
      // The whole tag set that reached this scenario, as the pickle unions it. The core
      // subtracts the feature's tags from it where the template variables are assembled; the
      // case is left exactly as the feature file wrote it, because only that assembly wants it
      // lowercased.
      tags: tagNamesOf(pickle),
      steps: pickle.steps.map((pickleStep) => ({
        keyword: keywordOfPickleStep(pickleStep, stepsById, feature.language),
        stepText: pickleStep.text,
        stepArgument: stepArgumentFrom(pickleStep.argument),
      })),
    })),
  };
};

module.exports.resolveFeaturePath = resolveFeaturePath;
module.exports.loadFeature = loadFeature;
