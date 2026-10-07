// A Gherkin step keyword, in whatever dialect the feature file declared, resolved onto the
// one registry bucket that owns it.
//
// WHY THIS MODULE EXISTS. Compiled pickles throw the keyword away: a PickleStep carries only
// `type: "Context" | "Action" | "Outcome"`, and an `And` step arrives as Context. The registry
// is keyed by keyword, so an `And` definition must bind only `And` steps — which means the
// keyword has to come back from the parsed AST and then be mapped through the dialect that
// spelled it. This module owns that map and nothing else; it is pure, and it never sees a
// pickle, a file or a parser.

// The bucket order IS the resolution order. A dialect that spells one word in two lists —
// several do — therefore still yields exactly one bucket, deterministically.
const BUCKETS = ["given", "when", "then", "and", "but"];

// Legal in every dialect and in none of the five buckets. It is listed in all five dialect
// arrays, so a plain lookup would silently answer "given"; refusing by name is the only
// honest answer, and it is a refusal rather than a guess.
const UNBUCKETED_KEYWORD = "*";

const asComparable = (keyword) => String(keyword).trim();

const refuseUnsupportedKeyword = (keyword, language) => {
  throw new Error(
    `Unsupported step keyword: "${asComparable(keyword)}"` +
      (language ? ` in the "${language}" Gherkin dialect` : "") +
      `. Fusion binds step definitions by keyword, and only ${BUCKETS.join(
        ", "
      )} have a registry to bind in. Rewrite the step with one of those keywords.`
  );
};

// Returns one of the five buckets, or throws. There is no third answer, which is what keeps
// an invalid keyword from ever reaching the registry lookup — the bare TypeError an asterisk
// step used to raise there came from exactly that gap.
const bucketForKeyword = (keyword, dialect, language) => {
  const comparable = asComparable(keyword);

  if (comparable === UNBUCKETED_KEYWORD || comparable === "")
    refuseUnsupportedKeyword(keyword, language);

  const bucket = BUCKETS.find((candidate) =>
    (dialect[candidate] || [])
      .map(asComparable)
      .some(
        (dialectKeyword) =>
          dialectKeyword !== UNBUCKETED_KEYWORD && dialectKeyword === comparable
      )
  );

  if (!bucket) refuseUnsupportedKeyword(keyword, language);

  return bucket;
};

module.exports.bucketForKeyword = bucketForKeyword;
