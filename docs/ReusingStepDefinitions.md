# Re-using step definitions

One of the advantages of using jest-cucumber-fusion is that it will manage your test suite scope inside its execution
Your automation code easy to read: it reads pretty much like your feature file. 
You can then reuse the same steps repeatedly in multiple scenarios.

It is normally recommended that your test code contain as little logic as possible, with common setup logic abstracted into other modules (e.g., test data creation), so there really shouldn't be much duplicated code in the first place. To further reduce duplicated code, you could do something like this:
```gherkin
# reuse-rocket.feature
Feature: Rocket reuse

Scenario: Reusing a SpaceX rocket
  Given I am Elon Musk and I launched a rocket in space already
  Then I'm happy
```

Write your step definitions as usual but require (or import) your shared step definition file
```javascript
// reuse-rocket.steps.js
const { Given, Fusion } = require( '@g_package/jest-cucumber-fusion' )



Given( 'I am Elon Musk and I launched a rocket in space already', () => {
    const hasLaunchedARocket = true
    expect( hasLaunchedARocket ).toBe( true )
} )

///
///This is our shared test code
///
require( './reuse-code' )


Fusion( '../reuse-rocket.feature' )
```

Place your shared step definitions in a shared step definition file, jest-cucumber-fusion takes care of the rest
```javascript
// reuse-code.js
const { Then } = require( '@g_package/jest-cucumber-fusion' )

Then( 'I\'m happy', () => {
    const localHappy = true
    expect( localHappy ).toBe( true )
} )
```


### Managing dependencies
Though it is not best practice, you sometimes need to pass a value to the shared step definitions file, like in this example:

```gherkin
# reuse-definition.feature
Feature: Rocket reuse

Scenario: Reusing a SpaceX rocket
  Given I am Elon Musk and I launched a rocket in space already
  When I relaunch the rocket
  Then the rocket end up in space again
  And I drop my mic
```


You will now need to encapsulate the variables in an accessor function and pass the accessor to the constructor/init of your file
```javascript
// reuse-definition.steps.js
const { Given, Fusion } = require( '@g_package/jest-cucumber-fusion' )

const { Rocket } = require( '../../../src/rocket' )

let rocket
function getCurrentRocket() {
	return rocket
}

Given( 'I am Elon Musk and I launched a rocket in space already', () => {
	rocket = new Rocket()
} )


require( './reuse-code' )( getCurrentRocket )


Fusion( '../reuse-definition.feature' )
```


Inside your shared step file, be careful to call the accessor inside your test step function not outside
```javascript
// reuse-code.js
const { When, Then, And } = require( '@g_package/jest-cucumber-fusion' )

And( 'I drop my mic', () => {  
    const micDropped = true
    expect( micDropped ).toBe( true )
} )

module.exports = exports = function( fnRocket ) {
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


## Written as ES modules

The same two examples, for steps written as ES modules (see [Using ES modules](../README.md#using-es-modules) for the set-up). Two things change. A shared file is imported, with its extension. An `import` always runs before the rest of the file, wherever it is written, so the shared steps are registered first. That is safe, because Fusion binds every step only when `Fusion(...)` runs.

```javascript
// reuse-rocket.steps.js
import { Given, Fusion } from '@g_package/jest-cucumber-fusion'
import './reuse-code.js' // our shared test code

Given( 'I am Elon Musk and I launched a rocket in space already', () => {
    const hasLaunchedARocket = true
    expect( hasLaunchedARocket ).toBe( true )
} )

Fusion( '../reuse-rocket.feature' )
```

```javascript
// reuse-code.js
import { Then } from '@g_package/jest-cucumber-fusion'

Then( 'I\'m happy', () => {
    const localHappy = true
    expect( localHappy ).toBe( true )
} )
```

To pass a value to the shared steps, the shared file exports the function, and the steps file imports it and calls it:

```javascript
// reuse-definition.steps.js
import { Given, Fusion } from '@g_package/jest-cucumber-fusion'
import { Rocket } from '../../../src/rocket.js'
import registerRelaunchSteps from './reuse-code.js'

let rocket
function getCurrentRocket() {
	return rocket
}

Given( 'I am Elon Musk and I launched a rocket in space already', () => {
	rocket = new Rocket()
} )

registerRelaunchSteps( getCurrentRocket )

Fusion( '../reuse-definition.feature' )
```

```javascript
// reuse-code.js
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

A shared file written as CommonJS can also serve steps written as ES modules: import it by its file name, for example `import './reuse-code.cjs'`.
