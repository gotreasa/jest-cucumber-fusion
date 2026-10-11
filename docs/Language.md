# Language

The examples on this page are ES modules, laid out as in [Getting Started](../README.md#getting-started). For CommonJS, see [Using CommonJS](./CommonJS.md).

This page is for writing feature files in a language other than English. Its example is the shop owner's side of the shop from Getting Started, as on [Scenario outlines](./ScenarioOutlines.md). You can write a feature file in another language by putting a `# language:` header on its first line, for example `# language: nl` for Dutch. Without a header the language is English (`en`). Gherkin is translated into 80 [languages](https://cucumber.io/docs/gherkin/languages/), and most editors with a Gherkin plugin complete the translated keywords for you.

A feature file in Dutch:

```gherkin
# language: nl
# filename: test/features/online-verkopen.feature
Functionaliteit: Online verkopen

    Scenario: Een koffiemok verkopen
        Gegeven ik heb een koffiemok te koop
        Als ik de koffiemok verkoop
        Dan ontvang ik €8
        En is de verkoop geregistreerd
        Maar heb ik geen koffiemokken meer te koop
```

The code under test:

```javascript
// filename: src/shop.js
const PRICES = { 'coffee mug': 8 }

export class Shop {
    listed = []
    sold = []

    listItem( item ) {
        this.listed.push( item )
    }

    sellItem( item ) {
        this.listed = this.listed.filter( ( listed ) => listed !== item )
        this.sold.push( item )
        return PRICES[ item ]
    }
}
```

The step definitions use the usual verbs. Each translated keyword binds through its English verb: `Gegeven` through `Given`, `Als` through `When`, `Dan` through `Then`, `En` through `And` and `Maar` through `But`. A step binds only to a definition registered with its own keyword, so the `En` and `Maar` steps need `And` and `But` definitions:

```javascript
// filename: test/features/online-verkopen.steps.js
import { Before, Given, When, Then, And, But, Fusion } from '@g_package/jest-cucumber-fusion'

import { Shop } from '../../src/shop.js'

let shop
let salesPrice

Before( () => {
    shop = new Shop()
} )

Given( 'ik heb een koffiemok te koop', () => {
    shop.listItem( 'coffee mug' )
} )

When( 'ik de koffiemok verkoop', () => {
    salesPrice = shop.sellItem( 'coffee mug' )
} )

Then( /^ontvang ik €(\d+)$/, ( price ) => {
    expect( salesPrice ).toBe( Number( price ) )
} )

And( 'is de verkoop geregistreerd', () => {
    expect( shop.sold ).toEqual( [ 'coffee mug' ] )
} )

But( 'heb ik geen koffiemokken meer te koop', () => {
    expect( shop.listed ).toHaveLength( 0 )
} )

Fusion( 'online-verkopen.feature' )
```

You can also import the verbs under the Dutch keywords, so the step file reads like the feature. They are the same functions, so `Gegeven` registers a `Given` definition:

```javascript
import { Given as Gegeven, When as Als } from '@g_package/jest-cucumber-fusion'

Gegeven( 'ik heb een koffiemok te koop', () => {
    shop.listItem( 'coffee mug' )
} )

Als( 'ik de koffiemok verkoop', () => {
    salesPrice = shop.sellItem( 'coffee mug' )
} )
```

Dutch has two words for `Given`, `Gegeven` and `Stel`, and two for `When`, `Als` and `Wanneer`: each pair binds through the same verb. In CommonJS the renaming is done while destructuring: `const { Given: Gegeven } = require( '@g_package/jest-cucumber-fusion' )`.
