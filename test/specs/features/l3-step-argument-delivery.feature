Feature: Step arguments reaching a step definition

  Scenario: A step matched on its captures receives the incident notes attached to it
    When I file an incident for rocket "Falcon" with the following notes:
      """
      Engine 3 shut down at T+42 seconds
      """
    Then the incident step should have received the rocket "Falcon" and then the notes "Engine 3 shut down at T+42 seconds"

  Scenario: A step matched on its exact wording receives the incident notes attached to it
    When I file an incident for the flagship rocket with the following notes:
      """
      Engine 3 shut down at T+42 seconds
      """
    Then the flagship incident step should have received only the notes "Engine 3 shut down at T+42 seconds"

  Scenario: A step matched on its captures receives the crew table attached to it
    When I assign 2 crew to rocket "Falcon":
      | Name  | Role     |
      | Ada   | pilot    |
      | Grace | engineer |
    Then the crew step should have received the count "2" and the rocket "Falcon" and then the crew table

  Scenario: A step matched on its captures with nothing attached does not receive a phantom extra argument
    When I ground rocket "Falcon"
    Then the grounding step should have received only the rocket "Falcon"

  Scenario: A step matched on its captures receives empty incident notes attached to it
    When I file an incident for rocket "Falcon" with the following notes:
      """
      """
    Then the incident step should have received the rocket "Falcon" and then empty notes

  Scenario Outline: A step of an outline receives the incident notes attached to it, written for rocket <rocket>
    When I file an incident for rocket "<rocket>" with the following notes:
      """
      <rocket> shut down engine 3 at T+42 seconds
      """
    Then the outline incident step should have received the rocket "<rocket>" and then its own notes

    Examples:
      | rocket |
      | Falcon |
      | Vega   |
