/**
 * A consumer step definition file in the same run that passes its OWN tagFilter, selecting the
 * opposite scenario to the global one.
 *
 * Two things are observable only because the selection is inverted rather than merely
 * different. This file's report proves the per-call option beat the global for this file; and
 * its SIBLING's report, in the same run, proves this file's option did not leak into it. A
 * global stored where a per-call option cannot override it, and a per-call option written into
 * the global, are both visible as one of the two reports being the wrong way round.
 */

import { Given, Fusion } from "../../../../src/index.js";

Given("the shop is open", () => {});

Fusion("tagged.feature", { tagFilter: "@excluded and not @included" });
