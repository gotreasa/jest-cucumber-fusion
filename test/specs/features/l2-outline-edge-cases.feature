Feature: An outline step binds on its substituted text

  Driven by test/specs/features/step-definitions/l2-outline-edge-cases.steps.js.

  Each Scenario Outline below carries a step whose definition regex has a capturing-group
  shape that the deleted matching heuristic used to read by its SPELLING rather than by its
  presence: a literal alternation group, a bounded quantifier, and the two crossover shapes
  that straddle both. Each one failed to bind before the heuristic was fixed, and the
  heuristic is now gone entirely — the step text reaching the matcher already carries this
  row's value, so every one of them is an ordinary match.

  The step wordings are deliberately all different: two definitions that both matched one
  step text would be refused as ambiguous, which is a different promise than this file makes.

  Scenario Outline: A literal alternation group in the fixed part of the step binds
    Given the <colour> lamp is on
    Then the lamp step received "<colour>" and "on"

    Examples:
      | colour |
      | red    |

  Scenario Outline: A bounded-quantifier group binds
    Given the access code is <code>
    Then the access step received "<code>"

    Examples:
      | code |
      | 1234 |

  Scenario Outline: A bounded quantifier whose group also holds a legacy-detector character binds
    Given the door code is <code>
    Then the door step received "<code>"

    Examples:
      | code |
      | ab12 |

  Scenario Outline: A literal alternation holding none of the legacy-detector characters binds
    Given the <channel> release is v1
    Then the release step received "<channel>" and "v1"

    Examples:
      | channel |
      | beta    |
