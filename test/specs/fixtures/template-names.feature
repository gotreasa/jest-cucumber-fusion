@shop
Feature: Named by a template

  A plain scenario, a second plain scenario a tag filter can exclude, and an
  outline with two Examples rows whose generated names differ. Three of the four
  tests this declares are selected by @included, which is what lets one feature
  serve both the untagged templated run and the templated run with a filter.

  @included
  Scenario: A shopper pays at the till
    Given the shop is open

  @excluded
  Scenario: A shopper leaves empty handed
    Given the shop is open

  @included
  Scenario Outline: A shopper collects <item>
    Given the shop is open

    Examples:
      | item    |
      | shirt   |
      | sticker |
