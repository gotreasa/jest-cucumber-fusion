Feature: An unbound step hands back the code that would bind it

  One step of this feature has a definition. The other six deliberately have
  none, and between them they cover every shape the starter code has to deal
  with: plain text, text carrying a number, text carrying a double-quoted
  substring, a step with a data table, a step with a docstring, and an And step
  whose verb is not the one above it.

  Scenario: The shop opens with stock nobody has described
    Given the shop is open
    Given the shop is closed
    Given 3 shirts are in stock
    Given the shopper wants "Rick Astley t-shirt"

  Scenario: The shopper leaves instructions nobody reads
    When the shopper adds 2 of these items:
      | item                | quantity |
      | Rick Astley t-shirt | 2        |
    When the shopper leaves this note:
      """
      gift wrap it
      """
    And the receipt is printed
