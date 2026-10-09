// How a refusal names a value the consumer handed Fusion: `<type> <value>`.
//
// JSON first, because that is the form the refusals have always printed (`string "x"`,
// `object ["@smoke"]`). JSON.stringify throws on a BigInt and on a circular object, and answers
// undefined for a function or a symbol, so those fall back to util.inspect: a refusal must never
// crash while naming what it refuses (finding F8 of the PR #16 review).
const { inspect } = require("util");

const asText = (value) => {
  try {
    const json = JSON.stringify(value);
    if (json !== undefined) return json;
  } catch {
    // Not serialisable as JSON; described below.
  }
  return inspect(value);
};

const describeValue = (value) => `${typeof value} ${asText(value)}`;

module.exports.describeValue = describeValue;
