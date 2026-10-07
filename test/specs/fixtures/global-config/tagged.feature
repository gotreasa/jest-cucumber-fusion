Feature: A shop configured from one place

  Two scenarios, one of each tag, driven by two consumer files in the same run:
  one that passes no options at all and must get its selection from the global,
  and one that passes its own tagFilter selecting the OPPOSITE scenario. The two
  reports therefore have to be exact mirrors of each other, which is what makes
  a global that overrides a per-call option, or a per-call option that leaks into
  another file, visible.

  @included
  Scenario: A selected shopper buys a shirt
    Given the shop is open

  @excluded
  Scenario: An excluded shopper buys a book
    Given the shop is open
