# Using TypeScript

Fusion ships its type definitions, and TypeScript finds the right ones for ES modules and CommonJS with no configuration. To run step definition files written in TypeScript, Jest needs a transform. [ts-jest](https://kulshekhar.github.io/ts-jest/) is the usual one.

```
npm install --save-dev jest ts-jest typescript @types/jest @g_package/jest-cucumber-fusion
```

The Jest configuration moves into a `jest.config.js`. **Jest reads one configuration, so if your `package.json` has a `jest` key from Getting Started, delete it** and keep any other keys you added there, such as `setupFiles` or the coverage keys, in `jest.config.js`. With both, Jest stops with `Multiple configurations found`.

## ES modules (recommended)

```json
"type": "module",
"scripts": {
  "test": "node --experimental-vm-modules node_modules/jest/bin/jest.js",
  "typecheck": "tsc --noEmit"
}
```

```json
// filename: tsconfig.json
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
// filename: jest.config.js
export default {
  preset: 'ts-jest/presets/default-esm',
  testMatch: [ '**/*.steps.ts' ],
  moduleNameMapper: { '^(\\.{1,2}/.*)\\.js$': '$1' },
}
```

**Run `npm run typecheck` as well as `npm test`, for example in CI.** In ES module mode ts-jest only strips the types and does not check them, so a type error does not fail `npm test`; `tsc --noEmit` is what reports it. (`isolatedModules` tells ts-jest that this is expected. Without it, ts-jest warns `TS151002` and still does not check.)

`moduleNameMapper` lets your imports keep the `.js` extension that ES modules need, while Jest loads the `.ts` file: `import { Rocket } from '../../src/rocket.js'` loads `src/rocket.ts`.

## CommonJS

Leave out `"type": "module"`, compile to CommonJS, and use ts-jest's default preset:

```json
"scripts": {
  "test": "jest",
  "typecheck": "tsc --noEmit"
}
```

```json
// filename: tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "CommonJS",
    "strict": true,
    "types": [ "jest" ]
  }
}
```

`"module": "CommonJS"` is what lets ts-jest check types here. With `NodeNext` or `Node16`, ts-jest warns `TS151002` and asks for `isolatedModules`, which would switch its checking off.

```javascript
// filename: jest.config.js
module.exports = {
  preset: 'ts-jest',
  testMatch: [ '**/*.steps.ts' ],
  moduleNameMapper: { '^(\\.{1,2}/.*)\\.js$': '$1' },
}
```

Here ts-jest checks types while it runs the tests, so a type error fails `npm test` too.

## Typed step definitions

Renaming the [Getting Started](../README.md#getting-started) files to `.ts` is not enough under `strict`: `tsc --noEmit` then reports the `Rocket` class's fields as undeclared (`TS2339`) and `let rocket` as an implicit `any` (`TS7034`). Declare the fields in the class, and give the variable its type: `let rocket: Rocket`. The example below shows the same pattern with a `Launch` class.

A step may also declare the type of each argument it receives: a capture or a docstring arrives as a `string`, and a data table as an `Array<Record<string, string>>` of its rows. For example, with this feature:

```gherkin
# filename: test/features/launch.feature
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
  And all 3 rockets are launched
```

and this code under test:

```typescript
// filename: src/launch.ts
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
// filename: test/features/launch.steps.ts
import { Given, When, Then, And, Fusion } from '@g_package/jest-cucumber-fusion'

import { Launch } from '../../src/launch.js'

let launch: Launch

Given( /^I am launching (\d+) rockets$/, ( count: string ) => {
    launch = new Launch( Number( count ) )
} )

When( 'the countdown says', ( words: string ) => {
    launch.countdown( words )
} )

Then( 'the manifest has', ( rows: Array<Record<string, string>> ) => {
    expect( rows ).toStrictEqual( [ { name: 'Falcon' } ] )
} )

And( /^all (\d+) rockets are launched$/, ( count: string ) => {
    expect( launch.launched ).toBe( Number( count ) )
} )

Fusion( 'launch.feature' )
```

An argument you leave undeclared has the type `StepArgument` (`string | Array<Record<string, string>>`), which you can import from the package.
