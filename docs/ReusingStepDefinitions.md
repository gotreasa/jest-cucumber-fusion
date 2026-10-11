# Re-using step definitions

The examples on this page are ES modules, laid out as in [Getting Started](../README.md#getting-started). For CommonJS, see [Written as CommonJS](#written-as-commonjs) at the end.

Fusion registers a step definition wherever it is called, so a step used by several feature files can live in one shared file that each steps file imports. Keep step code light, with common set-up in modules of its own (test data creation, for example), and there is little left to duplicate. When some remains, share it like this:

```gherkin
# filename: test/features/order-history.feature
Feature: Order history

Scenario: Viewing my orders
  Given I am logged in
  Then my account shows my email address
```

Most features of a web shop start with someone logged in, so `Given I am logged in` belongs in a shared file. The code under test keeps who is logged in:

```javascript
// filename: src/session.js
export const session = {
    user: null,

    logIn( email ) {
        this.user = email
    },
}
```

Write your step definitions as usual, and import your shared step definition file by its full name, extension included. An `import` always runs before the rest of the file, wherever it is written, so the shared steps are registered first. That is safe, because Fusion binds every step only when `Fusion(...)` runs.

```javascript
// filename: test/features/order-history.steps.js
import { Then, Fusion } from '@g_package/jest-cucumber-fusion'
import './login-steps.js' // the shared steps

import { session } from '../../src/session.js'

Then( 'my account shows my email address', () => {
    expect( session.user ).toBe( 'sam@example.com' )
} )

Fusion( 'order-history.feature' )
```

Name the shared file so that Jest's `testMatch` does not pick it up as a test file of its own (`login-steps.js`, not `login.steps.js`):

```javascript
// filename: test/features/login-steps.js
import { Given } from '@g_package/jest-cucumber-fusion'

import { session } from '../../src/session.js'

Given( 'I am logged in', () => {
    session.logIn( 'sam@example.com' )
} )
```

A shared step still binds by its keyword, so every feature that uses it must write it as `Given I am logged in`. If some write `And I am logged in`, register it under both keywords with the chained form: `Given( And( 'I am logged in', fn ) )`.

An imported file runs once per steps file, so its steps are registered once. Each `Fusion` call empties the registry, so a steps file with two `Fusion` calls needs the shared steps registered again before the second: use the exported-function form below and call it before each call.

### Sharing a value with the shared steps

The login steps above share their state through a module, `session`, that both files import. A shared step sometimes needs a value that only the steps file creates, such as the basket a `Given` step builds. The shared file cannot import that variable, and reading it once when the file loads would give `undefined`, because the `Given` step has not run yet. So the steps file passes in a function that returns the current value, and each shared step calls it when it runs. Keep this rare: steps that share a lot of state are usually easier to follow in one file.

For example, with this feature:

```gherkin
# filename: test/features/checkout.feature
Feature: Checkout

Scenario: Checking out a basket
  Given my basket holds a coffee mug
  When I check out
  Then an order is placed for a coffee mug
  And my basket is empty
```

The code under test is the `Basket` from [Getting Started](../README.md#getting-started), with a `checkOut` method:

```javascript
// filename: src/basket.js
export class Basket {
    constructor() {
        this.products = []
        this.orders = []
    }

    add( product ) {
        this.products.push( product )
    }

    checkOut() {
        this.orders.push( [ ...this.products ] )
        this.products = []
    }
}
```

The steps file keeps the basket in its own variable and passes a function that returns it. The shared file exports a function that takes that accessor and registers its steps:

```javascript
// filename: test/features/checkout.steps.js
import { Given, Fusion } from '@g_package/jest-cucumber-fusion'
import { Basket } from '../../src/basket.js'
import registerCheckoutSteps from './checkout-steps.js'

let basket
function getCurrentBasket() {
    return basket
}

Given( 'my basket holds a coffee mug', () => {
    basket = new Basket()
    basket.add( 'coffee mug' )
} )

registerCheckoutSteps( getCurrentBasket )

Fusion( 'checkout.feature' )
```

Inside your shared step file, call the accessor inside each step function, when the step runs, not outside it:

```javascript
// filename: test/features/checkout-steps.js
import { When, Then, And } from '@g_package/jest-cucumber-fusion'

export default function registerCheckoutSteps( currentBasket ) {
    When( 'I check out', () => {
        currentBasket().checkOut()
    } )

    Then( 'an order is placed for a coffee mug', () => {
        expect( currentBasket().orders ).toEqual( [ [ 'coffee mug' ] ] )
    } )

    And( 'my basket is empty', () => {
        expect( currentBasket().products ).toHaveLength( 0 )
    } )
}
```

### One steps file for several features

A steps file can run more than one feature. Each `Fusion` call uses the steps registered before it and then empties the registry, so register the steps again before each call: put them in a function and call it before each `Fusion`. With these two features:

```gherkin
# filename: test/features/account-details.feature
Feature: Account details

Scenario: Viewing my details
  Given I am logged in
  Then my account shows my email address
```

```gherkin
# filename: test/features/account-settings.feature
Feature: Account settings

Scenario: Opening my settings
  Given I am logged in
  Then my account shows my email address
```

one steps file runs both, using the `session` module from above:

```javascript
// filename: test/features/account.steps.js
import { Given, Then, Fusion } from '@g_package/jest-cucumber-fusion'

import { session } from '../../src/session.js'

const registerAccountSteps = () => {
    Given( 'I am logged in', () => {
        session.logIn( 'sam@example.com' )
    } )

    Then( 'my account shows my email address', () => {
        expect( session.user ).toBe( 'sam@example.com' )
    } )
}

for ( const feature of [ 'account-details.feature', 'account-settings.feature' ] ) {
    registerAccountSteps()
    Fusion( feature )
}
```

Jest reports each feature as its own group of tests. To run every feature in a folder rather than a fixed list, build the list with Node's `fs.readdirSync`, keeping the names that end in `.feature`; each path is still relative to the steps file.

## Written as CommonJS

The same examples work in CommonJS (see [Using CommonJS](./CommonJS.md) for the set-up): turn each `import` into a `require`, and each `export default function` into `module.exports = function`. A shared file is required by name, and its extension may be left out: `require( './login-steps' )`.

A shared file written as CommonJS can also serve steps written as ES modules: import it by its full file name, for example `import './login-steps.cjs'`. Everything a `.cjs` file `require`s must be CommonJS as well: it cannot `require` your ES module code under test, so either keep that code in `.cjs` files too, or write the shared steps as ES modules.

Next: [Configuration options](./AdditionalConfiguration.md), to filter by tag, name your tests, or set options once for every file.
