# Background

The examples on this page are ES modules, laid out as in [Getting Started](../README.md#getting-started). For CommonJS, see [Using CommonJS](./CommonJS.md).

A `Background` holds the steps that every scenario in a feature starts with, so you write them once. Fusion runs them at the start of each scenario's test, before that scenario's own steps.

```gherkin
# filename: test/features/checkout.feature
Feature: Checkout

  Background:
    Given I am logged in
    And my basket holds a coffee mug

  Scenario: Paying by card
    When I pay by card
    Then an order is placed for a coffee mug

  Scenario: Removing the last product
    When I remove the coffee mug
    Then my basket is empty
```

The code under test:

```javascript
// filename: src/checkout.js
export class Checkout {
    user = null
    products = []
    orders = []

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
        this.orders.push( { products: [ ...this.products ] } )
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

When( 'I pay by card', () => {
    checkout.pay()
} )

When( 'I remove the coffee mug', () => {
    checkout.remove( 'coffee mug' )
} )

Then( 'an order is placed for a coffee mug', () => {
    expect( checkout.orders ).toHaveLength( 1 )
    expect( checkout.orders[ 0 ].products ).toEqual( [ 'coffee mug' ] )
} )

Then( 'my basket is empty', () => {
    expect( checkout.products ).toHaveLength( 0 )
} )

Fusion( 'checkout.feature' )
```

This runs two tests: `Paying by card`, and `Removing the last product`. Each test runs the `Background` steps again, from a fresh checkout, so one scenario never sees what another left behind. A failing `Background` step fails the test it ran in, and Jest names that step, as it would any other.

A `Rule` can have a `Background` of its own, for the scenarios inside it (see [Rule](./Rule.md#a-background-inside-a-rule)).

Next: [Gherkin tables](./GherkinTables.md), for steps that carry a table.
