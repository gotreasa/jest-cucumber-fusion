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

### Install Jest Cucumber Fusion:

```
npm install @g_package/jest-cucumber-fusion --save-dev
```

Coming from `jest-cucumber-fusion` 0.8.x or from version 2 of this package? Your feature and step definition files keep their shape; the import name changes, and several behaviours that used to pass silently now fail with a message saying what to fix. [Migrating to version 3](./docs/Migrating.md) lists each change, observed under both versions.

### Add a Feature file:

```gherkin
###filename: rocket-launching.feature
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
"jest": { "testMatch": [ "**/*.steps.js" ] }
```


### Add a your Cucumber Step definition file and load Fusion
```javascript
//filename: rocket-launching.steps.js
const { Given, When, Then, And, But, Fusion } = require( '@g_package/jest-cucumber-fusion' )

```

Writing your steps as ES modules instead? Import the same names, and run Jest in its ES module mode (`NODE_OPTIONS=--experimental-vm-modules npx jest`) on Node 20.11 or newer (CommonJS steps run on Node 18.14 and up):

```javascript
//filename: rocket-launching.steps.mjs
import { Given, When, Then, And, But, Fusion } from '@g_package/jest-cucumber-fusion'
```

The package ships both: `require` gets a CommonJS build, `import` gets the ES module source, and a `setupFiles` script may use either style whichever your steps use.

### Load any dependency you need to do your test

```javascript
//filename: rocket-launching.steps.js
const { Given, When, Then, And, But, Fusion } = require( '@g_package/jest-cucumber-fusion' )

const { Rocket } = require( '../../src/rocket' )
let rocket

```

### Add steps definitions:

```javascript
//filename: rocket-launching.steps.js
const { Given, When, Then, And, But, Fusion } = require( '@g_package/jest-cucumber-fusion' )

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
You have to match it with your Cucumber Feature definition file:
```javascript
//filename: rocket-launching.steps.js
const { Given, When, Then, And, But, Fusion } = require( '@g_package/jest-cucumber-fusion' )

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
