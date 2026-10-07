Feature: A shop that cannot tell two of its scenarios apart

  Two titles are declared more than once. "Selling a shirt" three times, one of
  them differing only in case and one of them nested in a Rule, so the check has
  to compare case-insensitively and has to descend into a Rule. "Refunding a
  shirt" twice, so one refusal has to name every duplicated title rather than
  the first it meets.

  Scenario: Selling a shirt
    Given the shop is open

  Scenario: selling a shirt
    Given the shop is open

  Scenario: Refunding a shirt
    Given the shop is open

  Scenario: Refunding a shirt
    Given the shop is open

  Rule: A refund is a sale in reverse

    Scenario: Selling a shirt
      Given the shop is open
