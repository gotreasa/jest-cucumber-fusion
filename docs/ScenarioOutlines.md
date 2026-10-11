# Scenario outlines

The examples on this page are ES modules, laid out as in [Getting Started](../README.md#getting-started). For CommonJS, see [Using CommonJS](./CommonJS.md).

A Scenario Outline runs its steps once for each row of its `Examples` table:

```gherkin
# filename: test/features/online-sales.feature
Feature: Online sales

Scenario Outline: Selling a <Item>
  Given I have listed a <Item> for sale
  When I sell the <Item>
  Then I should receive $<Amount>

  Examples:
    | Item       | Amount |
    | coffee mug | 8      |
    | notebook   | 4      |
    | desk lamp  | 25     |
```

Before a row runs, every `<placeholder>` in the outline, its title included, is replaced with that row's value, so each row becomes its own test, named after its own title. This one runs three tests: `Selling a coffee mug`, `Selling a notebook` and `Selling a desk lamp`. The steps then match the substituted text, so a step definition captures the row's value as it would any other value.

In Jest's report, a feature's plain scenarios come first and its outline rows after them, each group in the order the file declares it, so the order can differ from the file when the two are interleaved.

The code under test:

```javascript
// filename: src/online-sales.js
const PRICES = {
    'coffee mug': 8,
    'notebook': 4,
    'desk lamp': 25,
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

Each step captures the substituted value with `(.*)`, which takes the text between the fixed words, spaces included:

```javascript
// filename: test/features/online-sales.steps.js
import { Before, Given, When, Then, Fusion } from '@g_package/jest-cucumber-fusion'

import { OnlineSales } from '../../src/online-sales.js'

let onlineSales
let salesPrice

Before( () => {
    onlineSales = new OnlineSales()
} )

Given( /^I have listed a (.*) for sale$/, ( item ) => {
    onlineSales.listItem( item )
} )

When( /^I sell the (.*)$/, ( item ) => {
    salesPrice = onlineSales.sellItem( item )
} )

Then( /^I should receive \$(\d+)$/, ( expectedSalesPrice ) => {
    expect( salesPrice ).toBe( Number( expectedSalesPrice ) )
} )

Fusion( 'online-sales.feature' )
```

A row whose value does not fit a step's regular expression leaves that step unmatched, and Fusion names it when the file loads.
