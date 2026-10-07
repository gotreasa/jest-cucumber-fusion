/**
 * A consumer's Jest setup script that calls the setter with something that is not an option
 * object, listed in setupFiles by jest.invalid.json.
 *
 * The refusal has to happen HERE, where the mistake was made, and fail the run before any step
 * definition file loads: that is the only place and time a consumer can act on it. A string
 * quietly accepted as a configuration would leave every Fusion call in the run silently
 * unconfigured, and the consumer looking for a bug in their feature files.
 */

const { setFusionConfiguration } = require("../../../../src");

// Built at run time rather than written as a literal, deliberately. Jest prints a code frame
// of this file when a setup script fails, so a literal would appear in the failure text
// whatever went wrong -- and an assertion that the refusal "names what it received" would then
// be satisfied by Jest quoting the source. Joined here, the contiguous string exists only at
// run time, so it can only reach the failure text if the refusal actually put it there.
setFusionConfiguration(["not", "an", "option", "object"].join(" "));
