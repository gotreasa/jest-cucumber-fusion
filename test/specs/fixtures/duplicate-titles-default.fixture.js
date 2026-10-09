/**
 * A consumer file, driven by test/specs/baseline/assert-validation-report.js.
 *
 * Every step of duplicate-titles.feature binds, so the only thing wrong with the file is that
 * it declares two titles more than once. Under the default that must stop the file at
 * collection, before any describe, so no test of it runs: Fusion generates one test per
 * scenario, and two tests of one name cannot be told apart in a report.
 *
 * The refusal is not caught here -- the run must fail and carry it.
 */

import { Given, Fusion } from "../../../src/index.js";

Given("the shop is open", () => {});

Fusion("duplicate-titles.feature");
