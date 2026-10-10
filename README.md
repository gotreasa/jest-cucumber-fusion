# Jest Cucumber Fusion

Write Cucumber feature files and run them as Jest tests, without the scaffolding.

[![Build Status](https://github.com/gotreasa/jest-cucumber-fusion/workflows/Continuous%20Integration/badge.svg)](https://github.com/gotreasa/jest-cucumber-fusion/actions?query=workflow%3A%22Continuous+Integration%22)
[![Codecov](https://codecov.io/gh/gotreasa/jest-cucumber-fusion/branch/master/graph/badge.svg)](https://codecov.io/gh/gotreasa/jest-cucumber-fusion)

[![npm downloads](https://img.shields.io/npm/dm/@g_package/jest-cucumber-fusion)](https://www.npmjs.com/package/@g_package/jest-cucumber-fusion)
[![npm latest](https://img.shields.io/npm/v/@g_package/jest-cucumber-fusion/latest.svg)](https://www.npmjs.com/package/@g_package/jest-cucumber-fusion)
[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/semantic-release/semantic-release)


## Overview
Jest Cucumber Fusion runs your Cucumber feature files as Jest tests. You write the feature file in Gherkin, and a step definition file with a `Given`, `When`, `Then`, `And` or `But` definition for each step. A `Fusion` call at the end of the step definition file links the two: Fusion reads the feature and creates one Jest test per scenario, so you write no `describe` or `it` blocks yourself. Everything else is plain Jest: `expect`, mocks, coverage and reporting.

The style of this package began with [Jest-cucumber](https://github.com/bencompton/jest-cucumber), which it was originally built on top of. Since version 3 it no longer depends on that package: it runs on Jest and [@cucumber/gherkin](https://github.com/cucumber/gherkin) directly, and owns the whole test lifecycle itself.

This package continues [b-yond-infinite-network/jest-cucumber-fusion](https://github.com/b-yond-infinite-network/jest-cucumber-fusion), published on npm as `jest-cucumber-fusion` until version 0.8.1 in June 2021, and is now maintained and published as `@g_package/jest-cucumber-fusion`.

## Motivation

Jest-cucumber has you write a `defineFeature` block, a `test` for every scenario and a callback for every step to link Jest and Cucumber. With Jest Cucumber Fusion you write only:
 - a Cucumber Feature file with gherkin sentences
 - a Cucumber Step definition file with your javascript validation code, ended with the `Fusion` function to link the two



## Getting Started

These steps set up a project whose files are ES modules (they use `import` and `export`), which is the recommended way to use Fusion. If your project is CommonJS (it uses `require`), or you need Node 18, follow the same steps with the changes in [Using CommonJS instead](#using-commonjs-instead).

For ES modules you need Node 20.11 or newer.

### Install Jest and Jest Cucumber Fusion:

```
npm install --save-dev jest @g_package/jest-cucumber-fusion
```

Coming from `jest-cucumber-fusion` 0.8.x or from version 2 of this package? Your feature and step definition files keep their shape; the import name changes, and several behaviours that used to pass silently now fail with a message saying what to fix. [Migrating to version 3](./docs/Migrating.md) lists each change, observed under both versions.

### Set these keys in your package.json:

```json
"type": "module",
"scripts": { "test": "node --experimental-vm-modules node_modules/jest/bin/jest.js" },
"jest": { "testMatch": [ "**/*.steps.js" ] }
```

Replace any `type` and `scripts.test` that are already there rather than adding a second copy: `npm init -y` writes `"type": "commonjs"` and a placeholder `test` script, and when a key appears twice in `package.json` the last one silently wins.

- `"type": "module"` makes Node read your `.js` files as ES modules. If you would rather not set it, name your files `.mjs` instead, and change `testMatch` to `[ "**/*.steps.mjs" ]`.
- Jest runs ES modules only in its ES module mode, which Node's `--experimental-vm-modules` flag turns on. This form of the `test` script is the one Jest's own documentation gives, and it does not depend on your shell's syntax. Node prints an `ExperimentalWarning` about the flag on each run. That is expected.
- `testMatch` tells Jest that your step definition files are the test files.

### Lay out your project

The examples below use this layout. Any layout works, as long as each `import` path and each `Fusion` path matches where your files are.

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
export class Rocket {
    constructor() {
        this.isInSpace = false
        this.boostersLanded = false
    }

    launch() {
        this.isInSpace = true
        this.boostersLanded = true
    }
}
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

### Add a Cucumber step definition file and load Fusion
```javascript
//filename: test/features/rocket-launching.steps.js
import { Given, When, Then, And, Fusion } from '@g_package/jest-cucumber-fusion'

```

Import only the keywords your steps use. `But` is also available.

**A step binds only to a definition registered with its own keyword.** An `And` step needs an `And(...)` definition, and a `Then(...)` definition with the same text does not serve it. That is why the steps below define `And` for the two `And` lines of the feature. When one definition should serve several keywords, chain it: `Then( And( 'text', fn ) )` registers the same definition under both. A step with no definition makes Fusion refuse the file, naming the step and suggesting the code to add.

### Load any dependency you need to do your test

```javascript
//filename: test/features/rocket-launching.steps.js
import { Given, When, Then, And, Fusion } from '@g_package/jest-cucumber-fusion'

import { Rocket } from '../../src/rocket.js'
let rocket

```

A relative import names the file in full, extension included: `'../../src/rocket.js'`, not `'../../src/rocket'`.

### Add steps definitions:

```javascript
//filename: test/features/rocket-launching.steps.js
import { Given, When, Then, And, Fusion } from '@g_package/jest-cucumber-fusion'

import { Rocket } from '../../src/rocket.js'
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

`expect` and the other test globals work as usual. The `jest` object (for `jest.fn()` and friends) is not a global in Jest's ES module mode. Add `@jest/globals` to your `devDependencies` and import it:

```javascript
import { jest } from '@jest/globals'
```

### Adding the Fusion() call at the end of the Step definition file
You have to match it with your Cucumber Feature definition file. The path is relative to the step definition file, so a feature file beside it is named on its own:
```javascript
//filename: test/features/rocket-launching.steps.js
import { Given, When, Then, And, Fusion } from '@g_package/jest-cucumber-fusion'

import { Rocket } from '../../src/rocket.js'
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

Writing your steps in TypeScript? See [Using TypeScript](#using-typescript).

## Adding coverage
Fusion's tests are Jest tests, so Jest's coverage works as usual. Set these keys in your `package.json`:
```json
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

For TypeScript step files, match `**/*.steps.ts` instead (see [Using TypeScript](#using-typescript)).

 
## Setting options once for a whole run

Options can be passed to a single `Fusion` call:

```javascript
Fusion( 'rocket-launching.feature', { tagFilter: '@smoke and not @slow' } )
```

Or set once for every step definition file of a run, from a script that Jest's `setupFiles` lists:

```javascript
//filename: jest-fusion-config.js
import { setFusionConfiguration } from '@g_package/jest-cucumber-fusion'

setFusionConfiguration( { tagFilter: '@smoke and not @slow' } )
```

```json
"jest": {
    "testMatch": [ "**/*.steps.js" ],
    "setupFiles": [ "./jest-fusion-config.js" ]
}
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
import js from '@eslint/js'
import globals from 'globals'
import jest from 'eslint-plugin-jest'

export default [
  js.configs.recommended,
  {
    languageOptions: { sourceType: 'module', globals: globals.node },
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

## Using CommonJS instead

Fusion ships a CommonJS build beside its ES modules: `require` gets the CommonJS build and `import` gets the ES modules. Use CommonJS if your project already is CommonJS, if you need Node 18 (CommonJS runs on Node 18.14 and newer), or if you would rather not run Jest's experimental ES module mode. CommonJS needs no Jest set-up at all.

The steps in [Getting Started](#getting-started) work with these changes.

**package.json.** Leave out `"type": "module"`, and run Jest directly:

```json
"scripts": { "test": "jest" },
"jest": { "testMatch": [ "**/*.steps.js" ] }
```

**The code under test** exports with `module.exports`:

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

**Step definition files** `require` the same names. A relative `require` may leave the extension out:

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

The `jest` object is a global, as in any CommonJS Jest project.

**A global configuration script** `require`s `setFusionConfiguration`:

```javascript
//filename: jest-fusion-config.js
const { setFusionConfiguration } = require( '@g_package/jest-cucumber-fusion' )

setFusionConfiguration( { tagFilter: '@smoke and not @slow' } )
```

**ESLint.** The configuration file is CommonJS too, with `sourceType: 'commonjs'`:

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

**Mixing the two styles** works. A CommonJS shared step library can serve ES module step files, and a CommonJS setup script can configure ES module steps: both styles share one set of step definitions and one global configuration. An ES module imports a CommonJS file by its full name, for example `import './shared-steps.cjs'`.

The other pages in this documentation show ES modules. To use one of their examples in CommonJS, turn each `import { … } from '…'` into `const { … } = require( '…' )` and each `export` into `module.exports`.

## Using TypeScript

Fusion ships its type definitions, and TypeScript finds the right ones for ES modules and CommonJS with no configuration. To run step definition files written in TypeScript, Jest needs a transform. [ts-jest](https://kulshekhar.github.io/ts-jest/) is the usual one.

```
npm install --save-dev jest ts-jest typescript @types/jest @g_package/jest-cucumber-fusion
```

### ES modules (recommended)

```json
"type": "module",
"scripts": {
  "test": "node --experimental-vm-modules node_modules/jest/bin/jest.js",
  "typecheck": "tsc --noEmit"
}
```

```json
//filename: tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "isolatedModules": true,
    "strict": true,
    "types": [ "jest" ]
  }
}
```

```javascript
//filename: jest.config.js
export default {
  preset: 'ts-jest/presets/default-esm',
  testMatch: [ '**/*.steps.ts' ],
  moduleNameMapper: { '^(\\.{1,2}/.*)\\.js$': '$1' },
}
```

**Run `npm run typecheck` as well as `npm test`, for example in CI.** In ES module mode ts-jest only strips the types and does not check them, so a type error does not fail `npm test`; `tsc --noEmit` is what reports it. (`isolatedModules` tells ts-jest that this is expected. Without it, ts-jest warns `TS151002` and still does not check.)

`moduleNameMapper` lets your imports keep the `.js` extension that ES modules need, while Jest loads the `.ts` file: `import { Rocket } from '../../src/rocket.js'` loads `src/rocket.ts`.

### CommonJS

Leave out `"type": "module"` and `isolatedModules`, and use ts-jest's default preset:

```json
"scripts": {
  "test": "jest",
  "typecheck": "tsc --noEmit"
}
```

```javascript
//filename: jest.config.js
module.exports = {
  preset: 'ts-jest',
  testMatch: [ '**/*.steps.ts' ],
  moduleNameMapper: { '^(\\.{1,2}/.*)\\.js$': '$1' },
}
```

Here ts-jest checks types while it runs the tests, so a type error fails `npm test` too.

### Typed step definitions

To move the [Getting Started](#getting-started) example to TypeScript, renaming its files to `.ts` is not enough under `strict`: `tsc --noEmit` then reports the `Rocket` class's fields as undeclared (`TS2339`) and `let rocket` as an implicit `any` (`TS7034`). Declare the fields in the class and write `let rocket: Rocket`, as the example below does. A step may also declare the type of each argument it receives: a capture or a docstring arrives as a `string`, and a data table as an `Array<Record<string, string>>` of its rows. For example, with this feature:

```gherkin
###filename: test/features/launch.feature
Feature: Launch

Scenario: Launching a batch of rockets
  Given I am launching 3 rockets
  When the countdown says
    """
    ignition
    """
  Then the manifest has
    | name   |
    | Falcon |
```

and this code under test:

```typescript
//filename: src/launch.ts
export class Launch {
    launched = 0
    count: number

    constructor( count: number ) {
        this.count = count
    }

    countdown( word: string ): void {
        if ( word === 'ignition' ) this.launched = this.count
    }
}
```

the steps declare a `string` for the capture and the docstring, and the rows for the table:

```typescript
//filename: test/features/launch.steps.ts
import { Given, When, Then, Fusion } from '@g_package/jest-cucumber-fusion'

import { Launch } from '../../src/launch.js'

let launch: Launch

Given( /^I am launching (\d+) rockets$/, ( count: string ) => {
    launch = new Launch( Number( count ) )
} )

When( 'the countdown says', ( words: string ) => {
    launch.countdown( words.trim() )
} )

Then( 'the manifest has', ( rows: Array<Record<string, string>> ) => {
    expect( rows ).toStrictEqual( [ { name: 'Falcon' } ] )
    expect( launch.launched ).toBe( 3 )
} )

Fusion( 'launch.feature' )
```

An argument you leave undeclared has the type `StepArgument` (`string | Array<Record<string, string>>`), which you can import from the package.

## Additional Documentation 

Using the package:

  * [Step definition arguments](./docs/StepDefinitionArguments.md)
  * [Gherkin tables](./docs/GherkinTables.md)
  * [Scenario outlines](./docs/ScenarioOutlines.md)
  * [Re-using step definitions](./docs/ReusingStepDefinitions.md)
  * [Language](./docs/Language.md)
  * [Configuration options](./docs/AdditionalConfiguration.md): every export and option
  * [Migrating to version 3](./docs/Migrating.md)

Working on the package:

  * [Running the examples](./docs/RunningTheExamples.md)
  * [Architecture](./docs/Architecture.md)

Every example on the guide pages above runs as written: the repository's tests copy each one into a fresh project and run it.
