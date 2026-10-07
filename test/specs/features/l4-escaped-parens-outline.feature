Feature: A step matcher with escaped parentheses binds in an outline

  Driven by test/specs/features/step-definitions/l4-escaped-parens-outline.steps.js.

  The definition that binds every step below is /^I call the function (\w+\(\))$/ — "capture a
  word followed by a literal ()". Inside a Scenario Outline that matcher used to crash the
  whole suite with a TypeError, while the IDENTICAL matcher against a plain Scenario worked;
  the plain Scenario here is the CONTROL that pins the half which already worked.

  Each Examples row must run the bound step with ITS OWN value: a binding that pre-captured
  one row's value for every row would pass the first row and fail the second.

  Scenario: The same matcher in a plain scenario
    Given I call the function test()
    Then the function step received "test()"

  Scenario Outline: A function call is made, row by row
    Given I call the function <func>
    Then the function step received "<func>"

    Examples:
      | func       |
      | process()  |
      | validate() |
