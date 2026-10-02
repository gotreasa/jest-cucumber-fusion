Feature: Hooks run once per test in an outline-only feature

  A feature with no plain scenario must still wire its hooks, once per example row.

  Scenario Outline: outline-only row <row>
    Given the outline-only hooks have run once for this row

    Examples:
      | row   |
      | one   |
      | two   |
      | three |
