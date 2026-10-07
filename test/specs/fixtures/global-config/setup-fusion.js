/**
 * A consumer's Jest setup script, listed in setupFiles by jest.global.json.
 *
 * This is the whole point of value 5: the options are set HERE, once, and every step
 * definition file in the run gets them without naming them. Jest runs setupFiles inside the
 * same module registry it gives each test file, which is what makes this a per-file global
 * rather than shared mutable state.
 *
 * The setter is called TWICE on purpose. The second call must REPLACE the first, not merge
 * into it: the first sets a scenarioNameTemplate the second never mentions, so a merge would
 * leave that template in force and every test in the run would be reported under a `stale: `
 * name. Replace is also the only semantics under which a consumer can clear a global they set
 * earlier. The first call's tagFilter is the opposite selection as well, so a merge that let
 * the FIRST call win would invert both reports.
 */

const { setFusionConfiguration } = require("../../../../src");

setFusionConfiguration({
  scenarioNameTemplate: ({ scenarioTitle }) => `stale: ${scenarioTitle}`,
  tagFilter: "@excluded and not @included",
});

setFusionConfiguration({ tagFilter: "@included and not @excluded" });
