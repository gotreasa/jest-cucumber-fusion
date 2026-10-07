Feature: A shop with an excluded half-written scenario

  The @excluded scenario ends on a step nobody has written a definition for.
  Excluding a half-written scenario is one of the main reasons to reach for a tag
  filter, so with the step check at its default the filter must exempt that
  scenario from the unbound-step refusal -- and still report it, once, as a
  skipped test. Its @included sibling binds completely and must run.

  @included
  Scenario: A selected shopper buys a shirt
    Given the shop is open

  @excluded
  Scenario: An excluded shopper does something nobody wired
    Given the shop is open
    Given nobody has written this step yet
