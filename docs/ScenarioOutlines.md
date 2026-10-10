# Scenario outlines

The examples on this page are ES modules, laid out as in [Getting Started](../README.md#getting-started). For CommonJS, see [Using CommonJS instead](../README.md#using-commonjs-instead).

A Scenario Outline runs its steps once for each row of its `Examples` table. Before a row runs, every `<placeholder>` in the outline, its title included, is replaced with that row's value, so each row becomes its own test, named after its own title. The steps then match the substituted text, so a step definition captures the row's value as it would any other value.

```gherkin
# filename: test/features/online-sales.feature
Feature: Online sales

Scenario Outline: Selling an <Item>
  Given I have a(n) <Item>
  When I sell the <Item>
  Then I should get $<Amount>

  Examples:
    | Item                                           | Amount |
    | Autographed Neil deGrasse Tyson book           | 100    |
    | Rick Astley t-shirt                            | 22     |
    | An idea to replace EVERYTHING with blockchains | 0      |
```

This runs three tests: `Selling an Autographed Neil deGrasse Tyson book`, `Selling an Rick Astley t-shirt` and `Selling an An idea to replace EVERYTHING with blockchains`.

The code under test:

```javascript
// filename: src/online-sales.js
const PRICES = {
    'Autographed Neil deGrasse Tyson book': 100,
    'Rick Astley t-shirt': 22,
    'An idea to replace EVERYTHING with blockchains': 0,
}

export class OnlineSales {
    listed = []

    listItem( item ) {
        this.listed.push( item )
    }

    sellItem( item ) {
        return this.listed.includes( item ) ? PRICES[ item ] : undefined
    }
}
```

Each step captures the substituted value with `(.*)`, which takes everything after the fixed words, spaces included:

```javascript
// filename: test/features/online-sales.steps.js
import { Before, Given, When, Then, Fusion } from '@g_package/jest-cucumber-fusion'

import { OnlineSales } from '../../src/online-sales.js'

let onlineSales
let salesPrice

Before( () => {
    onlineSales = new OnlineSales()
} )

Given( /^I have a\(n\) (.*)$/, ( item ) => {
    onlineSales.listItem( item )
} )

When( /^I sell the (.*)$/, ( item ) => {
    salesPrice = onlineSales.sellItem( item )
} )

Then( /^I should get \$(\d+)$/, ( expectedSalesPrice ) => {
    expect( salesPrice ).toBe( Number( expectedSalesPrice ) )
} )

Fusion( 'online-sales.feature' )
```

A row whose value does not fit a step's regular expression leaves that step unmatched, and Fusion names it when the file loads.
