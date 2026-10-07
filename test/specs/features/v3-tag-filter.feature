@shop
Feature: A tag filter decides which scenarios run

  The tags in this file are deliberately NOT written in the case a filter will
  be written in: @Included and @eXcluded. A filter spelled in lowercase can only
  select them if the TAGS are lowercased before matching, and a filter spelled in
  uppercase can only select them if the EXPRESSION is lowercased too. Between
  them the two filters the oracle passes need both sides normalised.

  The Examples set of the outline carries the tag rather than the outline, so a
  row is selected only if the tags a compiled pickle unions -- the scenario's,
  the feature's and the Examples set's -- are what the filter is evaluated
  against.

  @Included
  Scenario: A selected shopper buys a shirt
    Given the shop is open
    When the selected shopper buys a shirt

  @eXcluded
  Scenario: An excluded shopper buys a book
    Given the shop is open
    When the excluded shopper buys a book

  Scenario Outline: A selected shopper buys <item>
    Given the shop is open
    When the selected shopper buys a <item>

    @Included
    Examples:
      | item    |
      | sticker |
      | mug     |
