# Language

The examples on this page are ES modules. For CommonJS, see [Using CommonJS instead](../README.md#using-commonjs-instead).

You can use different languages in jest-cucumber-fusion by adding a `# language:` header, 
for example `# language: nl` for Dutch. 
If you don't set any header the default language will be English (`en`).

Gherkin has translated over 70 [languages](https://cucumber.io/docs/gherkin/languages/).

An example of a feature file in the Dutch (nl) language:

```gherkin
# language: nl

Functionaliteit: Online verkopen

    Scenario: t-shirt verkopen
        Gegeven ik heb een t-shirt
        Als ik een t-shirt wil verkopen
        Dan ontvang ik €22
        En ben ik blij
        Maar heb ik geen t-shirts over
```
Most modern IDE's (or plugin) will support this feature and autocomplete keywords when using with a language.

The step-file can be defined as normal like:

```javascript
import { Before, Given, When, Then, Fusion, And, But } from '@g_package/jest-cucumber-fusion'

import { OnlineSales } from '../../../src/online-sales.js'

let onlineSales
let salesPrice

Before(() => { onlineSales = new OnlineSales() })

Given(/^ik heb een t-shirt$/, item => {
    onlineSales.listItem('Rick Astley t-shirt')
})

When(/^ik een t-shirt wil verkopen$/, item => {
    salesPrice = onlineSales.sellItem('Rick Astley t-shirt')
})
...
```

Optionally you can also translate the keywords in your step-files like so:

```javascript
import {
    Before,
    Given as Gegeven,
    When as Wanneer,
    Then as Dan,
    Fusion,
    And as En,
    But as Maar
} from '@g_package/jest-cucumber-fusion'

import { OnlineSales } from '../../../src/online-sales.js'

let onlineSales
let salesPrice

Before(() => { onlineSales = new OnlineSales() })

Gegeven(/^ik heb een t-shirt$/, item => {
    onlineSales.listItem('Rick Astley t-shirt')
})

Wanneer(/^ik een t-shirt wil verkopen$/, item => {
    salesPrice = onlineSales.sellItem('Rick Astley t-shirt')
})
...
```

The renamed verbs are the same functions, so `Gegeven` registers a `Given` definition and binds the feature's `Gegeven` steps. In CommonJS the same renaming is done while destructuring: `const { Given: Gegeven } = require('@g_package/jest-cucumber-fusion')`.