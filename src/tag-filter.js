// Whether a scenario's tags satisfy a tagFilter expression.
//
// This module owns the NORMALISATION and the predicate. It does not own the expression
// language: the parse function arrives as an argument from src/feature-source.js, which is the
// one module the architectural law lets reach the cucumber scope
// (test/specs/arch/dependency-direction.steps.js). That injection is why this module requires
// nothing at all, and so can be read and reasoned about without a parser, a file or a runner.

// Both sides are lowercased before they meet, which is the whole of the normalisation and the
// reason matching ignores case. Lowercasing the expression lowercases its OPERATORS too, so an
// expression written `@a AND @b` parses here where the previous engine's case-sensitive
// rewriter rejected it. That widening is strict: every expression that worked before still
// works.
const lowercased = (text) => String(text).toLowerCase();

const refuseUnparseableExpression = (expression, parseFailure) =>
  new Error(
    `Could not parse tag filter "${expression}".\n\n` +
      `WHY:  the tag expression parser could not read it: ${
        parseFailure && parseFailure.message
          ? parseFailure.message
          : parseFailure
      }\n` +
      `      The expression is lowercased before it is parsed, because tag matching ignores\n` +
      `      case, so the text quoted above may differ in case from what you wrote.\n` +
      `HOW:  write a tag name as @name, and combine names with the operators "and", "or" and\n` +
      `      "not", grouping with parentheses "(" and ")". For example:\n` +
      `        @smoke and not @slow\n` +
      `        @shop and (@included or @draft)`
  );

// Returns a predicate over a list of tag names, or raises the refusal if the expression cannot
// be read. Raising rather than answering false for everything is deliberate: an unparseable
// expression that quietly selected no scenario would exit 0 having run nothing, which is
// exactly what a correct filter selecting no scenario looks like.
const tagFilterFor = (expression, parseExpression) => {
  let parsed;

  try {
    parsed = parseExpression(lowercased(expression));
  } catch (parseFailure) {
    throw refuseUnparseableExpression(expression, parseFailure);
  }

  return (tagNames) => parsed.evaluate((tagNames || []).map(lowercased));
};

module.exports.tagFilterFor = tagFilterFor;
