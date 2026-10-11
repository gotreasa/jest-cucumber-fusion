# Scenario outlines

The examples on this page are ES modules, laid out as in [Getting Started](../README.md#getting-started). For CommonJS, see [Using CommonJS](./CommonJS.md).

The examples here are the shop owner's side of the shop from Getting Started: listing products for sale and selling them. A Scenario Outline runs its steps once for each row of its `Examples` table:

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

Each step captures the substituted value with `(.*)`, which takes whatever text stands in its place, spaces included:

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

In Jest's report, a feature's plain scenarios come first and its outline rows after them, each group in the order the file declares it, so the order can differ from the file when the two are interleaved.

## Several Examples tables, and tags on them

An outline can have more than one `Examples` table, and each table can carry its own tags. The rows of every table run, each as its own test, and a row is selected on its table's tags as well as the outline's:

```gherkin
# filename: test/features/delivery-charges.feature
Feature: Delivery charges

Scenario Outline: Delivering <Weight> kg to <Country>
  Given my order weighs <Weight> kg
  When I choose delivery to <Country>
  Then the delivery charge is €<Charge>

  @domestic
  Examples: Within the country
    | Weight | Country | Charge |
    | 1      | Ireland | 5      |
    | 10     | Ireland | 10     |

  @international
  Examples: Abroad
    | Weight | Country | Charge |
    | 1      | France  | 15     |
```

The code under test:

```javascript
// filename: src/delivery.js
export const deliveryCharge = ( weight, country ) => {
    const base = country === 'Ireland' ? 5 : 15
    return weight > 5 ? base * 2 : base
}
```

```javascript
// filename: test/features/delivery-charges.steps.js
import { Given, When, Then, Fusion } from '@g_package/jest-cucumber-fusion'

import { deliveryCharge } from '../../src/delivery.js'

let weight
let charge

Given( /^my order weighs (\d+) kg$/, ( kilograms ) => {
    weight = Number( kilograms )
} )

When( /^I choose delivery to (.*)$/, ( country ) => {
    charge = deliveryCharge( weight, country )
} )

Then( /^the delivery charge is €(\d+)$/, ( expected ) => {
    expect( charge ).toBe( Number( expected ) )
} )

Fusion( 'delivery-charges.feature' )
```

This runs three tests, one per row. With a [tag filter](./AdditionalConfiguration.md#tag-filtering) you can run one table and skip the other: `Fusion( 'delivery-charges.feature', { tagFilter: '@domestic' } )` runs the two rows within the country, and `'not @international'` does the same. A [scenario title template](./AdditionalConfiguration.md#scenario-title-templates) receives a row's table tags in `scenarioTags`.

Next: [Rule](./Rule.md), for grouping scenarios under the business rule they illustrate.
