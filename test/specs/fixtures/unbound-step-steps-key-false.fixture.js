/**
 * A consumer file, driven by test/specs/baseline/assert-validation-report.js.
 *
 * Two observations, because they are two halves of one promise about a PARTLY written errors
 * object:
 *
 *   1. naming stepsMustMatchFeatureFile false does what errors false does for the step check
 *      -- the unwired scenario becomes a visible skipped test, read from Jest's own report;
 *   2. naming that one key does NOT also switch off the key the consumer never mentioned. The
 *      duplicate-title check is gated by scenariosMustMatchFeatureFile, so with a key-wise
 *      merge over the defaults it is still on, and a feature declaring two scenarios of the
 *      same title is still refused. If an object-valued errors REPLACED the defaults, the
 *      consumer would silently lose that check by asking about a different one.
 *
 * The second is asserted here rather than in the script because it is a refusal out of a
 * second Fusion call, which only a test body can catch without failing the file.
 */

import { Given, Fusion } from "../../../src/index.js";

Given("the shop is open", () => {});

Fusion("unbound-step.feature", {
  errors: { stepsMustMatchFeatureFile: false },
});

test("naming one errors key leaves the key the consumer did not name alone", () => {
  let refusal = null;
  try {
    Fusion("duplicate-titles.feature", {
      errors: { stepsMustMatchFeatureFile: false },
    });
  } catch (thrown) {
    refusal = thrown;
  }

  // WHAT: a feature with duplicated declared titles is still refused, by name, when the only
  //       errors key the consumer wrote was stepsMustMatchFeatureFile.
  // WHY:  a consumer switching off the step check has said nothing about the duplicate check.
  //       Losing it silently is a validation that disappears without being asked, and the
  //       refusal here must be the DUPLICATE one, not an unmatched-step refusal, or the
  //       observation would pass for the wrong reason.
  // HOW:  merge an object-valued errors key-wise over the defaults instead of replacing them.
  expect(refusal).not.toBeNull();
  expect(refusal.message.toLowerCase()).toContain("selling a shirt");
  expect(refusal.message).toContain("scenariosMustMatchFeatureFile");
});
