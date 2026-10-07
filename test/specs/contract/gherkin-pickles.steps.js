/**
 * The agreement with @cucumber/gherkin: the pickle facts this package builds on.
 *
 * Gherkin has its own owner and its own release schedule. Everything this package stopped
 * doing for itself -- expanding a Scenario Outline, collapsing a Background and a Rule
 * Background into each scenario, substituting Examples values into titles, step text and
 * data-table cells, unioning tags, and keeping an empty docstring -- it now gets from the
 * compiler. Those are not internal details; they are the terms of the agreement, and this
 * spec states them against the REAL installed compiler so a version bump that changes any of
 * them is caught here rather than in a consumer's suite.
 *
 * Producer side: the dependency declaration in package.json, which is where this repository
 * fixes the version and therefore the pickle API and shape. node_modules is untracked, so the
 * declaration, not a vendored dist, is the honest locator.
 * Consumer side: the one module allowed to parse and compile (src/feature-source.js once it
 * exists; before then, the parsed-feature consumption point in src/index.js).
 *
 * The keyword fact is the one worth reading twice. A pickle step's `type` is only Context,
 * Action or Outcome -- an `And` step arrives as Context -- so the Gherkin keyword a consumer
 * registered against cannot be read off the pickle. It is recovered through the step's
 * astNodeIds back into the parsed AST. That is why "every pickle step carries an astNodeId
 * that resolves to an AST step with a keyword" is a term of the agreement and not trivia.
 *
 * CURRENT STATUS: GREEN, and deliberately so. This is a guard, not a falsifier: the Gherkin
 * reachable today already produces every fact below, which is exactly why the design chose
 * pickles. It turns red if a later pin changes the pickle shape, or moves to a cucumber major
 * that publishes ESM only and so cannot be required under Jest on the supported Node line --
 * the named residue of the CommonJS pin.
 */

// The compiler is required here, directly and by name, because the version that is actually
// installed IS the subject. A failure to load it is reported as a failure of this agreement
// rather than left to crash the file, so the reason is readable.
let gherkin = null;
let messages = null;
let loadFailure = null;

try {
  gherkin = require("@cucumber/gherkin");
  messages = require("@cucumber/messages");
} catch (thrown) {
  loadFailure = thrown;
}

const FEATURE = [
  "@fusion",
  "Feature: Pickle facts Fusion depends on",
  "",
  "  Background:",
  "    Given the ground crew is on station",
  "",
  "  Scenario: Repeated title",
  "    Given the launch pad is clear",
  "",
  "  Scenario: Repeated title",
  "    Given the launch pad is clear",
  "",
  "  Rule: A grounded rocket is inspected",
  "",
  "    Background:",
  "      Given the inspection log is open",
  "",
  "    Scenario: A grounded rocket is inspected",
  "      Given the crew roster lists:",
  "        | Name | Role  |",
  "        | Ada  | pilot |",
  "",
  "    @outline",
  "    Scenario Outline: An incident is filed for rocket <rocket>",
  '      Given an incident is filed for rocket "<rocket>" with these notes:',
  '        """',
  '        """',
  "      And the incident lists:",
  "        | rocket   | engine   |",
  "        | <rocket> | <engine> |",
  "",
  "      @rows",
  "      Examples:",
  "        | rocket | engine |",
  "        | Falcon | 3      |",
  "        | Vega   | 1      |",
  "",
].join("\n");

const compileTheFeature = () => {
  const ids = messages.IdGenerator.incrementing();
  const parser = new gherkin.Parser(
    new gherkin.AstBuilder(ids),
    new gherkin.GherkinClassicTokenMatcher()
  );
  const document = parser.parse(FEATURE);
  return {
    document,
    pickles: gherkin.compile(document, "pickle-facts.feature", ids),
  };
};

let compiled = null;
let compileFailure = null;

if (!loadFailure) {
  try {
    compiled = compileTheFeature();
  } catch (thrown) {
    compileFailure = thrown;
  }
}

// Every test states this first, so a compiler that cannot be loaded or cannot compile reads
// as a broken agreement with its cause named, never as a null dereference.
const theAgreementIsObservable = () => {
  if (loadFailure)
    throw new Error(
      "WHAT: the installed @cucumber/gherkin could not be required.\n" +
        `  ${loadFailure.message}\n` +
        "WHY:  this package requires the compiler synchronously inside the consumer's Jest, so " +
        "a compiler that cannot be required leaves every pickle fact below unobserved.\n" +
        "HOW:  pin the cucumber dependencies to the last CommonJS-loadable line, exactly."
    );
  if (compileFailure)
    throw new Error(
      "WHAT: the installed @cucumber/gherkin could not compile the feature in this file.\n" +
        `  ${compileFailure.message}\n` +
        "WHY:  the parse and compile API is half of this agreement; if its shape moved, nothing " +
        "below is evidence of anything.\n" +
        "HOW:  check the Parser / AstBuilder / GherkinClassicTokenMatcher / compile surface of " +
        "the pinned version against the call above."
    );
};

const keywordByAstStepId = () => {
  const keywords = new Map();
  const descend = (children) => {
    (children || []).forEach((child) => {
      if (child.rule) descend(child.rule.children);
      const node = child.background || child.scenario;
      if (node)
        node.steps.forEach((step) => keywords.set(step.id, step.keyword));
    });
  };
  descend(compiled.document.feature.children);
  return keywords;
};

const pickleNamed = (name) =>
  compiled.pickles.filter((pickle) => pickle.name === name);

const stepTextsOf = (pickle) => pickle.steps.map((step) => step.text);

describe("the pickle facts this package depends on hold for the installed Gherkin", () => {
  test("the installed compiler can be required and the feature compiled", () => {
    // WHAT: the compiler loads under this runtime and compiles a document into pickles.
    // WHY:  every term below is read off those pickles. If the compiler cannot be required at
    //       all -- the shape a cucumber major that publishes ESM only takes under Jest on the
    //       supported Node line -- then nothing below observes anything, and that has to read
    //       as a broken agreement rather than as silence.
    // HOW:  keep the cucumber dependencies pinned to the last CommonJS-loadable line, exactly,
    //       so require() works inside the consumer's Jest.
    expect(loadFailure && loadFailure.message).toBeNull();
    expect(compileFailure && compileFailure.message).toBeNull();
    expect(compiled.pickles.length).toBeGreaterThan(0);
  });

  test("one pickle per scenario and per Examples row, with the row's values in the title", () => {
    theAgreementIsObservable();
    // WHAT: the compiled names, in order, repeats kept where they are.
    // WHY:  this is where outline expansion and title substitution come from. Without one
    //       pickle per row, carrying its own substituted title, the generated test names
    //       cannot be reproduced at all -- and two scenarios of the same title must stay two
    //       pickles, not collapse into one.
    // HOW:  compile the document; do not re-expand or de-duplicate anything afterwards.
    expect(compiled.pickles.map((pickle) => pickle.name)).toStrictEqual([
      "Repeated title",
      "Repeated title",
      "A grounded rocket is inspected",
      "An incident is filed for rocket Falcon",
      "An incident is filed for rocket Vega",
    ]);
  });

  test("the feature Background is collapsed into every pickle and a Rule Background only into its Rule's", () => {
    theAgreementIsObservable();
    // WHAT: the first steps of a pickle outside the Rule, and of one inside it.
    // WHY:  Background collapse is the compiler's job, in the compiler's order. If the Rule
    //       Background leaked into a scenario outside the Rule, or a Background step went
    //       missing, every consumer feature that uses either would run the wrong steps.
    // HOW:  read the pickle's steps as given; add no Background handling of our own.
    expect(stepTextsOf(pickleNamed("Repeated title")[0])).toStrictEqual([
      "the ground crew is on station",
      "the launch pad is clear",
    ]);
    expect(
      stepTextsOf(pickleNamed("A grounded rocket is inspected")[0])
    ).toStrictEqual([
      "the ground crew is on station",
      "the inspection log is open",
      "the crew roster lists:",
    ]);
  });

  test("an Examples row's values are substituted into the step text and into data-table cells", () => {
    theAgreementIsObservable();
    const falcon = pickleNamed("An incident is filed for rocket Falcon")[0];

    // WHAT: this row's step text, and the cells of the table attached to its second step.
    // WHY:  substituted step text is what lets an outline step be bound by ordinary matching
    //       instead of by guessing against template text, and it is what makes the 155-line
    //       outline heuristic deletable. Cells matter just as much: a table cell left as
    //       "<rocket>" reaches the consumer's step function as the literal angle brackets.
    // HOW:  take the pickle's text and cells as compiled, for each row.
    expect(stepTextsOf(falcon)).toStrictEqual([
      "the ground crew is on station",
      "the inspection log is open",
      'an incident is filed for rocket "Falcon" with these notes:',
      "the incident lists:",
    ]);
    expect(
      falcon.steps[3].argument.dataTable.rows.map((row) =>
        row.cells.map((cell) => cell.value)
      )
    ).toStrictEqual([
      ["rocket", "engine"],
      ["Falcon", "3"],
    ]);
  });

  test("an empty docstring on an Examples row survives as the empty string", () => {
    theAgreementIsObservable();
    const vega = pickleNamed("An incident is filed for rocket Vega")[0];
    const notes = vega.steps[2].argument;

    // WHAT: the docstring argument of the outline's first step, on an Examples row.
    // WHY:  this single fact is why the empty docstring can be delivered at all. The
    //       intermediary being removed nulled it on a truthiness test before this package ever
    //       saw it. If the compiler ever stops distinguishing "an empty docstring" from "no
    //       docstring", the promise cannot be kept and we need to know from here.
    // HOW:  read the pickle argument and forward it on PRESENCE, never on truthiness.
    expect(notes).toBeDefined();
    expect(notes.docString).toBeDefined();
    expect(notes.docString.content).toBe("");
  });

  test("feature, Scenario Outline and Examples tags are unioned onto the pickle", () => {
    theAgreementIsObservable();
    // WHAT: the tags of one Examples-row pickle, and of a scenario carrying none of its own.
    // WHY:  tag filtering (a later value) decides what runs from exactly this set. A pickle
    //       that lost its feature tag, or never inherited its Examples tag, would silently
    //       filter the wrong scenarios.
    // HOW:  read pickle.tags; do not re-derive a scenario's tags from the AST.
    expect(
      pickleNamed("An incident is filed for rocket Falcon")[0].tags.map(
        (tag) => tag.name
      )
    ).toStrictEqual(["@fusion", "@outline", "@rows"]);
    expect(
      pickleNamed("Repeated title")[0].tags.map((tag) => tag.name)
    ).toStrictEqual(["@fusion"]);
  });

  test("every pickle step carries an astNodeId that resolves to an AST step with a Gherkin keyword", () => {
    theAgreementIsObservable();
    const keywords = keywordByAstStepId();

    const unresolved = [];
    const recovered = [];

    compiled.pickles.forEach((pickle) => {
      pickle.steps.forEach((step) => {
        const astStepId = (step.astNodeIds || []).find((id) =>
          keywords.has(id)
        );
        if (!astStepId) {
          unresolved.push(`${pickle.name} / ${step.text}`);
          return;
        }
        recovered.push(keywords.get(astStepId).trim());
      });
    });

    // WHAT: every step of every pickle, resolved back to an AST step and its keyword -- and
    //       the population it was drawn from, so an empty answer cannot pass for success.
    // WHY:  this package's step registry is keyed by Gherkin keyword, so an And definition
    //       binds only And steps. The pickle does not carry the keyword: step.type is only
    //       Context, Action or Outcome, and the And step below arrives as Context. astNodeIds
    //       is therefore the ONLY route back to the keyword a consumer registered against. If
    //       it ever stops being present, keyword-scoped binding cannot be implemented.
    // HOW:  index the parsed AST by step id, then resolve each pickle step's astNodeIds
    //       against that index and map the keyword through the Gherkin dialects.
    expect({
      unresolved,
      stepsExamined: recovered.length + unresolved.length,
    }).toStrictEqual({
      unresolved: [],
      stepsExamined: compiled.pickles.reduce(
        (total, pickle) => total + pickle.steps.length,
        0
      ),
    });
    expect(recovered).toContain("Given");
    expect(recovered).toContain("And");
    expect(
      compiled.pickles
        .flatMap((pickle) => pickle.steps)
        .every((step) => step.type === "Context")
    ).toBe(true);
  });
});
