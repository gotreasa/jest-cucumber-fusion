# Linting with ESLint

This page is for linting step definition files. [eslint-plugin-jest](https://github.com/jest-community/eslint-plugin-jest) gives ESLint Jest's globals, such as `expect`, and its rules. One rule needs to be told about Fusion. `jest/no-standalone-expect` reports every `expect` that is not inside a `test` or `it` block, and in a step definition file every `expect` sits inside `Then`, `And` or another step function instead. Each step function runs inside the test that Fusion makes for its scenario, and each `Before` and `After` hook in that test's `beforeEach` or `afterEach`, so tell the rule to treat them as test blocks.

Install ESLint and the plugin:

```
npm install --save-dev eslint @eslint/js globals eslint-plugin-jest
```

ESLint 10 needs Node 20.19 or newer, 22.13 or newer, or 24 and newer. On an older Node (18.18 or newer), install ESLint 9 and the matching Jest plugin instead; the configurations below work with them:

```
npm install --save-dev eslint@9 @eslint/js@9 eslint-plugin-jest@28 globals
```

## ES modules

Add an `eslint.config.js` to your project:

```javascript
// filename: eslint.config.js
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
      // Fusion runs each step inside the test it makes for the scenario, and each hook in
      // that test's beforeEach or afterEach.
      'jest/no-standalone-expect': [ 'error', {
        additionalTestBlockFunctions: [ 'Given', 'When', 'Then', 'And', 'But', 'Before', 'After' ],
      } ],
    },
  },
]
```

Run it with `npx eslint .`. Without the `jest/no-standalone-expect` options, every `expect` in a steps file is reported as `Expect must be inside of a test block`. With them, an `expect` that really is outside a step, a hook or a test is still reported.

If your shared step files are not named `*.steps.js` (see [Re-using step definitions](./ReusingStepDefinitions.md)), or you named your files `.mjs`, add those names to `files`.

## CommonJS

In a CommonJS project the configuration file is CommonJS too. It differs from the one above in three places: the three `import` lines become `require` calls, `export default` becomes `module.exports =`, and `sourceType` is `'commonjs'`:

```javascript
// filename: eslint.config.js
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
      // Fusion runs each step inside the test it makes for the scenario, and each hook in
      // that test's beforeEach or afterEach.
      'jest/no-standalone-expect': [ 'error', {
        additionalTestBlockFunctions: [ 'Given', 'When', 'Then', 'And', 'But', 'Before', 'After' ],
      } ],
    },
  },
]
```
