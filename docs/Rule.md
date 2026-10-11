# Rule

The examples on this page are ES modules, laid out as in [Getting Started](../README.md#getting-started). For CommonJS, see [Using CommonJS](./CommonJS.md).

A `Rule` groups the scenarios that illustrate one business rule, so a feature reads as a short list of rules, each with its examples. Fusion runs a scenario inside a `Rule` like any other: one Jest test, named after the scenario.

```gherkin
# filename: test/features/gift-cards.feature
Feature: Gift cards

  @balance
  Rule: A gift card cannot be spent beyond its balance

    Scenario: Spending part of the balance
      Given a gift card with a balance of $50
      When I spend $20
      Then the balance is $30

    Scenario: Spending more than the balance
      Given a gift card with a balance of $50
      When I try to spend $80
      Then the payment is refused
      But the balance is still $50

  @expiry
  Rule: An expired gift card cannot be used

    Scenario: Spending an expired card
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
- **Background.** A rule can have a `Background` of its own: see below.
- **`Example`.** Gherkin also accepts `Example:` in place of `Scenario:`, and the two run the same (see [Language](./Language.md#other-words-for-the-keywords-in-english)).

## A Background inside a Rule

A `Rule` can have a `Background` of its own, for the scenarios inside it. Those scenarios run the feature's `Background` first, then the rule's, then their own steps:

```gherkin
# filename: test/features/gift-orders.feature
Feature: Gift orders

  Background:
    Given I am logged in
    And my basket holds a coffee mug

  Rule: A gift order carries a message

    Background:
      Given I mark the order as a gift

    Scenario: Adding a gift message
      When I add the gift message "Happy birthday"
      And I pay by card
      Then an order is placed for a coffee mug
      And the order carries the gift message "Happy birthday"
```

The code under test is the `Checkout` from [Background](./Background.md), with a gift flag and a message:

```javascript
// filename: src/checkout.js
export class Checkout {
    user = null
    products = []
    orders = []
    gift = false
    giftMessage = ''

    logIn( email ) {
        this.user = email
    }

    add( product ) {
        this.products.push( product )
    }

    remove( product ) {
        this.products = this.products.filter( ( held ) => held !== product )
    }

    pay() {
        this.orders.push( { products: [ ...this.products ], gift: this.gift, giftMessage: this.giftMessage } )
        this.products = []
    }
}
```

```javascript
// filename: test/features/gift-orders.steps.js
import { Before, Given, When, Then, And, Fusion } from '@g_package/jest-cucumber-fusion'

import { Checkout } from '../../src/checkout.js'

let checkout

Before( () => {
    checkout = new Checkout()
} )

Given( 'I am logged in', () => {
    checkout.logIn( 'sam@example.com' )
} )

And( 'my basket holds a coffee mug', () => {
    checkout.add( 'coffee mug' )
} )

Given( 'I mark the order as a gift', () => {
    checkout.gift = true
} )

When( /^I add the gift message "(.*)"$/, ( message ) => {
    checkout.giftMessage = message
} )

And( 'I pay by card', () => {
    checkout.pay()
} )

Then( 'an order is placed for a coffee mug', () => {
    expect( checkout.orders[ 0 ].products ).toEqual( [ 'coffee mug' ] )
} )

And( /^the order carries the gift message "(.*)"$/, ( message ) => {
    expect( checkout.orders[ 0 ] ).toMatchObject( { gift: true, giftMessage: message } )
} )

Fusion( 'gift-orders.feature' )
```

This runs one test, `Adding a gift message`, whose steps run in that order: the feature's `Background`, the rule's, then the scenario's own.

Next: [Re-using step definitions](./ReusingStepDefinitions.md), to share steps between feature files.
