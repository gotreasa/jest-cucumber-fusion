Feature: A shop with one unwired scenario

  Two scenarios. The first binds completely. The second ends on a step no
  definition owns, so it is the one the errors option decides the fate of, and
  the first is the sibling that must keep running either way.

  Scenario: Opening the shop
    Given the shop is open

  Scenario: Closing the shop
    Given the shop is open
    Given the shop is closed
