Feature: Scenario outline mixing values

    # Proves that one step combining several placeholders with literal text, including a $ sign
    # and a currency code, is matched after each row's values are substituted. Version 2.0.0
    # matched the template text instead and refused this step as ambiguous.
    #
    # Carried over from scenario-outlines.feature, where the original package left it commented
    # out as "not currently possible". The title, the deliberately awkward step wording and the
    # rows are kept exactly as written there, so rows 2 and 3 share a test name. It lives in its
    # own file because scenario-outlines.feature is recorded in the 2.0.0 test-name baseline,
    # whose list of names must not change.
    Scenario Outline: Additional mix regexp and non-regexp in outline line with non-string variables and static one in the middle for <Item>
        Given I want to sell all my <Item>
        When I sell all my <Item> with a starting price <Description> price of <RebatePrice>$ <Currency> which is nice
        Then I should still get $<Amount>

        Examples:
            | Item                                           | Description                  | RebatePrice   | Amount | Currency         |
            | Autographed Neil deGrasse Tyson book           | of $100 at the fantastic     | 20            | 20     | USD              |
            | Rick Astley t-shirt                            | of $100 at the fantastic     | 50            | 50     | CAD              |
            | Rick Astley t-shirt                            | of $100 at the rebate        | 50            | 50     | CAD              |
