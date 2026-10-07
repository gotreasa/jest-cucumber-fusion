Feature: A shop whose scenarios are tagged

  One @included scenario and one @excluded scenario, the shape the value text
  names. The tags are written in plain lowercase here, so a filter written in a
  different case can only select them if the EXPRESSION is lowercased before
  matching -- the direction the mixed-case fixture drives. The other direction,
  a lowercase filter against tags written in another case, is driven by the
  oracle's own feature.

  @included
  Scenario: A selected shopper buys a shirt
    Given the shop is open

  @excluded
  Scenario: An excluded shopper buys a book
    Given the shop is open
