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

Place your shared step definitions in a shared step definition file, and Fusion takes care of the rest. Name it so that Jest's `testMatch` does not pick it up as a test file of its own (`happy-steps.js`, not `happy.steps.js`):

```javascript
// filename: test/features/happy-steps.js
import { Then } from '@g_package/jest-cucumber-fusion'

Then( 'I\'m happy', () => {
    const localHappy = true
    expect( localHappy ).toBe( true )
} )
```


### Managing dependencies
Though it is not best practice, you sometimes need to pass a value to the shared step definitions file, like in this example:

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

You will now need to encapsulate the variables in an accessor function. The shared file exports a function that takes the accessor, and the steps file imports it and calls it:

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

The same two examples in CommonJS (see [Using CommonJS instead](../README.md#using-commonjs-instead) for the set-up). A shared file is required, and its extension may be left out.

```javascript
// reuse-rocket.steps.js
const { Given, Fusion } = require( '@g_package/jest-cucumber-fusion' )

Given( 'I am Elon Musk and I launched a rocket in space already', () => {
    const hasLaunchedARocket = true
    expect( hasLaunchedARocket ).toBe( true )
} )

require( './happy-steps' ) // our shared test code

Fusion( 'reuse-rocket.feature' )
```

```javascript
// happy-steps.js
const { Then } = require( '@g_package/jest-cucumber-fusion' )

Then( 'I\'m happy', () => {
    const localHappy = true
    expect( localHappy ).toBe( true )
} )
```

To pass a value to the shared steps, the shared file exports the function with `module.exports`, and the steps file requires it and calls it:

```javascript
// reuse-definition.steps.js
const { Given, Fusion } = require( '@g_package/jest-cucumber-fusion' )

const { Rocket } = require( '../../src/rocket' )

let rocket
function getCurrentRocket() {
	return rocket
}

Given( 'I am Elon Musk and I launched a rocket in space already', () => {
	rocket = new Rocket()
} )

require( './relaunch-steps' )( getCurrentRocket )

Fusion( 'reuse-definition.feature' )
```

```javascript
// relaunch-steps.js
const { When, Then, And } = require( '@g_package/jest-cucumber-fusion' )

And( 'I drop my mic', () => {
    const micDropped = true
    expect( micDropped ).toBe( true )
} )

module.exports = function( fnRocket ) {
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

A shared file written as CommonJS can also serve steps written as ES modules: import it by its full file name, for example `import './happy-steps.cjs'`.
