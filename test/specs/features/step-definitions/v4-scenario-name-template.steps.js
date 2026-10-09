/**
 * What a scenarioNameTemplate is handed, for every test the feature registers.
 *
 * An ordinary consumer step definition file: it requires the package's public surface,
 * registers a definition, and calls Fusion() with a template at module load. It observes the
 * half of this value only a step definition file can see -- the VARIABLES the template
 * received. The other half, that what the template returned became the test's reported name,
 * is observed by test/specs/baseline/assert-template-names.js, because a recording template
 * cannot see what Jest called the test it was naming.
 *
 * WHAT IT PINS, one obligation per observation:
 *   1. the template is called once for every test the feature registers -- three here, a
 *      plain scenario and two Examples rows -- and not again when those tests run;
 *   2. it is handed exactly the four declared variables and no fifth;
 *   3. featureTitle is the feature's name and featureTags its declared tags, with the leading
 *      at sign and lowercased;
 *   4. a plain scenario is handed its own title and its own tags, with the feature's tags in
 *      featureTags and NOT in scenarioTags;
 *   5. each Examples row is handed ITS OWN substituted title -- the defect this value fixes:
 *      the previous engine called the template with the outline's un-substituted title and
 *      then threw the result away for the row's own name, so the option was silently inert on
 *      every row;
 *   6. an outline row's scenarioTags carry the outline's tag and the Examples set's tag;
 *   7. a template that throws is refused at collection;
 *   8. a template that answers with something other than a non-empty string is refused too,
 *      naming what came back. The previous engine passed it to the runner and produced a test
 *      that could not be reported or selected by name.
 *
 * WHAT IT DOES NOT PIN: the ORDER of the tags within either list. The authority fixes which
 * tags are in which list, the at sign and the lowercasing; it does not fix an order, so the
 * lists are compared as sorted sets. The refusals' first lines are pinned because the
 * authority fixes that phrase; the rest of their prose is not.
 *
 * CURRENT STATUS against the value-3 tree:
 *   RED   — scenarioNameTemplate reaches no reader: src/configuration.js carries the key and
 *           src/test-registration.js names every test from the raw scenario title. So the
 *           template is never called, the recording list is empty, and neither bad template is
 *           ever asked for a name, let alone refused. Each failure is an assertion.
 */

const { Given, Fusion } = require("../../../../src");

const THE_FEATURE = "../v4-scenario-name-template.feature";
const FEATURE_TITLE = "A template names every test";

// Every set of variables the template was handed, in the order it was handed them.
const recordedCalls = [];

const aRecordingTemplate = (variables) => {
  recordedCalls.push(variables);
  return `templated: ${variables.scenarioTitle}`;
};

// Compared as sorted sets, and with the variable names themselves, so a fifth variable or a
// missing one fails here as loudly as a wrong value.
// The call that named one test, by the position it was made in. A call that was never made
// reads as a stated absence rather than as a dereference of undefined.
const theCallThatNamed = (position, whatItShouldHaveNamed) => {
  const call = recordedCalls[position];
  if (!call)
    throw new Error(
      `WHAT: the template was never called to name ${whatItShouldHaveNamed}. ` +
        `${recordedCalls.length} call(s) were recorded in all.\n` +
        "WHY:  a test the template was not asked about is a test the template did not name, " +
        "which is the option being inert for that test. On every Examples row that is " +
        "precisely what the previous engine did.\n" +
        "HOW:  ask src/scenario-name.js for a name once per scenario, Examples rows " +
        "included, at the point each test is registered.",
    );
  return call;
};

const asComparable = (variables) => ({
  variablesHandedOver: Object.keys(variables).sort(),
  featureTitle: variables.featureTitle,
  featureTags: [...(variables.featureTags || [])].sort(),
  scenarioTitle: variables.scenarioTitle,
  scenarioTags: [...(variables.scenarioTags || [])].sort(),
});

const THE_FOUR_VARIABLES = [
  "featureTags",
  "featureTitle",
  "scenarioTags",
  "scenarioTitle",
];

Given("the shop is open", () => {});
Fusion(THE_FEATURE, { scenarioNameTemplate: aRecordingTemplate });

// Taken before any test runs. Naming happens while Fusion registers, so the list is already
// complete here -- and the afterAll below checks it did not grow once the tests ran.
const callsWhileRegistering = recordedCalls.length;

const THE_TEMPLATE_FAILURE = "the template could not decide on a name";

let refusalFromAThrowingTemplate = null;
Given("the shop is open", () => {});
try {
  Fusion(THE_FEATURE, {
    scenarioNameTemplate: () => {
      throw new Error(THE_TEMPLATE_FAILURE);
    },
  });
} catch (thrown) {
  refusalFromAThrowingTemplate = thrown;
}

let refusalFromANonStringTemplate = null;
Given("the shop is open", () => {});
try {
  Fusion(THE_FEATURE, { scenarioNameTemplate: () => 42 });
} catch (thrown) {
  refusalFromANonStringTemplate = thrown;
}

const THE_NAMING_REFUSAL_PHRASE =
  "An error occurred while executing a scenario name template";

const firstLineOf = (refusal) =>
  refusal ? refusal.message.split("\n")[0].trim() : "";

// --- the observations -----------------------------------------------------------------------

test("the template is called once for every test the feature registers", () => {
  // WHAT: three calls -- one for the plain scenario and one for each of the two Examples rows
  //       -- against the three tests this feature registers.
  // WHY:  a template that is called for some tests and not others names some tests and not
  //       others, which is exactly the defect this value fixes: on every Examples row the
  //       option was silently inert. The count is checked against the population the feature
  //       declares, so a fourth call fails here too.
  // HOW:  ask for a name once per scenario, Examples rows included, at the point each test is
  //       registered.
  expect({
    calls: recordedCalls.length,
    testsTheFeatureRegisters: 3,
  }).toStrictEqual({ calls: 3, testsTheFeatureRegisters: 3 });
});

test("a plain scenario is handed its own title and its own tags, and the feature's separately", () => {
  // WHAT: the four declared variables and no fifth, with the feature's tag in featureTags,
  //       the scenario's in scenarioTags, both lowercased and both carrying the leading at
  //       sign -- although the feature file writes them capitalised.
  // WHY:  a consumer's existing template was written against this shape: four variables, tags
  //       with the at sign, lowercased, and the two lists disjoint. Adding a variable, or
  //       handing tags over as written, changes what their template produces without them
  //       touching it.
  // HOW:  lowercase the tag names where the variables are assembled, and take scenarioTags as
  //       the pickle's unioned set with the feature's declared tags removed.
  expect(asComparable(theCallThatNamed(0, "the plain scenario"))).toStrictEqual(
    {
      variablesHandedOver: THE_FOUR_VARIABLES,
      featureTitle: FEATURE_TITLE,
      featureTags: ["@shop"],
      scenarioTitle: "A shopper pays at the till",
      scenarioTags: ["@checkout"],
    },
  );
});

test("each Examples row is handed its own substituted title and its Examples set's tag", () => {
  // WHAT: the two rows' calls, each carrying THAT row's substituted title, and scenarioTags
  //       carrying both the outline's tag and the Examples set's own.
  // WHY:  this is the defect. The previous engine called the template with the outline's
  //       un-substituted title -- identical for every row -- and then registered each row
  //       under its own name anyway, discarding the templated value. Two identical
  //       scenarioTitle values here, or an Examples-set tag missing from scenarioTags, is that
  //       behaviour unfixed.
  // HOW:  name each test from the pickle it was compiled from, which already carries the
  //       row's substituted title and the unioned tag set.
  expect(
    [
      theCallThatNamed(1, "the first Examples row"),
      theCallThatNamed(2, "the second Examples row"),
    ].map(asComparable),
  ).toStrictEqual([
    {
      variablesHandedOver: THE_FOUR_VARIABLES,
      featureTitle: FEATURE_TITLE,
      featureTags: ["@shop"],
      scenarioTitle: "A shopper collects shirt",
      scenarioTags: ["@online", "@stockroom"],
    },
    {
      variablesHandedOver: THE_FOUR_VARIABLES,
      featureTitle: FEATURE_TITLE,
      featureTags: ["@shop"],
      scenarioTitle: "A shopper collects sticker",
      scenarioTags: ["@online", "@stockroom"],
    },
  ]);
});

test("a template that throws is refused at collection", () => {
  // WHAT: a refusal whose first line is the phrase a consumer may already grep for.
  // WHY:  a template that throws cannot name a test, and there is no honest name to fall back
  //       on. Swallowing the failure would name one test from the template and another from
  //       the raw title, so two runs of the same suite could not be compared.
  // HOW:  call the template inside the module that owns naming, and turn a throw into one
  //       refusal before anything is registered.
  expect(refusalFromAThrowingTemplate).not.toBeNull();
  expect(firstLineOf(refusalFromAThrowingTemplate)).toContain(
    THE_NAMING_REFUSAL_PHRASE,
  );
  expect(refusalFromAThrowingTemplate.message).toContain(THE_TEMPLATE_FAILURE);
});

test("a template that answers with something other than a non-empty string is refused, naming what came back", () => {
  // WHAT: the same refusal shape for a template that returned a number, and the value it
  //       returned named in it.
  // WHY:  this check is new. The previous engine handed whatever came back straight to the
  //       runner, so a template returning undefined produced a test with no usable name and
  //       one returning a number produced a test that could not be selected by name. Refusing
  //       is the only answer that leaves the consumer able to act -- and they can only act if
  //       they are told what their template actually returned.
  // HOW:  check the answer is a non-empty string before it reaches the runner, and name it in
  //       the refusal when it is not.
  expect(refusalFromANonStringTemplate).not.toBeNull();
  expect(firstLineOf(refusalFromANonStringTemplate)).toContain(
    THE_NAMING_REFUSAL_PHRASE,
  );
  expect(refusalFromANonStringTemplate.message).toContain("42");
});

afterAll(() => {
  // WHAT: the template was not called again while the tests ran.
  // WHY:  a name is needed once, when the test is registered. A template called a second time
  //       per test would double the cost of an expensive one and, if it were not pure, could
  //       answer differently from the name the test was registered under.
  // HOW:  ask for the name at registration and keep it; never re-derive it in the test body.
  expect(recordedCalls.length).toBe(callsWhileRegistering);
});
