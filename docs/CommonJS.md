# Using CommonJS

Fusion ships a CommonJS build beside its ES modules: `require` gets the CommonJS build and `import` gets the ES modules. Use CommonJS if your project already is CommonJS (it uses `require`), if you need Node 18 (CommonJS runs on Node 18.14 and newer), or if you would rather not run Jest's experimental ES module mode. CommonJS needs no experimental flag and no ES module mode.

Follow [Getting Started](../README.md#getting-started) with the changes on this page.

## Start a project

Check that `node --version` prints 18.14 or newer, then use these commands in place of Getting Started's. They leave out `"type": "module"` and run Jest directly, with no flag:

```
mkdir my-project
cd my-project
npm init -y
npm install --save-dev jest @g_package/jest-cucumber-fusion
npm pkg set scripts.test=jest
npm pkg set "jest.testMatch[0]=**/*.steps.js"
```

Recent versions of npm write `"type": "commonjs"` during `npm init`, and older ones write no `type`: both mean CommonJS.

## The code under test

It exports with `module.exports`:

```javascript
// filename: src/basket.js
class Basket {
    constructor() {
        this.products = []
    }

    add( product ) {
        this.products.push( product )
    }
}

module.exports = { Basket }
```

## Step definition files

They `require` the same names. A relative `require` may leave the extension out, and the `jest` object is a global, as in any CommonJS Jest project:

```javascript
// filename: test/features/shopping-basket.steps.js
const { Given, When, Then, And, Fusion } = require( '@g_package/jest-cucumber-fusion' )

const { Basket } = require( '../../src/basket' )

let basket

Given( 'my basket is empty', () => {
    basket = new Basket()
} )

When( 'I add a coffee mug to my basket', () => {
    basket.add( 'coffee mug' )
} )

Then( 'my basket holds 1 product', () => {
    expect( basket.products ).toHaveLength( 1 )
} )

And( 'the product in my basket is a coffee mug', () => {
    expect( basket.products[ 0 ] ).toBe( 'coffee mug' )
} )

Fusion( 'shopping-basket.feature' )
```

## Everything else

The other pages show ES modules. To use one of their examples in CommonJS, turn each `import { … } from '…'` into `const { … } = require( '…' )` and each `export` into `module.exports`, and delete any `import { jest } from '@jest/globals'`, because `jest` is a global in CommonJS. Two pages show their CommonJS form in full:

- [Configuration options](./AdditionalConfiguration.md#global-configuration): a global configuration script that `require`s `setFusionConfiguration`.
- [Linting with ESLint](./ESLint.md#commonjs): an `eslint.config.js` written as CommonJS.

## Mixing the two styles

Mixing works. A CommonJS shared step library can serve ES module step files, and a CommonJS setup script can configure ES module steps: both styles share one set of step definitions and one global configuration. An ES module imports a CommonJS file by its full name, for example `import './shared-steps.cjs'`, and in a `"type": "module"` project a CommonJS file must be named `.cjs`, because there a `.js` file is read as an ES module and `require` does not exist.
