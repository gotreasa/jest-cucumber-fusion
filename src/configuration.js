// The option defaults, the global layer and the merge, owned here rather than by the removed
// intermediary, whose configuration module did exactly this (configuration.js:26-36: the
// defaults, the global object, then the per-call options, with `errors: true` expanded).
//
// Three layers, lowest first: the defaults, the global a consumer sets once through
// setFusionConfiguration, and the options passed to one Fusion() call. The per-call layer wins,
// which is the precedence the documentation has always stated.
//
// WHY A MODULE-LEVEL VARIABLE IS SAFE HERE. Jest builds a fresh module registry for each test
// file and runs setupFiles inside it, so the global a setup script sets is visible to that
// file's Fusion calls and cannot reach another file. It is per-file configuration, not shared
// mutable state, and that is the whole reason this option can be set in one place.

// Fusion's three validation keys. stepsMustMatchFeatureFile decides between the
// unmatched-step refusal and a visible skipped test; scenariosMustMatchFeatureFile gates the
// duplicate declared-title check; allowScenariosNotInFeatureFile is accepted and vestigial,
// because Fusion generates the scenario definitions from the feature file itself and so has
// no scenario outside it to allow.
const everyValidation = (on) => ({
  stepsMustMatchFeatureFile: on,
  scenariosMustMatchFeatureFile: on,
  allowScenariosNotInFeatureFile: on,
});

// Validation is ON by default: an unmatched step fails loudly, and a duplicated declared
// title is refused, unless the consumer asks otherwise.
const defaultOptions = () => ({
  errors: everyValidation(true),
  tagFilter: undefined,
  scenarioNameTemplate: undefined,
});

// An option whose value is `undefined` is NOT SET, at every layer and inside `errors`, so it
// never overrides the layer below. Forwarding an unset environment variable,
// `{ tagFilter: process.env.TAGS }`, is the ordinary way to write one, and a key-wise
// Object.assign would otherwise copy that `undefined` over a global the consumer set on purpose
// (finding F4 of the PR #16 review). `errors: undefined` already meant "no change"; this makes
// every key agree with it.
const keysThatAreSet = (options) =>
  Object.fromEntries(
    Object.entries(options).filter(([, value]) => value !== undefined)
  );

// What ONE layer's `errors` contributes, in the three forms a consumer may write it:
//
//   true        -> every key on. An explicit reset of all three.
//   false       -> every key off. The same shorthand in the other direction.
//   { one key } -> ONLY that key. Naming one validation says nothing about the others, so the
//                  keys it did not mention keep whatever the layer below set.
//
// Returning only the named keys is what makes the layers compose. Expanding a partial object
// over all-true here instead would let a per-call object naming one key silently switch a
// DIFFERENT key back on, undoing a global the consumer set deliberately.
const errorsNamedBy = (errors) => {
  if (errors === true) return everyValidation(true);
  if (errors === false) return everyValidation(false);

  return keysThatAreSet(errors || {});
};

// The middle layer. Replaced wholesale by each setFusionConfiguration call, never merged into:
// replace is what the previous setter did, and it is the only semantics under which a consumer
// can CLEAR a global they set earlier.
let globalOptions = {};

const isAnOptionObject = (candidate) =>
  typeof candidate === "object" &&
  candidate !== null &&
  !Array.isArray(candidate);

const refuseNonOptionObject = (whatItWasGiven) =>
  new Error(
    `setFusionConfiguration needs an options object.\n\n` +
      `WHAT: it was given ${typeof whatItWasGiven} ${JSON.stringify(
        whatItWasGiven
      )}.\n` +
      `WHY:  the argument is merged under every Fusion() call of this test file, so anything\n` +
      `      that is not an options object leaves the whole file silently unconfigured, and\n` +
      `      the mistake then looks like a bug in the feature files.\n` +
      `HOW:  pass the same object a Fusion() call accepts, for example\n` +
      `      setFusionConfiguration({ tagFilter: "@smoke and not @slow" }). The accepted keys\n` +
      `      are errors, tagFilter, scenarioNameTemplate and loadRelativePath; an unknown key\n` +
      `      is ignored, exactly as it is per call.`
  );

// Refused here, at the call, because that is the one place and time the consumer can act: a
// setup script runs before any step definition file loads.
const setFusionConfiguration = (optionsForEveryFusionCall) => {
  if (!isAnOptionObject(optionsForEveryFusionCall))
    throw refuseNonOptionObject(optionsForEveryFusionCall);

  // Copied, so the stored global is ours: a consumer who later mutates the object they passed
  // does not silently reconfigure the rest of their file.
  globalOptions = Object.assign({}, optionsForEveryFusionCall);
};

// `errors` is merged key-wise ACROSS the layers, not layer-over-layer as a whole value, which
// is the same promise value 2 made within one layer: naming one validation says nothing about
// the others, whichever layer named it. A top-level Object.assign would instead replace a
// global errors object wholesale with a per-call one, losing a key the consumer only mentioned
// once.
//
// The result always carries all three keys, because the fold starts from them. So no reader
// downstream has to know that `errors` has three spellings or three layers.
const errorsAcross = (layers) =>
  layers.reduce(
    (merged, layer) =>
      Object.prototype.hasOwnProperty.call(layer, "errors")
        ? Object.assign(merged, errorsNamedBy(layer.errors))
        : merged,
    everyValidation(true)
  );

const mergeFusionOptions = (perCallOptions) => {
  const perCall = perCallOptions || {};
  // Lowest to highest, and a fresh object every call: the per-call options are never written
  // into the global, so one file's option cannot configure another file of the same run.
  const merged = Object.assign(
    defaultOptions(),
    keysThatAreSet(globalOptions),
    keysThatAreSet(perCall)
  );

  return Object.assign(merged, {
    errors: errorsAcross([globalOptions, perCall]),
  });
};

module.exports.setFusionConfiguration = setFusionConfiguration;
module.exports.mergeFusionOptions = mergeFusionOptions;
