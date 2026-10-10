# Step definition arguments

The examples on this page are ES modules, laid out as in [Getting Started](../README.md#getting-started). For CommonJS, see [Using CommonJS instead](../README.md#using-commonjs-instead).

A step definition is matched by a string or by a regular expression.

- **A string** matches a step whose text is exactly that string, and the step function receives no captured values.
- **A regular expression** matches a step whose text it matches, and the step function receives each capture group's value as an argument, in order.

Every captured value arrives as a **string**, so convert it yourself, for example with `Number( balance )`. If the step also has a docstring, the docstring's text arrives as one more string after the captures; if it has a data table, the table arrives last as an array of row objects (see [Gherkin tables](./GherkinTables.md)). In TypeScript you can declare these types on the step function's parameters (see [Typed step definitions](../README.md#typed-step-definitions)).

```gherkin
# filename: test/features/bank-account.feature
Feature: Getting rich writing software

Scenario: Depositing a paycheck
  Given my account balance is $10
  When I get paid $1000000 for writing some awesome code
  Then my account balance should be $1000010
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

Each regular expression captures the amount, which the step converts to a number:

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

When( /^I get paid \$(\d+) for writing some awesome code$/, ( paycheck ) => {
    myAccount.deposit( Number( paycheck ) )
} )

Then( /^my account balance should be \$(\d+)$/, ( expectedBalance ) => {
    expect( myAccount.balance ).toBe( Number( expectedBalance ) )
} )

Fusion( 'bank-account.feature' )
```

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
    notes[ version ] = note.trim()
} )

Then( /^the note for version (\d+) reads "(.*)"$/, ( version, expected ) => {
    expect( notes[ version ] ).toBe( expected )
} )

Fusion( 'release-notes.feature' )
```
