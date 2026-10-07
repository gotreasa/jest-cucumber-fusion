Feature: One outline, three rows, one declared title

  The declared title holds no angle-bracket placeholder, so all three Examples
  rows generate the same test name. That is exactly the shape of
  test/specs/features/scenario-outlines.feature:16-26, whose three identically
  named tests are recorded in the 2.0.0 baseline, so this file must be ACCEPTED
  under the default. It is a duplicate only if the check counts generated names
  instead of declared definitions.

  Scenario Outline: Selling all of one
    Given the shop is open

    Examples:
      | item    |
      | shirt   |
      | book    |
      | sticker |
