# Rule

The examples on this page are ES modules, laid out as in [Getting Started](../README.md#getting-started). For CommonJS, see [Using CommonJS](./CommonJS.md).

A `Rule` groups the scenarios that illustrate one business rule, so a feature reads as a short list of rules, each with its examples. Fusion runs a scenario inside a `Rule` like any other: one Jest test, named after the scenario.

```gherkin
# filename: test/features/gift-cards.feature
Feature: Gift cards

  @balance
  Rule: A gift card cannot be spent beyond its balance

    Example: Spending part of the balance
      Given a gift card with a balance of $50
      When I spend $20
      Then the balance is $30

    Example: Spending more than the balance
      Given a gift card with a balance of $50
      When I try to spend $80
      Then the payment is refused
      But the balance is still $50

  @expiry
  Rule: An expired gift card cannot be used

    Example: Spending an expired card
      Given an expired gift card with a balance of $50
      When I try to spend $10
      Then the payment is refused
```

The code under test:

```javascript
// filename: src/gift-card.js
export class GiftCard {
    constructor( balance, expired = false ) {
        this.balance = balance
        this.expired = expired
    }

    spend( amount ) {
        if ( this.expired || amount > this.balance ) return false
        this.balance -= amount
        return true
    }
}
```

The step definitions do not mention the rules: a step inside a `Rule` binds as it would anywhere else. `But the balance is still $50` starts with `But`, so its definition is `But(...)`:

```javascript
// filename: test/features/gift-cards.steps.js
import { Given, When, Then, But, Fusion } from '@g_package/jest-cucumber-fusion'

import { GiftCard } from '../../src/gift-card.js'

let card
let accepted

Given( /^a gift card with a balance of \$(\d+)$/, ( balance ) => {
    card = new GiftCard( Number( balance ) )
} )

Given( /^an expired gift card with a balance of \$(\d+)$/, ( balance ) => {
    card = new GiftCard( Number( balance ), true )
} )

When( /^I (?:try to )?spend \$(\d+)$/, ( amount ) => {
    accepted = card.spend( Number( amount ) )
} )

Then( /^the balance is \$(\d+)$/, ( balance ) => {
    expect( card.balance ).toBe( Number( balance ) )
} )

Then( 'the payment is refused', () => {
    expect( accepted ).toBe( false )
} )

But( /^the balance is still \$(\d+)$/, ( balance ) => {
    expect( card.balance ).toBe( Number( balance ) )
} )

Fusion( 'gift-cards.feature' )
```

This runs three tests: `Spending part of the balance`, `Spending more than the balance` and `Spending an expired card`.

- **Names.** A test is named after its scenario, not its rule, so give every scenario in a feature its own title: two scenarios of one title are refused, even in different rules (see [Configuration options](./AdditionalConfiguration.md#scenariosmustmatchfeaturefile)).
- **Tags.** A rule's tags reach every scenario inside it, so a [tag filter](./AdditionalConfiguration.md#tag-filtering) of `@expiry` runs only the last scenario, and a [scenario title template](./AdditionalConfiguration.md#scenario-title-templates) receives `@expiry` in `scenarioTags`.
- **Background.** A rule can have a `Background` of its own, for the scenarios inside it: see [Background](./Background.md).

Next: [Gherkin tables](./GherkinTables.md), for steps that carry a table.
