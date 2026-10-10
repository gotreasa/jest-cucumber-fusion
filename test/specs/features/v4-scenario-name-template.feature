@Shop
Feature: A template names every test

  Every tag here is written with a capital letter, so a template that receives
  them as written rather than lowercased fails the oracle's assertions. The
  Examples set carries a tag of its own, which an outline row's scenarioTags has
  to contain, and the feature's tag has to appear in featureTags and nowhere
  else.

  @Checkout
  Scenario: A shopper pays at the till
    Given the shop is open

  @Stockroom
  Scenario Outline: A shopper collects <item>
    Given the shop is open

    @Online
    Examples:
      | item    |
      | shirt   |
      | sticker |
