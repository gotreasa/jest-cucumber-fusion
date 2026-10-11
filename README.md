# Jest Cucumber Fusion

Write Cucumber feature files and run them as Jest tests, without the scaffolding.

[![Build Status](https://github.com/gotreasa/jest-cucumber-fusion/workflows/Continuous%20Integration/badge.svg)](https://github.com/gotreasa/jest-cucumber-fusion/actions?query=workflow%3A%22Continuous+Integration%22)
[![Codecov](https://codecov.io/gh/gotreasa/jest-cucumber-fusion/branch/master/graph/badge.svg)](https://codecov.io/gh/gotreasa/jest-cucumber-fusion)

[![npm downloads](https://img.shields.io/npm/dm/@g_package/jest-cucumber-fusion)](https://www.npmjs.com/package/@g_package/jest-cucumber-fusion)
[![npm latest](https://img.shields.io/npm/v/@g_package/jest-cucumber-fusion/latest.svg)](https://www.npmjs.com/package/@g_package/jest-cucumber-fusion)
[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/semantic-release/semantic-release)

## Overview

Jest Cucumber Fusion runs your Cucumber feature files as Jest tests. You write the feature file in Gherkin, and a step definition file with a `Given`, `When`, `Then`, `And` or `But` definition for each step. A `Fusion` call at the end of the step definition file links the two: Fusion reads the feature and creates one Jest test per scenario, so you write no `describe` or `it` blocks yourself. Everything else is plain Jest: `expect`, mocks, coverage and reporting.

**New to Gherkin?** A feature file describes behaviour in plain sentences. It holds one `Feature`, and each `Scenario` in it is one example of that behaviour. Each line of a scenario starting with `Given`, `When`, `Then`, `And` or `But` is a step, and a step definition is the code that runs for one step. The [Gherkin reference](https://cucumber.io/docs/gherkin/reference/) covers the full syntax.

**Upgrading** from version 2, or from `jest-cucumber-fusion` 0.8.x? Your feature and step definition files keep their shape. [Migrating to version 3](./docs/Migrating.md) lists what changes.

## Getting Started

These steps set up a project whose files are ES modules (they use `import` and `export`), which is the recommended way to use Fusion. You need Node 20.11 or newer. If your project is CommonJS (it uses `require`), or you need Node 18, follow these steps with the changes in [Using CommonJS](./docs/CommonJS.md). For step files written in TypeScript, see [Using TypeScript](./docs/TypeScript.md).

### Start a project

```
mkdir my-project
cd my-project
npm init -y
npm install --save-dev jest @g_package/jest-cucumber-fusion
```

### Set these keys in your package.json

```json
"type": "module",
"scripts": { "test": "node --experimental-vm-modules node_modules/jest/bin/jest.js" },
"jest": { "testMatch": [ "**/*.steps.js" ] }
```

`npm init -y` already wrote `"type": "commonjs"` and a placeholder `test` script, so replace those two rather than adding a second copy: when a key appears twice in `package.json`, the last one silently wins.

- `"type": "module"` makes Node read your `.js` files as ES modules. If you would rather not set it, name your step files and the code they import `.mjs` instead (and import them by that name, for example `'../../src/rocket.mjs'`), and change `testMatch` to `[ "**/*.steps.mjs" ]`.
- Jest runs ES modules only in its ES module mode, which Node's `--experimental-vm-modules` flag turns on. This form of the `test` script is the one Jest's own documentation gives, and it does not depend on your shell's syntax. Node prints an `ExperimentalWarning` about the flag on each run. That is expected.
- `testMatch` tells Jest that your step definition files are the test files.

### Lay out your project

The examples below use this layout. Any layout works, as long as each `import` path and each `Fusion` path matches where your files are.

```
my-project/
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
// filename: src/rocket.js
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

### Write the feature file

```gherkin
# filename: test/features/rocket-launching.feature
Feature: Rocket Launching

Scenario: Launching a SpaceX rocket
  Given I am Elon Musk attempting to launch a rocket into space
  When I launch the rocket
  Then the rocket should end up in space
  And the boosters should land back on the launch pad
```

### Write the step definitions

The step definition file registers a definition for each step, then calls `Fusion` with the feature file's path:

```javascript
// filename: test/features/rocket-launching.steps.js
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
    expect( rocket.isInSpace ).toBe( true )
} )

And( 'the boosters should land back on the launch pad', () => {
    expect( rocket.boostersLanded ).toBe( true )
} )

Fusion( 'rocket-launching.feature' )
```

- **A string matches a step whose text is exactly that string.** To capture a value from a step, such as a number, match it with a regular expression instead: see [Step definition arguments](./docs/StepDefinitionArguments.md).
- **A step binds only to a definition registered with its own keyword.** An `And` step needs an `And(...)` definition, and a `Then(...)` definition with the same text does not serve it. When one definition should serve several keywords, chain it: `Then( And( 'text', fn ) )` registers it under both. Import only the keywords your steps use; `But` is also available.
- **`Fusion` comes last**, after every definition, and its path is relative to the step definition file, so a feature file beside it is named on its own.
- **A relative `import` names the file in full**, extension included: `'../../src/rocket.js'`, not `'../../src/rocket'`.
- **`expect` and the other test globals work as usual.** The `jest` object (for `jest.fn()` and friends) is not a global in Jest's ES module mode: add `@jest/globals` to your `devDependencies` and write `import { jest } from '@jest/globals'`.

### Run the tests

```
npm test
```

Jest reports one test for the scenario, named after it:

```text
 PASS  test/features/rocket-launching.steps.js
  Rocket Launching
    ✓ Launching a SpaceX rocket (2 ms)

Test Suites: 1 passed, 1 total
Tests:       1 passed, 1 total
```

A test fails at the first step that fails, and names that step. If a step has no definition at all, Fusion refuses the whole file before any test runs, and gives you the code to add. Without the `And` definition above, for example:

```text
 FAIL  test/features/rocket-launching.steps.js
  ● Test suite failed to run

    Fusion found 1 step in the feature "Rocket Launching" that no registered step definition matches.
    ...
      1. No step definition matches: "the boosters should land back on the launch pad"
         And("the boosters should land back on the launch pad", () => {});
```

## Hooks

`Before` and `After` run a function before or after every scenario of the `Fusion` call that follows them, which is the place to give each scenario a fresh start:

```javascript
import { Before, Given, When, Then, And, Fusion } from '@g_package/jest-cucumber-fusion'

import { Rocket } from '../../src/rocket.js'

let rocket

Before( () => {
    rocket = new Rocket()
} )

// ...the step definitions, which no longer need to create the rocket...

Fusion( 'rocket-launching.feature' )
```

Register hooks, like step definitions, before the `Fusion` call. A hook may be `async`, and it receives nothing, so declare no parameters: Jest treats a declared parameter as a `done` callback and waits for it to be called.

## If you know Cucumber

Most of Gherkin works as you expect: `Background`, `Rule`, `Scenario Outline` with `Examples`, data tables, docstrings, tags and [80 languages](./docs/Language.md). The differences:

- **Steps bind by keyword.** An `And` step needs an `And` definition, as above.
- **No Cucumber Expressions.** A string is compared as plain text, so `'I have {int} cukes'` matches only that exact text. Use a regular expression to capture values: `/^I have (\d+) cukes$/`.
- **No `*` steps.** Because a step binds by its keyword, Fusion refuses a `*` step and asks you to write it with `Given`, `When`, `Then`, `And` or `But`.
- **No World.** Steps are plain functions with no shared `this`. Share state through variables in the step definition file, and reset it in a `Before` hook.
- **Hooks take no tags.** `Before` and `After` run around every scenario of their `Fusion` call.
- **Tags select scenarios through an option**, `tagFilter`, rather than a command-line flag: see [Configuration options](./docs/AdditionalConfiguration.md#tag-filtering). Jest's own `-t` filter also works, on scenario names.

## Where next

| To | Read |
|---|---|
| use CommonJS, or Node 18 | [Using CommonJS](./docs/CommonJS.md) |
| write step definitions in TypeScript | [Using TypeScript](./docs/TypeScript.md) |
| lint step files with ESLint | [Linting with ESLint](./docs/ESLint.md) |
| capture values from a step, or read a docstring | [Step definition arguments](./docs/StepDefinitionArguments.md) |
| use a data table | [Gherkin tables](./docs/GherkinTables.md) |
| run one scenario for every row of an `Examples` table | [Scenario outlines](./docs/ScenarioOutlines.md) |
| share steps between feature files | [Re-using step definitions](./docs/ReusingStepDefinitions.md) |
| write feature files in another language | [Language](./docs/Language.md) |
| filter by tag, name tests, or set options once for every file | [Configuration options](./docs/AdditionalConfiguration.md) |
| upgrade from version 2 or 0.8.x | [Migrating to version 3](./docs/Migrating.md) |

The [documentation index](./docs/README.md) lists every page, including the ones for working on the package itself.

**Coverage** works as in any Jest project, because Fusion's tests are Jest tests: run `npm test -- --coverage`, and add `"coveragePathIgnorePatterns": [ "/node_modules/", "/test/" ]` to the `jest` key to leave your step files out of the report.

## Troubleshooting

- **`SyntaxError: Unexpected token 'with'`** when Jest loads your ES module steps: your Node is older than 20.11, which ES module steps need. Upgrade Node, or [use CommonJS](./docs/CommonJS.md), which runs from Node 18.14.
- **`npm WARN EBADENGINE` on Node 18**, naming `brace-expansion` or `lru-cache`: these come from Jest 30's own dependencies, not from Fusion. CommonJS steps still run on Node 18.14 and newer.
- **`No step definition matches`** for a step you did define: the step's keyword decides which definitions it can bind to. An `And` step needs an `And(...)` definition (see [Write the step definitions](#write-the-step-definitions)).
- **`Your test suite must contain at least one test`**: the feature file has no `Feature:` line, or no scenarios, so Fusion registered nothing. Check the path passed to `Fusion` and the file's first lines.
- **`Multiple configurations found`**: Jest found both a `jest` key in `package.json` and a `jest.config.js`. Keep one: see [Using TypeScript](./docs/TypeScript.md).
- **A `Before` hook times out waiting for `done()`**: the hook declares a parameter. Remove it (see [Hooks](#hooks)).
- **Jest prints only the summary, without the list of tests:** Jest shortens its output when it detects an AI agent's environment variables, such as `AI_AGENT` or `CLAUDECODE`. Run it from a terminal that does not have them.
