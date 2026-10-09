/**
 * A consumer file, driven by test/specs/baseline/assert-validation-report.js.
 *
 * The same feature as unbound-step-default.fixture.js, with the shorthand `errors: false`.
 * Switching validation off must make the unwired scenario a VISIBLE skipped test, never a
 * passing one and never an absent one, and must leave the sibling that does bind running
 * normally. Nothing is asserted in this file: the observation is Jest's own report, read by
 * the script, because a spy would only prove Fusion called a function.
 */

import { Given, Fusion } from "../../../src/index.js";

Given("the shop is open", () => {});

Fusion("unbound-step.feature", { errors: false });
