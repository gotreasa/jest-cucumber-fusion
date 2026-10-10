/**
 * A consumer file, driven by test/specs/baseline/assert-validation-report.js.
 *
 * It leaves `errors` alone, so the step check is on and the unbound step in
 * "Closing the shop" must stop the whole file at collection. The refusal is NOT caught here:
 * the point of this fixture is what a consumer SEES in Jest's own report, so the run has to
 * fail and carry the refusal, starter code included.
 *
 * `.fixture.js`, not `.steps.js`: the repository runner selects every .steps.js file, and a
 * file that must fail collection would break the whole-repository vector if it were collected.
 */

import { Given, Fusion } from "../../../src/index.js";

Given("the shop is open", () => {});

Fusion("unbound-step.feature");
