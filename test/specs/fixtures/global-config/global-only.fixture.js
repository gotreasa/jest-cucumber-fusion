/**
 * A consumer step definition file that passes NO options at all.
 *
 * Everything it is configured with reaches it from the setup script listed in setupFiles. If
 * the global layer is missing, or is read after the per-call options instead of before them,
 * this file runs both scenarios and the selection it is supposed to inherit never happens.
 */

const { Given, Fusion } = require("../../../../src");

Given("the shop is open", () => {});

Fusion("tagged.feature");
