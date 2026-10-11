Feature: Scenario outline mixing values

    # Carried over from scenario-outlines.feature, where the original package left it commented
    # out as "not currently possible": one step mixes outline placeholders with fixed text, a
    # dollar amount and a currency between them. Fusion matches each row's substituted text, so
    # it runs. It lives in its own file because scenario-outlines.feature is recorded in the
    # 2.0.0 test-name baseline, whose list of names must not change.
    Scenario Outline: Additional mix regexp and non-regexp in outline line with non-string variables and static one in the middle for <Item>
        Given I want to sell all my <Item>
        When I sell all my <Item> with a starting price <Description> price of <RebatePrice>$ <Currency> which is nice
        Then I should still get $<Amount>

        Examples:
            | Item                                           | Description                  | RebatePrice   | Amount | Currency         |
            | Autographed Neil deGrasse Tyson book           | of $100 at the fantastic     | 20            | 20     | USD              |
            | Rick Astley t-shirt                            | of $100 at the fantastic     | 50            | 50     | CAD              |
            | Rick Astley t-shirt                            | of $100 at the rebate        | 50            | 50     | CAD              |
