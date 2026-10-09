# Language

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
const { Before, Given, When, Then, Fusion, And, But } = require('@g_package/jest-cucumber-fusion')

const { OnlineSales } = require('../../../src/online-sales')

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
const {
    Before,
    Given: Gegeven,
    When: Wanneer,
    Then: Dan,
    Fusion,
    And: En,
    But: Maar
} = require('@g_package/jest-cucumber-fusion')

const { OnlineSales } = require('../../../src/online-sales')

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

The renamed verbs are the same functions, so `Gegeven` registers a `Given` definition and binds the feature's `Gegeven` steps. With ES module syntax the same renaming is `import { Given as Gegeven } from '@g_package/jest-cucumber-fusion'`, which Jest only runs when a transform such as Babel is configured for your step files.