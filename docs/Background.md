# Background

The examples on this page are ES modules, laid out as in [Getting Started](../README.md#getting-started). For CommonJS, see [Using CommonJS](./CommonJS.md).

A `Background` holds the steps that every scenario in a feature starts with, so you write them once. Fusion runs them at the start of each scenario's test, before that scenario's own steps. A `Rule` can have a `Background` of its own, for the scenarios inside it: those run the feature's `Background` first, then the rule's, then their own steps.

```gherkin
# filename: test/features/checkout.feature
Feature: Checkout

  Background:
    Given I am logged in
    And my basket holds a coffee mug

  Scenario: Paying by card
    When I pay by card
    Then an order is placed for a coffee mug

  Rule: A gift order carries a message

    Background:
      Given I mark the order as a gift

    Scenario: Adding a gift message
      When I add the gift message "Happy birthday"
      And I pay by card
      Then an order is placed for a coffee mug
      And the order carries the gift message "Happy birthday"
```

The code under test:

```javascript
// filename: src/checkout.js
export class Checkout {
    user = null
    products = []
    gift = false
    giftMessage = ''
    orders = []

    logIn( email ) {
        this.user = email
    }

    add( product ) {
        this.products.push( product )
    }

    pay() {
        this.orders.push( { products: [ ...this.products ], gift: this.gift, giftMessage: this.giftMessage } )
        this.products = []
    }
}
```

The step definitions cover the `Background` steps like any others: a `Background` step is an ordinary step, bound by its keyword, so `And my basket holds a coffee mug` needs an `And` definition. The `Before` hook gives each scenario a fresh checkout, and it runs before the `Background` steps.

```javascript
// filename: test/features/checkout.steps.js
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

When( 'I pay by card', () => {
    checkout.pay()
} )

And( 'I pay by card', () => {
    checkout.pay()
} )

Then( 'an order is placed for a coffee mug', () => {
    expect( checkout.orders ).toHaveLength( 1 )
    expect( checkout.orders[ 0 ].products ).toEqual( [ 'coffee mug' ] )
} )

And( /^the order carries the gift message "(.*)"$/, ( message ) => {
    expect( checkout.orders[ 0 ] ).toMatchObject( { gift: true, giftMessage: message } )
} )

Fusion( 'checkout.feature' )
```

This runs two tests: `Paying by card`, and `Adding a gift message`. Each test runs its `Background` steps again, from a fresh checkout, so one scenario never sees what another left behind. A failing `Background` step fails the test it ran in, and Jest names that step, as it would any other.

`I pay by card` is defined twice because the two scenarios write it with different keywords: `When` in the first, `And` in the second. To register one definition under both, use the chained form, `When( And( 'I pay by card', fn ) )` (see [Configuration options](./AdditionalConfiguration.md#what-the-package-exports)).

Next: [Rule](./Rule.md), for grouping scenarios under the business rule they illustrate.
