# Step definition arguments

The examples on this page are ES modules, laid out as in [Getting Started](../README.md#getting-started). For CommonJS, see [Using CommonJS](./CommonJS.md).

A step definition is matched by a string or by a regular expression.

- **A string** matches a step whose text is exactly that string, and the step function receives no captured values.
- **A regular expression** matches a step whose text it matches, and the step function receives each capture group's value as an argument, in order.

For example, with this feature:

```gherkin
# filename: test/features/bank-account.feature
Feature: Bank account

Scenario: Depositing money
  Given my account balance is $10
  When I deposit $1000
  Then my account balance should be $1010
```

The code under test:

```javascript
// filename: src/bank-account.js
export class BankAccount {
    balance = 0

    deposit( amount ) {
        this.balance += amount
    }
}
```

Each regular expression captures the amount, which the step converts to a number. The `Before` hook gives every scenario a fresh account (see [Hooks](../README.md#hooks)):

```javascript
// filename: test/features/bank-account.steps.js
import { Before, Given, When, Then, Fusion } from '@g_package/jest-cucumber-fusion'

import { BankAccount } from '../../src/bank-account.js'

let myAccount

Before( () => {
    myAccount = new BankAccount()
} )

Given( /^my account balance is \$(\d+)$/, ( balance ) => {
    myAccount.deposit( Number( balance ) )
} )

When( /^I deposit \$(\d+)$/, ( amount ) => {
    myAccount.deposit( Number( amount ) )
} )

Then( /^my account balance should be \$(\d+)$/, ( expectedBalance ) => {
    expect( myAccount.balance ).toBe( Number( expectedBalance ) )
} )

Fusion( 'bank-account.feature' )
```

## What a step function receives

A step function receives its arguments in this order:

1. **Each capture**, as a **string**. Convert it yourself, as the steps above do with `Number( balance )`. A group that did not take part in the match, such as an optional `( in a box)?`, arrives as `undefined`.
2. **The docstring**, if the step has one, as one more string.
3. **The data table**, if the step has one, last, as an array of row objects (see [Gherkin tables](./GherkinTables.md)).

In TypeScript you can declare these types on the step function's parameters (see [Typed step definitions](./TypeScript.md#typed-step-definitions)).

Fusion does not support Cucumber Expressions such as `{int}` or `{string}`: a string is compared as plain text, so `'I add {int} products'` matches only a step with exactly that text. Use a regular expression to capture values.

A step that receives a docstring, after its captures:

```gherkin
# filename: test/features/release-notes.feature
Feature: Release notes

Scenario: Publishing a note
  Given version 3 is released with the note
    """
    Fusion now runs on Jest directly.
    """
  Then the note for version 3 reads "Fusion now runs on Jest directly."
```

```javascript
// filename: test/features/release-notes.steps.js
import { Given, Then, Fusion } from '@g_package/jest-cucumber-fusion'

const notes = {}

Given( /^version (\d+) is released with the note$/, ( version, note ) => {
    notes[ version ] = note
} )

Then( /^the note for version (\d+) reads "(.*)"$/, ( version, expected ) => {
    expect( notes[ version ] ).toBe( expected )
} )

Fusion( 'release-notes.feature' )
```

Next: [Background](./Background.md), for steps every scenario of a feature starts with.
