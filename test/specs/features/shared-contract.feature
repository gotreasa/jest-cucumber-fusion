Feature: A feature file reaches the step definitions that bind it

  Every shape this package promises to carry from a feature file to a step
  function appears once here: a feature Background, a Rule with a Background of
  its own, a data table, an And step and a But step that must each reach their
  own keyword's definition, and a Scenario Outline row whose step carries an
  empty docstring.

  Background:
    Given the ground crew is on station

  Scenario: A launch runs the keyword-scoped definition that owns each of its steps
    Given the launch pad is clear
    And the countdown has been announced
    But the weather hold has been lifted
    Then only the feature background step, the launch pad step, the countdown step and the weather hold step have run

  Rule: A grounded rocket is inspected before it flies again

    Background:
      Given the inspection log is open

    Scenario: An inspection reads the crew roster attached to its step
      Given 2 crew are listed on the roster:
        | Name  | Role     |
        | Ada   | pilot    |
        | Grace | engineer |
      Then only the feature background step, the rule background step and the crew roster step have run
      And the roster step received the crew count and then the roster as header-keyed rows

    Scenario Outline: An incident is filed for rocket <rocket>
      Given an incident is filed for rocket "<rocket>" with these notes:
        """
        """
      Then the incident step received the rocket "<rocket>" and then the empty notes

      Examples:
        | rocket |
        | Falcon |
        | Vega   |
