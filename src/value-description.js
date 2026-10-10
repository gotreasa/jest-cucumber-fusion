// How a refusal names a value the consumer handed Fusion: `<type> <value>`.
//
// JSON first, because that is the form the refusals have always printed (`string "x"`,
// `object ["@smoke"]`). JSON.stringify throws on a BigInt and on a circular object, and answers
// undefined for a function or a symbol, so those fall back to util.inspect: a refusal must never
// crash while naming what it refuses (finding F8 of the PR #16 review).
import { inspect } from "util";

const asText = (value) => {
  try {
    const json = JSON.stringify(value);
    if (json !== undefined) return json;
  } catch {
    // Not serialisable as JSON; described below.
  }
  try {
    return inspect(value);
  } catch {
    // A custom inspect hook that throws: say so rather than let the refusal crash.
    return "(a value that cannot be printed)";
  }
};

const describeValue = (value) => `${typeof value} ${asText(value)}`;

// How a report quotes what the consumer's code threw: its message when that is truthy,
// otherwise the value itself, as text. textOf is the text step alone, for a value already known
// to be the message.
//
// A template literal cannot make text of a Symbol, of an object with no prototype, or of an
// object whose message getter or toString throws, so quoting those crashed the report and the
// consumer saw a TypeError instead of their own failure (the PR #36 fuzz run). String() makes
// the same text as a template literal for everything else and accepts a Symbol; anything still
// unprintable is named as describeValue names it. The message is read once, so a getter that
// answers differently each time cannot be quoted as one thing and checked as another.
const textOf = (value) => {
  try {
    return String(value);
  } catch {
    return describeValue(value);
  }
};

const describeThrown = (thrown) => {
  let message;
  try {
    message = thrown == null ? undefined : thrown.message;
  } catch {
    return describeValue(thrown);
  }
  return textOf(message ? message : thrown);
};

export { describeThrown, describeValue, textOf };
