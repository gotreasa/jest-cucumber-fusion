/**
 * The agreement with @cucumber/tag-expressions: the expression language tagFilter speaks.
 *
 * The whole of tagFilter's grammar now comes from this library, so its terms are a contract
 * with another owner on another release schedule, not an internal detail. This spec states
 * them against the REAL installed package -- requiring it by name, the way src/feature-source.js
 * does -- so a version bump that changes any of them is caught here and not in a consumer's
 * suite.
 *
 * Producer side: the dependency declaration in package.json, where this repository fixes which
 * tag expression language it speaks. node_modules is untracked, so the declaration, not a
 * vendored dist, is the honest locator.
 * Consumer side: src/feature-source.js, the one module the architectural law lets reach the
 * cucumber scope. It requires the library and hands the parse function inward to
 * src/tag-filter.js, which is why that module can stay pure.
 *
 * The term worth reading twice is the last one. A parser that answered an unparseable
 * expression with a matcher returning false for everything would be the worst possible
 * neighbour: a consumer's typo would exit 0 having run nothing, and look exactly like a filter
 * that correctly selected no scenario. The contract is that it RAISES.
 *
 * CURRENT STATUS: RED, and for one stated reason -- @cucumber/tag-expressions is not a
 * dependency of this package yet. Every test below names that in its failure instead of
 * crashing on an undefined, so the red is readable and tells the crafter exactly what to add.
 * It turns green when the pin is declared and installed, and red again if a later pin changes
 * the API or moves to a cucumber major that publishes ESM only and so cannot be required under
 * Jest on the supported Node line.
 */

const THE_LIBRARY = "@cucumber/tag-expressions";

let required = null;
let loadFailure = null;

try {
  required = require(THE_LIBRARY);
} catch (thrown) {
  loadFailure = thrown;
}

// Any of the three CommonJS interop shapes counts as "requiring it yields a parse function":
// a named `parse` export, the module itself, or a default export. The design fixes that a
// parse function is reachable from CommonJS; it does not fix which shape, so this reports the
// one it found rather than failing on a guess. 9.1.0 publishes an object carrying BOTH `parse`
// and `default`, and the named export is the one to prefer -- the default is interop
// scaffolding that a later major could drop without it being a breaking change to anyone
// reading the documentation.
const parse =
  required && typeof required.parse === "function"
    ? required.parse
    : typeof required === "function"
      ? required
      : required && typeof required.default === "function"
        ? required.default
        : null;

const describeWhatWasFound = () => {
  if (loadFailure) return `require() threw: ${loadFailure.message}`;
  if (!required) return "require() yielded nothing";
  return `require() yielded ${typeof required}${
    typeof required === "object"
      ? ` with keys [${Object.keys(required).join(", ")}]`
      : ""
  }`;
};

// Every test states this first, so an absent or changed library reads as a broken agreement
// with its cause named, never as a call on undefined.
const theAgreementIsObservable = () => {
  if (!parse)
    throw new Error(
      `WHAT: no parse function could be reached from ${THE_LIBRARY}.\n` +
        `      ${describeWhatWasFound()}\n` +
        "WHY:  tagFilter's whole expression language comes from this library, reached by " +
        "require() from CommonJS inside the consumer's Jest. Without it there is no grammar " +
        "to speak, and none of the terms below has been observed.\n" +
        `HOW:  declare ${THE_LIBRARY} in package.json dependencies, pinned exactly to 9.1.0 ` +
        "(the majors past it publish ESM only and Jest on the supported Node line cannot " +
        "require them), regenerate package-lock.json, and require it from " +
        "src/feature-source.js -- the one module the architectural law lets reach the " +
        "cucumber scope.",
    );
};

const satisfies = (expression, tags) => parse(expression).evaluate(tags);

describe("the tag expression language tagFilter speaks", () => {
  test("the pinned library can be required from CommonJS and yields a parse function", () => {
    // WHAT: a parse function, reachable by require() from an ordinary CommonJS file.
    // WHY:  this package has no build step and a consumer requires it from their own
    //       .steps.js under their own Jest, so a dependency that cannot be require()d cannot
    //       be used at all. This is the term the exact pin exists to protect.
    // HOW:  pin a version whose published package carries a CommonJS build and a require
    //       condition in its exports map.
    theAgreementIsObservable();
    expect(typeof parse).toBe("function");
  });

  test("a parsed expression evaluates an array of tags", () => {
    theAgreementIsObservable();

    // WHAT: parse(...) returns something with an evaluate that takes the array of tags a
    //       scenario carries and answers a boolean.
    // WHY:  a compiled pickle hands over its tags as a list, and that list is what the filter
    //       is evaluated against. An evaluate expecting any other shape would silently answer
    //       for the wrong input.
    // HOW:  call evaluate with the tag list as a single array argument.
    const parsed = parse("@included");
    expect(typeof parsed.evaluate).toBe("function");
    expect(parsed.evaluate(["@included"])).toBe(true);
    expect(parsed.evaluate([])).toBe(false);
  });

  test("and, or, not and parentheses answer as the documentation claims", () => {
    theAgreementIsObservable();

    // WHAT: the four operators tagFilter's documentation promises a consumer, each on the tag
    //       sets that distinguish it from the others -- including the filter from the value
    //       text on all three sets it has to tell apart.
    // WHY:  these are the operators the option's documentation names, so each is a promise to
    //       a consumer. `and` that behaved like `or` would run the scenarios they excluded,
    //       which is a worse failure than running none.
    // HOW:  take the grammar from the library rather than rewriting the expression into
    //       JavaScript, which is what the removed intermediary did.
    expect({
      bothRequiredAndBothPresent: satisfies("@a and @b", ["@a", "@b"]),
      bothRequiredAndOneMissing: satisfies("@a and @b", ["@a"]),
      eitherWillDo: satisfies("@a or @b", ["@b"]),
      eitherAndNeitherPresent: satisfies("@a or @b", ["@c"]),
      negatedAndPresent: satisfies("not @a", ["@a"]),
      negatedAndAbsent: satisfies("not @a", ["@b"]),
      parenthesisedAndSatisfied: satisfies("@a and (@b or @c)", ["@a", "@c"]),
      parenthesisedAndUnsatisfied: satisfies("@a and (@b or @c)", ["@a"]),
      theValueTextFilterOnTheIncludedSet: satisfies(
        "@included and not @excluded",
        ["@included"],
      ),
      theValueTextFilterOnTheExcludedSet: satisfies(
        "@included and not @excluded",
        ["@excluded"],
      ),
      theValueTextFilterOnBoth: satisfies("@included and not @excluded", [
        "@included",
        "@excluded",
      ]),
    }).toStrictEqual({
      bothRequiredAndBothPresent: true,
      bothRequiredAndOneMissing: false,
      eitherWillDo: true,
      eitherAndNeitherPresent: false,
      negatedAndPresent: false,
      negatedAndAbsent: true,
      parenthesisedAndSatisfied: true,
      parenthesisedAndUnsatisfied: false,
      theValueTextFilterOnTheIncludedSet: true,
      theValueTextFilterOnTheExcludedSet: false,
      theValueTextFilterOnBoth: false,
    });
  });

  test("an unparseable expression raises instead of quietly matching nothing", () => {
    theAgreementIsObservable();

    const unbalanced = "@included and (not @excluded";
    let parseFailure = null;
    let matcher = null;
    try {
      matcher = parse(unbalanced);
    } catch (thrown) {
      parseFailure = thrown;
    }

    // WHAT: parsing an expression with an unbalanced parenthesis throws, and does not hand
    //       back a matcher at all.
    // WHY:  this is the failure mode that would be invisible. A matcher answering false for
    //       everything turns a consumer's typo into a run that exits 0 having executed
    //       nothing, indistinguishable from a filter that correctly selected no scenario.
    //       Fusion can only refuse at collection if the library tells it there is a problem.
    // HOW:  let the parse failure out, and catch it where the parser is called so it can be
    //       re-raised as a refusal about the consumer's option rather than about a grammar.
    expect({
      threw: parseFailure !== null,
      handedBackAMatcher: matcher !== null,
    }).toStrictEqual({ threw: true, handedBackAMatcher: false });
  });
});
