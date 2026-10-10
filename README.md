# Jest Cucumber Fusion

Write 'pure' cucumber test in Jest without syntax clutter 

[![Build Status](https://github.com/gotreasa/jest-cucumber-fusion/workflows/Continuous%20Integration/badge.svg)](https://github.com/gotreasa/jest-cucumber-fusion/actions?query=workflow%3A%22Continuous+Integration%22)
[![Codecov](https://codecov.io/gh/gotreasa/jest-cucumber-fusion/branch/master/graph/badge.svg)](https://codecov.io/gh/gotreasa/jest-cucumber-fusion)

[![npm downloads](https://img.shields.io/npm/dm/@g_package/jest-cucumber-fusion)](https://www.npmjs.com/package/@g_package/jest-cucumber-fusion)
[![npm latest](https://img.shields.io/npm/v/@g_package/jest-cucumber-fusion/latest.svg)](https://www.npmjs.com/package/@g_package/jest-cucumber-fusion)
[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/semantic-release/semantic-release)


## Overview
Jest-Cucumber-Fusion handle the writing of the corresponding Jest test steps using an uncluttered cucumber style.
Instead of using `describe` and `it` blocks, you instead write a Jest test for each scenario, and then define `Given`, `When`, and `Then` step definitions inside of your Jest tests. 
Jest-Cucumber-Fusion then allows you to link these Cucumber tests to your javascript Cucumber feature steps.
Adding a `Fusion`call, the links between your Feature definition and your Steps definition is handled automatically and the necessary scaffolding is build behind the scene.
Now use jest naturally in your project like you would use the native Cucumber library.

The style of this package began with [Jest-cucumber](https://github.com/bencompton/jest-cucumber), which it was originally built on top of. Since version 3 it no longer depends on that package: it runs on Jest and [@cucumber/gherkin](https://github.com/cucumber/gherkin) directly, and owns the whole test lifecycle itself.

This package continues [b-yond-infinite-network/jest-cucumber-fusion](https://github.com/b-yond-infinite-network/jest-cucumber-fusion), published on npm as `jest-cucumber-fusion` until version 0.8.1 in June 2021, and is now maintained and published as `@g_package/jest-cucumber-fusion`.

## Motivation

Jest-cucumber is an amazing project but forces you to write a lot of repetitive scaffolding code to setup the link betwen Jest and Cucumber.
With Jest-Cucumber-Fusion, it really takes only the minimal code possible:
 - a Cucumber Feature file with gherkin sentences
 - a Cucumber Step definition file with your javascript validation code, ended with the `Fusion` function to link the two



## Getting Started

These steps set up a project whose files are CommonJS (they use `require`), which needs no other set-up. For steps written as ES modules, see [Using ES modules](#using-es-modules).

### Install Jest and Jest Cucumber Fusion:

```
npm install --save-dev jest @g_package/jest-cucumber-fusion
```

Coming from `jest-cucumber-fusion` 0.8.x or from version 2 of this package? Your feature and step definition files keep their shape; the import name changes, and several behaviours that used to pass silently now fail with a message saying what to fix. [Migrating to version 3](./docs/Migrating.md) lists each change, observed under both versions.

### Lay out your project

The examples below use this layout. Any layout works, as long as each `require` path and each `Fusion` path matches where your files are.

```
your-project/
├── package.json
├── src/
│   └── rocket.js                      the code under test
└── test/
    └── features/
        ├── rocket-launching.feature
        └── rocket-launching.steps.js
```

The code under test in these examples is a small class of your own:

```javascript
//filename: src/rocket.js
class Rocket {
    constructor() {
        this.isInSpace = false
        this.boostersLanded = false
    }

    launch() {
        this.isInSpace = true
        this.boostersLanded = true
    }
}

module.exports = { Rocket }
```

### Add a Feature file:

```gherkin
###filename: test/features/rocket-launching.feature
Feature: Rocket Launching

Scenario: Launching a SpaceX rocket
  Given I am Elon Musk attempting to launch a rocket into space
  When I launch the rocket
  Then the rocket should end up in space
  And the booster(s) should land back on the launch pad
  And nobody should doubt me ever again
```

### Add the following to your package.json configuration:

```javascript
"scripts": { "test": "jest" },
"jest": { "testMatch": [ "**/*.steps.js" ] }
```

`testMatch` tells Jest that your step definition files are the test files. Run the tests with `npm test`.

### Add a Cucumber step definition file and load Fusion
```javascript
//filename: test/features/rocket-launching.steps.js
const { Given, When, Then, And, Fusion } = require( '@g_package/jest-cucumber-fusion' )

```

Import only the keywords your steps use. `But` is also available.

### Load any dependency you need to do your test

```javascript
//filename: test/features/rocket-launching.steps.js
const { Given, When, Then, And, Fusion } = require( '@g_package/jest-cucumber-fusion' )

const { Rocket } = require( '../../src/rocket' )
let rocket

```

### Add steps definitions:

```javascript
//filename: test/features/rocket-launching.steps.js
const { Given, When, Then, And, Fusion } = require( '@g_package/jest-cucumber-fusion' )

const { Rocket } = require( '../../src/rocket' )
let rocket

Given( 'I am Elon Musk attempting to launch a rocket into space', () => {
    rocket = new Rocket()
} )

When( 'I launch the rocket', () => {
    rocket.launch()
} )

Then( 'the rocket should end up in space', () => {
    expect(rocket.isInSpace).toBe(true)
} )

And( /^the booster\(s\) should land back on the launch pad$/, () => {
    expect(rocket.boostersLanded).toBe(true)
} )

And( 'nobody should doubt me ever again', () => {
    expect('people').not.toBe('haters')
} )
```

### Adding the Fusion() call at the end of the Step definition file
You have to match it with your Cucumber Feature definition file. The path is relative to the step definition file, so a feature file beside it is named on its own:
```javascript
//filename: test/features/rocket-launching.steps.js
const { Given, When, Then, And, Fusion } = require( '@g_package/jest-cucumber-fusion' )

const { Rocket } = require( '../../src/rocket' )
let rocket

Given( 'I am Elon Musk attempting to launch a rocket into space', () => {
    rocket = new Rocket()
} )

When( 'I launch the rocket', () => {
    rocket.launch()
} )

Then( 'the rocket should end up in space', () => {
    expect(rocket.isInSpace).toBe(true)
} )

And( /^the booster\(s\) should land back on the launch pad$/, () => {
    expect(rocket.boostersLanded).toBe(true)
} )

And( 'nobody should doubt me ever again', () => {
    expect('people').not.toBe('haters')
} )


Fusion( 'rocket-launching.feature' )
```

### Run the tests

```
npm test
```

Jest reports one test for the scenario, named after it, and fails it at the first step that fails.

## Adding coverage
Since we're using jest, it is very easy to generate the code coverage of your Cucumber test:
```javascript
"jest": {
    "testMatch": [
      "**/*.steps.js"
    ],
    "coveragePathIgnorePatterns": [
      "/node_modules/",
      "/test/"
    ],
    "coverageDirectory": "./coverage/",
    "collectCoverage": true
  }
```

 
## Setting options once for a whole run

Options can be passed to a single `Fusion` call:

```javascript
Fusion( 'rocket-launching.feature', { tagFilter: '@smoke and not @slow' } )
```

Or set once for every step definition file of a run, from a script listed in Jest's `setupFiles`:

```javascript
//jest-fusion-config.js
const { setFusionConfiguration } = require( '@g_package/jest-cucumber-fusion' )

setFusionConfiguration( { tagFilter: '@smoke and not @slow' } )
```

A per-call option still wins for its own file. See [Configuration options](./docs/AdditionalConfiguration.md) for every option and for the merge order.

If you are coming from version 2, global configuration used to go through `jest-cucumber`'s own `setJestCucumberConfiguration`. That package is no longer a dependency, so the import moves to `setFusionConfiguration` from this package; the options object is the same shape.

## Linting with ESLint

[eslint-plugin-jest](https://github.com/jest-community/eslint-plugin-jest) gives ESLint Jest's globals, such as `expect`, and its rules. One rule needs to be told about Fusion. `jest/no-standalone-expect` reports every `expect` that is not inside a `test` or `it` block, and in a step definition file every `expect` sits inside `Then`, `And` or another step function instead. Each step function and each `Before` and `After` hook runs inside the test that Fusion makes for its scenario, so tell the rule to treat them as test blocks.

Install ESLint and the plugin:

```
npm install --save-dev eslint @eslint/js globals eslint-plugin-jest
```

Then add an `eslint.config.js` to your project:

```javascript
//filename: eslint.config.js
const js = require( '@eslint/js' )
const globals = require( 'globals' )
const jest = require( 'eslint-plugin-jest' )

module.exports = [
  js.configs.recommended,
  {
    languageOptions: { sourceType: 'commonjs', globals: globals.node },
  },
  {
    files: [ '**/*.steps.js' ],
    ...jest.configs[ 'flat/recommended' ],
    rules: {
      ...jest.configs[ 'flat/recommended' ].rules,
      // Fusion runs each step and hook inside the test it makes for the scenario.
      'jest/no-standalone-expect': [ 'error', {
        additionalTestBlockFunctions: [ 'Given', 'When', 'Then', 'And', 'But', 'Before', 'After' ],
      } ],
    },
  },
]
```

Run it with `npx eslint .`. Without the `jest/no-standalone-expect` options, every `expect` in the steps file above is reported as `Expect must be inside of a test block`. With them, an `expect` that really is outside a step, a hook or a test is still reported.

If your shared step files are not named `*.steps.js` (see [Re-using step definitions](./docs/ReusingStepDefinitions.md)), add their names to `files`.

This configuration is for CommonJS files. If your project is `"type": "module"` (see [Using ES modules](#using-es-modules)), two things change. Name the file `eslint.config.cjs`, because in that project an `eslint.config.js` is read as an ES module, where `require` does not exist. And set `sourceType: 'module'`, so that ESLint can parse the `import` lines in your steps.

## Using ES modules

The package ships both module styles: `require` gets a CommonJS build and `import` gets the ES module source. You do not have to choose one style for the whole project. A steps file, a shared step file and a `setupFiles` script may each use either style, and they share one set of step definitions and one global configuration.

Steps written as ES modules need three things that CommonJS steps do not.

**Node 20.11 or newer.** CommonJS steps run on Node 18.14 and newer.

**Jest's ES module mode.** Jest runs ES modules only when Node starts with `--experimental-vm-modules`. Put the flag in your `test` script, in the form Jest's own documentation gives, which does not depend on your shell's syntax:

```json
"scripts": { "test": "node --experimental-vm-modules node_modules/jest/bin/jest.js" }
```

Node prints an `ExperimentalWarning` about the flag on each run. That is expected.

**Files that Node reads as ES modules.** Choose one of these:

- Add `"type": "module"` to your `package.json`. Your files keep the `.js` extension, and the `testMatch` above stays as it is.
- Name your files with the `.mjs` extension instead, and change `testMatch` to find them:

  ```json
  "jest": { "testMatch": [ "**/*.steps.mjs" ] }
  ```

Then import the same names that the CommonJS examples require:

```javascript
//filename: test/features/rocket-launching.steps.js (in a package with "type": "module")
import { Given, When, Then, And, Fusion } from '@g_package/jest-cucumber-fusion'
import { Rocket } from '../../src/rocket.js'
```

Some differences from CommonJS to know about:

- A relative import names the file in full, extension included: `'../../src/rocket.js'`, not `'../../src/rocket'`.
- `expect`, `describe` and the other test globals work as before, but Jest does not give the `jest` object as a global. Import it, after you add `@jest/globals` to your `devDependencies`:

  ```javascript
  import { jest } from '@jest/globals'
  ```

- A global configuration script imports `setFusionConfiguration`, and is listed in `setupFiles` as before:

  ```javascript
  //filename: jest-fusion-config.js (in a package with "type": "module")
  import { setFusionConfiguration } from '@g_package/jest-cucumber-fusion'

  setFusionConfiguration( { tagFilter: '@smoke and not @slow' } )
  ```

- Shared step definitions are imported instead of required. [Re-using step definitions](./docs/ReusingStepDefinitions.md#written-as-es-modules) shows both of its examples as ES modules.

TypeScript finds the matching type definitions for either style, with no configuration.

 
## Additional Documentation 

  * [Gherkin tables](./docs/GherkinTables.md)
  * [Step definition arguments](./docs/StepDefinitionArguments.md)
  * [Scenario outlines](./docs/ScenarioOutlines.md)
  * [Re-using step definitions](./docs/ReusingStepDefinitions.md)  
  * [Configuration options](./docs/AdditionalConfiguration.md)
  * [Running the examples](./docs/RunningTheExamples.md)
  * [Language](./docs/Language.md)
  * [Architecture](./docs/Architecture.md)
  * [Migrating to version 3](./docs/Migrating.md)
