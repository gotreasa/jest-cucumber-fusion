/**
 * A tag filter decides whose step functions run.
 *
 * An ordinary consumer step definition file: it requires the package's public surface,
 * registers definitions that record every step they run, and calls Fusion() with a tagFilter
 * at module load. It observes the half of this value that only a step definition file can see
 * -- which scenarios' bodies actually EXECUTED. The other half, the status Jest reports for
 * the scenario that did not, is observed by test/specs/baseline/assert-tag-filter-report.js,
 * because a counter inside the file cannot see a reported status and a report cannot see that
 * a body never ran.
 *
 * WHAT IT PINS, one obligation per observation:
 *   1. the selected scenario's steps all ran, in order;
 *   2. not one step of the excluded scenario ran -- not the step it shares with its selected
 *      sibling, and not the step that is its own;
 *   3. an Examples row is selected by the tags its compiled pickle unions, so a row whose
 *      Examples set carries the tag runs even though the outline itself carries none;
 *   4. the feature's own tag counts towards the selection too;
 *   5. the same filter written in another case selects exactly the same scenarios -- and the
 *      tags in the feature file are written in a THIRD case, so neither side can be left
 *      un-normalised;
 *   6. a filter that cannot be parsed is refused at collection, before any describe, with a
 *      first line that names the expression.
 *
 * HOW THE CASES ARE SPLIT. test/specs/features/v3-tag-filter.feature spells its tags
 * @Included and @eXcluded. The first filter below is all lowercase, so it can only select
 * them if the TAGS are lowercased; the second is uppercase on every tag, so it can only
 * select them if the EXPRESSION is lowercased as well. Lowercasing one side and not the other
 * leaves one of the two passes selecting nothing. The remaining direction -- an uppercase
 * filter against lowercase tags -- is driven by the mixed-case fixture, so neither file
 * repeats the other.
 *
 * CURRENT STATUS against the value-2 tree:
 *   RED   — tagFilter reaches no reader: src/feature-source.js says so in as many words at
 *           its options comment. So every scenario runs in both passes, the excluded
 *           scenario's steps execute, and the malformed expression is never looked at, let
 *           alone refused. Each failure is an assertion, not a crash.
 */

// --- counting what the malformed pass registers ---------------------------------------------
// The first two passes register for real; only the malformed one is counted, because "refused
// before any describe" is a claim about what was NOT registered. Installed before the package
// is required, so it is the only set of globals the package can ever see.
const realJestGlobals = {
  describe: global.describe,
  test: global.test,
  beforeEach: global.beforeEach,
  afterEach: global.afterEach,
};

let counted = null;

const countingOrForwarding = (globalName, countKey) =>
  Object.assign((...whateverThePackagePassed) => {
    if (!counted)
      return realJestGlobals[globalName](...whateverThePackagePassed);
    counted[countKey || globalName] += 1;
    return undefined;
  }, realJestGlobals[globalName]);

global.describe = countingOrForwarding("describe", "describes");
global.beforeEach = countingOrForwarding("beforeEach", "hooks");
global.afterEach = countingOrForwarding("afterEach", "hooks");
global.test = countingOrForwarding("test", "tests");
global.test.skip = countingOrForwarding("test", "tests");

const { Given, When, Fusion } = require("../../../../src");

// Every step of the feature records that it ran, so the log IS the answer to "whose bodies
// executed". The step that both scenarios share records the same label, which makes the count
// of it the number of scenarios that ran.
const registerDefinitionsRecordingInto = (stepsThatRan) => {
  Given("the shop is open", () => stepsThatRan.push("open"));
  When(/^the selected shopper buys a (.+)$/, (item) =>
    stepsThatRan.push(`selected:${item}`)
  );
  When(/^the excluded shopper buys a (.+)$/, (item) =>
    stepsThatRan.push(`excluded:${item}`)
  );
};

// The feature tag, the scenario tag and the Examples-set tag all have to count for this to
// select anything.
const THE_FILTER = "@shop and @included and not @excluded";
const THE_SAME_FILTER_IN_ANOTHER_CASE = "@SHOP and @INCLUDED and not @EXCLUDED";
const A_FILTER_THAT_CANNOT_BE_PARSED = "@shop and (not @excluded";

// What the selected scenarios do, in registration order: the plain scenario first, then the
// two Examples rows. The excluded scenario contributes nothing at all.
const THE_SELECTED_STEPS = [
  "open",
  "selected:shirt",
  "open",
  "selected:sticker",
  "open",
  "selected:mug",
];

const underTheFilter = [];
registerDefinitionsRecordingInto(underTheFilter);
Fusion("../v3-tag-filter.feature", { tagFilter: THE_FILTER });

const underTheSameFilterInAnotherCase = [];
registerDefinitionsRecordingInto(underTheSameFilterInAnotherCase);
Fusion("../v3-tag-filter.feature", {
  tagFilter: THE_SAME_FILTER_IN_ANOTHER_CASE,
});

// Definitions are registered for this pass too, so that the ONLY thing that can stop it is
// the unparseable expression. Without them an unbound-step refusal would fire first and the
// observation below would pass for the wrong reason.
let refusal = null;
counted = { describes: 0, tests: 0, hooks: 0 };
registerDefinitionsRecordingInto([]);
try {
  Fusion("../v3-tag-filter.feature", {
    tagFilter: A_FILTER_THAT_CANNOT_BE_PARSED,
  });
} catch (thrown) {
  refusal = thrown;
}
const registeredWhileRefusing = counted;
counted = null;

const refusalText = refusal ? refusal.message : "";
const firstLineOfRefusal = refusalText.split("\n")[0].trim();

// --- the observations -----------------------------------------------------------------------

test("a filter that cannot be parsed is refused at collection, naming the expression", () => {
  // WHAT: a refusal whose first line is the phrase a consumer may already grep for, followed
  //       by their own expression in double quotes.
  // WHY:  the alternative is the silent one: an expression that cannot be read turning into a
  //       matcher that answers false for everything, so the run exits 0 having executed
  //       nothing and looks exactly like a filter that correctly selected no scenario. The
  //       expression has to be echoed because the consumer's question is about what THEY
  //       wrote, not about a grammar.
  // HOW:  catch the parse failure where the parser is called and re-raise it with this first
  //       line.
  expect(refusal).not.toBeNull();
  expect(firstLineOfRefusal).toMatch(
    new RegExp(
      `^Could not parse tag filter "${A_FILTER_THAT_CANNOT_BE_PARSED.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
      )}"`
    )
  );
});

test("the refusal goes on to say why it could not be read and how to write one", () => {
  const afterTheFirstLine = refusalText.split("\n").slice(1).join("\n");

  // WHAT: more than the one line the previous engine gave, and the expression language named
  //       in it: `not`, `or` and parentheses.
  // WHY:  a consumer who mistyped a filter needs to know what the language actually is. The
  //       old single-line message told them their expression was bad and nothing else.
  // HOW:  state why it could not be read and how to write one, naming the operators and the
  //       parentheses that are supported.
  //
  // `and` is deliberately NOT checked: it is indistinguishable from ordinary English in this
  // prose, so an assertion on it could not fail for the right reason.
  expect(afterTheFirstLine.trim()).not.toBe("");
  expect({
    namesNot: /(^|[^a-z])not([^a-z]|$)/.test(afterTheFirstLine),
    namesOr: /(^|[^a-z])or([^a-z]|$)/.test(afterTheFirstLine),
    namesParentheses:
      afterTheFirstLine.includes("(") && afterTheFirstLine.includes(")"),
  }).toStrictEqual({ namesNot: true, namesOr: true, namesParentheses: true });
});

test("a refused filter registers nothing at all", () => {
  // WHAT: no describe, no test, no hook was registered by the pass that refused.
  // WHY:  "no test of that file runs" is the promise. A refusal carried by a registered test
  //       whose body throws would report a wiring mistake as a behavioural failure, and would
  //       let a -t filter hide it entirely.
  // HOW:  read and parse the filter in the port, before the pickles are compiled and long
  //       before anything is registered.
  expect(registeredWhileRefusing).toStrictEqual({
    describes: 0,
    tests: 0,
    hooks: 0,
  });
});

afterAll(() => {
  // WHAT: exactly the steps of the selected scenarios, in order -- and not one step of the
  //       excluded scenario, including the step it shares with its selected sibling.
  // WHY:  this is the point of a tag filter. Running an excluded scenario's body is the
  //       failure the option exists to prevent; and the shared `open` step appearing a fourth
  //       time would mean the excluded scenario ran even though its own step did not record.
  //       The two Examples rows are here because an Examples set carries the tag rather than
  //       the outline, and the feature tag is in the expression, so a selection that ignored
  //       either union would come up empty.
  // HOW:  evaluate the expression against the tag set the compiled pickle already unions --
  //       the scenario's, the feature's and the Examples set's -- and register the scenarios
  //       it excludes as skipped tests, which never run a body.
  expect(underTheFilter).toStrictEqual(THE_SELECTED_STEPS);
  expect(
    underTheFilter.filter((each) => each.startsWith("excluded:"))
  ).toStrictEqual([]);

  // WHAT: the same filter in another case ran the same bodies, in the same order.
  // WHY:  matching was case-insensitive before this package owned it, and a consumer's suite
  //       must not start selecting nothing because of how they capitalised a tag. The tags in
  //       the feature file are in a third case again, so neither side can be left
  //       un-normalised.
  // HOW:  lowercase the expression and every tag before the comparison.
  expect(underTheSameFilterInAnotherCase).toStrictEqual(THE_SELECTED_STEPS);
});
