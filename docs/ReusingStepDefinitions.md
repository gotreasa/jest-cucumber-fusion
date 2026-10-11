# Re-using step definitions

The examples on this page are ES modules, laid out as in [Getting Started](../README.md#getting-started). For CommonJS, see [Written as CommonJS](#written-as-commonjs) at the end.

Fusion registers a step definition wherever it is called, so a step used by several feature files can live in one shared file that each steps file imports. Keep step code light, with common set-up in modules of its own (test data creation, for example), and there is little left to duplicate. When some remains, share it like this:

```gherkin
# filename: test/features/reuse-rocket.feature
Feature: Rocket reuse

Scenario: Reusing a SpaceX rocket
  Given I am Elon Musk and I launched a rocket in space already
  Then I'm happy
```

Write your step definitions as usual, and import your shared step definition file by its full name, extension included. An `import` always runs before the rest of the file, wherever it is written, so the shared steps are registered first. That is safe, because Fusion binds every step only when `Fusion(...)` runs.

```javascript
// filename: test/features/reuse-rocket.steps.js
import { Given, Fusion } from '@g_package/jest-cucumber-fusion'
import './happy-steps.js' // our shared test code

Given( 'I am Elon Musk and I launched a rocket in space already', () => {
    const hasLaunchedARocket = true
    expect( hasLaunchedARocket ).toBe( true )
} )

Fusion( 'reuse-rocket.feature' )
```

Name the shared file so that Jest's `testMatch` does not pick it up as a test file of its own (`happy-steps.js`, not `happy.steps.js`):

```javascript
// filename: test/features/happy-steps.js
import { Then } from '@g_package/jest-cucumber-fusion'

Then( 'I\'m happy', () => {
    const localHappy = true
    expect( localHappy ).toBe( true )
} )
```


### Sharing a value with the shared steps

A shared step sometimes needs a value that the steps file creates, such as the rocket a `Given` step builds. The shared file cannot import that variable, and reading it once when the file loads would give `undefined`, because the `Given` step has not run yet. So the steps file passes in a function that returns the current value, and each shared step calls it when it runs. Keep this rare: steps that share a lot of state are usually easier to follow in one file.

For example, with this feature:

```gherkin
# filename: test/features/reuse-definition.feature
Feature: Rocket relaunch

Scenario: Relaunching a SpaceX rocket
  Given I am Elon Musk and I launched a rocket in space already
  When I relaunch the rocket
  Then the rocket end up in space again
  And I drop my mic
```

The code under test is the `Rocket` from [Getting Started](../README.md#getting-started):

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

The steps file keeps the rocket in its own variable and passes a function that returns it. The shared file exports a function that takes that accessor and registers its steps:

```javascript
// filename: test/features/reuse-definition.steps.js
import { Given, Fusion } from '@g_package/jest-cucumber-fusion'
import { Rocket } from '../../src/rocket.js'
import registerRelaunchSteps from './relaunch-steps.js'

let rocket
function getCurrentRocket() {
    return rocket
}

Given( 'I am Elon Musk and I launched a rocket in space already', () => {
    rocket = new Rocket()
} )

registerRelaunchSteps( getCurrentRocket )

Fusion( 'reuse-definition.feature' )
```

Inside your shared step file, be careful to call the accessor inside your test step function, not outside:

```javascript
// filename: test/features/relaunch-steps.js
import { When, Then, And } from '@g_package/jest-cucumber-fusion'

And( 'I drop my mic', () => {
    const micDropped = true
    expect( micDropped ).toBe( true )
} )

export default function registerRelaunchSteps( fnRocket ) {
    When( 'I relaunch the rocket', () => {
        const rocketUsed = fnRocket()
        rocketUsed.launch()
    } )

    Then( 'the rocket end up in space again', () => {
        const rocketUsed = fnRocket()
        expect( rocketUsed.isInSpace ).toBe(true)
    } )
}
```


## Written as CommonJS

The same examples work in CommonJS (see [Using CommonJS](./CommonJS.md) for the set-up): turn each `import` into a `require`, and each `export default function` into `module.exports = function`. A shared file is required by name, and its extension may be left out: `require( './happy-steps' )`.

A shared file written as CommonJS can also serve steps written as ES modules: import it by its full file name, for example `import './happy-steps.cjs'`.
