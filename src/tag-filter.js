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

const refusal = (expression, why) =>
  new Error(
    `Could not parse tag filter "${expression}".\n\n` +
      `WHY:  ${why}\n` +
      `HOW:  write a tag name as @name, and combine names with the operators "and", "or" and\n` +
      `      "not", grouping with parentheses "(" and ")". For example:\n` +
      `        @smoke and not @slow\n` +
      `        @shop and (@included or @draft)`
  );

const refuseUnparseableExpression = (expression, parseFailure) =>
  refusal(
    expression,
    `the tag expression parser could not read it: ${
      parseFailure && parseFailure.message ? parseFailure.message : parseFailure
    }\n` +
      `      The expression is lowercased before it is parsed, because tag matching ignores\n` +
      `      case, so the text quoted above may differ in case from what you wrote.`
  );

const refuseUntaggedOperand = (expression, operand) =>
  refusal(
    expression,
    `"${operand}" is not a tag. Every tag Fusion reads from a feature file starts with "@",\n` +
      `      so "${operand}" could never match, and the filter would quietly select no\n` +
      `      scenario. Did you mean "@${operand}"?`
  );

// Every operand of a parsed expression, read off its tree: an operand node carries its text as
// `value`, and every other node holds its operands in its own properties.
const operandsOf = (node) =>
  typeof node.value === "string"
    ? [node.value]
    : Object.values(node)
        .filter((child) => child !== null && typeof child === "object")
        .flatMap(operandsOf);

// The parser saw the lowercased expression; name the operand as the consumer wrote it when it can
// be found in their text, and as parsed otherwise (an escaped character, for one).
const asWritten = (expression, operand) => {
  const at = lowercased(expression).indexOf(operand);
  return at === -1
    ? operand
    : String(expression).slice(at, at + operand.length);
};

// Returns a predicate over a list of tag names, or raises the refusal if the expression cannot
// be read. Raising rather than answering false for everything is deliberate: an unparseable
// expression that quietly selected no scenario would exit 0 having run nothing, which is
// exactly what a correct filter selecting no scenario looks like.
//
// The parser accepts a bare word such as `smoke` as an operand, but no tag Gherkin hands Fusion
// lacks its "@", so such an operand can never match and leads to the same silent outcome. It is
// refused with the same first line, as 2.0.0 refused it (finding F1 of the PR #16 review).
const tagFilterFor = (expression, parseExpression) => {
  let parsed;

  try {
    parsed = parseExpression(lowercased(expression));
  } catch (parseFailure) {
    throw refuseUnparseableExpression(expression, parseFailure);
  }

  const untagged = operandsOf(parsed).find(
    (operand) => !operand.startsWith("@")
  );
  if (untagged !== undefined)
    throw refuseUntaggedOperand(expression, asWritten(expression, untagged));

  return (tagNames) => parsed.evaluate((tagNames || []).map(lowercased));
};

module.exports.tagFilterFor = tagFilterFor;
