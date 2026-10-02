Feature: Hooks run once per test

  Every Before and After hook runs exactly once around each test, however many
  scenarios and outlines the feature holds.

  Scenario: first scenario
    Given the hooks have run once for this test

  Scenario: second scenario
    Given the hooks have run once for this test

  Scenario: third scenario
    Given the hooks have run once for this test

  Scenario Outline: outline row <row>
    Given the hooks have run once for this test

    Examples:
      | row |
      | one |
      | two |
