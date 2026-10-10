# Language

The examples on this page are ES modules, laid out as in [Getting Started](../README.md#getting-started). For CommonJS, see [Using CommonJS instead](../README.md#using-commonjs-instead).

You can write a feature file in another language by putting a `# language:` header on its first line, for example `# language: nl` for Dutch. Without a header the language is English (`en`). Gherkin is translated into over 70 [languages](https://cucumber.io/docs/gherkin/languages/), and most editors with a Gherkin plugin complete the translated keywords for you.

A feature file in Dutch:

```gherkin
# language: nl
# filename: test/features/online-verkopen.feature
Functionaliteit: Online verkopen

    Scenario: t-shirt verkopen
        Gegeven ik heb een t-shirt
        Als ik een t-shirt wil verkopen
        Dan ontvang ik €22
        En ben ik blij
        Maar heb ik geen t-shirts over
```

The code under test:

```javascript
// filename: src/online-sales.js
const PRICES = { 'Rick Astley t-shirt': 22 }

export class OnlineSales {
    listed = []

    listItem( item ) {
        this.listed.push( item )
    }

    sellItem( item ) {
        this.listed = this.listed.filter( ( listed ) => listed !== item )
        return PRICES[ item ]
    }
}
```

The step definitions use the usual verbs. Each translated keyword binds through its English verb: `Gegeven` through `Given`, `Als` through `When`, `Dan` through `Then`, `En` through `And` and `Maar` through `But`. A step binds only to a definition registered with its own keyword, so the `En` and `Maar` steps need `And` and `But` definitions:

```javascript
// filename: test/features/online-verkopen.steps.js
import { Before, Given, When, Then, And, But, Fusion } from '@g_package/jest-cucumber-fusion'

import { OnlineSales } from '../../src/online-sales.js'

let onlineSales
let salesPrice

Before( () => {
    onlineSales = new OnlineSales()
} )

Given( 'ik heb een t-shirt', () => {
    onlineSales.listItem( 'Rick Astley t-shirt' )
} )

When( 'ik een t-shirt wil verkopen', () => {
    salesPrice = onlineSales.sellItem( 'Rick Astley t-shirt' )
} )

Then( /^ontvang ik €(\d+)$/, ( price ) => {
    expect( salesPrice ).toBe( Number( price ) )
} )

And( 'ben ik blij', () => {
    expect( salesPrice ).toBeGreaterThan( 0 )
} )

But( 'heb ik geen t-shirts over', () => {
    expect( onlineSales.listed ).toHaveLength( 0 )
} )

Fusion( 'online-verkopen.feature' )
```

You can also import the verbs under the Dutch keywords, so the step file reads like the feature. They are the same functions, so `Gegeven` registers a `Given` definition:

```javascript
// filename: test/features/online-verkopen-vertaald.steps.js
import {
    Before,
    Given as Gegeven,
    When as Als,
    Then as Dan,
    And as En,
    But as Maar,
    Fusion,
} from '@g_package/jest-cucumber-fusion'

import { OnlineSales } from '../../src/online-sales.js'

let onlineSales
let salesPrice

Before( () => {
    onlineSales = new OnlineSales()
} )

Gegeven( 'ik heb een t-shirt', () => {
    onlineSales.listItem( 'Rick Astley t-shirt' )
} )

Als( 'ik een t-shirt wil verkopen', () => {
    salesPrice = onlineSales.sellItem( 'Rick Astley t-shirt' )
} )

Dan( /^ontvang ik €(\d+)$/, ( price ) => {
    expect( salesPrice ).toBe( Number( price ) )
} )

En( 'ben ik blij', () => {
    expect( salesPrice ).toBeGreaterThan( 0 )
} )

Maar( 'heb ik geen t-shirts over', () => {
    expect( onlineSales.listed ).toHaveLength( 0 )
} )

Fusion( 'online-verkopen.feature' )
```

Dutch has two words for `When`, `Als` and `Wanneer`, and both bind through `When`. In CommonJS the renaming is done while destructuring: `const { Given: Gegeven } = require( '@g_package/jest-cucumber-fusion' )`.
