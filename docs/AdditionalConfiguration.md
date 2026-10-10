# Configuration Options

This page is the reference for what the package exports and for every option `Fusion` accepts. It assumes the set-up from [Getting Started](../README.md#getting-started). The examples are ES modules; for CommonJS, see [Using CommonJS instead](../README.md#using-commonjs-instead).

## What the package exports

| Export | Call it as | What it does |
|---|---|---|
| `Given`, `When`, `Then`, `And`, `But` | `Given( stringOrRegExp, stepFunction )` | Registers a step definition for steps with that keyword. Returns a chain you can hand to another verb. |
| | `Then( And( stringOrRegExp, stepFunction ) )` | The chained form: registers the same definition under a second keyword, so a step binds to it with either. |
| `Before`, `After` | `Before( hookFunction )` | Runs the function before or after every scenario of the file. It receives no arguments and may be `async`. |
| `Fusion` | `Fusion( featurePath, options? )` | Reads the feature file (relative to the calling file) and registers one Jest test per scenario and per outline row. Call it once, after the step definitions. |
| `setFusionConfiguration` | `setFusionConfiguration( options )` | Sets options for every `Fusion` call of a test file, from a Jest `setupFiles` script. See [Global configuration](#global-configuration). |

TypeScript types: `StepArgument` (what a step receives: a `string`, or a table's rows as `Array<Record<string, string>>`), `CallBack`, `StepChain`, `FusionOptions`, `FusionErrorOptions` and `ScenarioNameTemplateVars`.

A step binds only to a definition registered with its own keyword: an `And` step needs an `And(...)` definition, and a `Then(...)` definition does not serve it. Use the chained form for a definition that several keywords share.

## Disabling scenario / step definition validation

Fusion generates the Jest tests from the feature file itself, so the two cannot drift apart: there is one test per scenario, named for that scenario, and each step runs the definition you registered for its keyword. What Fusion does validate is whether every step the feature file declares actually has a definition, and whether the file declares two scenarios it could not tell apart.

By default both validations are on. The following keys control them:

```javascript
import { Fusion } from '@g_package/jest-cucumber-fusion'

// your step definitions
// Given( ...

Fusion( 'rocket-launching.feature', {
  errors: {
    stepsMustMatchFeatureFile: true, // Refuse at collection when a feature step has no registered definition
    scenariosMustMatchFeatureFile: true, // Refuse at collection when the file declares two scenarios of one title
    allowScenariosNotInFeatureFile: true, // Accepted and ignored: Fusion generates the scenarios from the feature file, so there are none outside it
  }
} )
```

`errors` is also accepted as a boolean: `true` turns every key on, `false` turns every key off. Written as an object it merges key-wise over the defaults, so naming one key leaves the others exactly as they were.

### `stepsMustMatchFeatureFile`

On, a step with no registered definition is refused when the step definition file is collected, before any test is registered. One refusal names every unbound step of the feature, with starter code in Fusion's own verb idiom that you can paste and fill in. Steps that differ only in their values, such as the rows of a Scenario Outline, share one numbered entry and one definition, so you can paste every snippet at once:

```text
Fusion found 3 steps in the feature "Rocket launching" that no registered step definition matches.

WHY:  Fusion runs each step through the definition registered for that step's own
      Gherkin keyword, so a step with no definition has nothing to run and the
      scenario holding it cannot be reported honestly.
HOW:  register a definition for each entry below. The starter code under each one is
      the verb, the matcher and the parameters its steps need, and one definition
      binds every step its entry names. Or pass
      errors: { stepsMustMatchFeatureFile: false } to have the scenarios holding them
      reported as skipped tests instead.

  1. No step definition matches: "the launch pad is clear"
     Given("the launch pad is clear", () => {});

  2. No step definition matches: "3 boosters are fuelled"
     nor: "2 boosters are fuelled"
     And(/^(\d+) boosters are fuelled$/, (arg0) => {});
```

The verb is the one for that step's own Gherkin keyword, so an `And` step suggests `And`. A step whose text carries a number or a double-quoted value gets an anchored regular expression with a capture group and a parameter for each, and a step carrying a data table or a docstring gets a `table` or `docString` parameter after them.

Off, by `errors: false` or by `errors: { stepsMustMatchFeatureFile: false }`, the scenarios holding those steps are registered as **skipped** tests under their own names. Jest reports them as skipped, never as passed and never missing, and the scenarios of the same feature whose steps do bind still run normally.

### `scenariosMustMatchFeatureFile`

On, a feature file that declares two scenarios with the same title is refused when it is collected, and no test of it runs. Fusion names one test per scenario, so two scenarios of one title cannot be told apart in a report, by a `-t` filter, or in a test history. Titles are compared ignoring case, and a scenario inside a `Rule` counts with the rest.

A Scenario Outline counts **once**, as its declared title, however many Examples rows it has. Rows that generate the same test name are therefore never a duplicate.

Off, the file is accepted as written and every scenario registers, repeated names included.

## Tag filtering

You can specify a tag filter. Any scenario the expression excludes is registered as a **skipped** test under its own name, so Jest reports it as skipped rather than running it or leaving it out of the report altogether.

For example, consider the following feature file:

```gherkin
# filename: test/features/tagged-scenarios.feature
Feature: Tagged scenarios

  @included
  Scenario: Tagged scenario that is included
    Given my scenario has a tag that is included in my tag filter
    When I execute my scenarios
    Then this scenario runs

  @excluded
  Scenario: Tagged scenario that is not included
    Given my scenario has a tag that is NOT included in my tag filter
    When I execute my scenarios
    Then this scenario is reported as skipped
```

and this step definition file:

```javascript
// filename: test/features/tagged-scenarios.steps.js
import { Given, When, Then, Fusion } from '@g_package/jest-cucumber-fusion'

let executed = false

Given( 'my scenario has a tag that is included in my tag filter', () => {} )

When( 'I execute my scenarios', () => {
    executed = true
} )

Then( 'this scenario runs', () => {
    expect( executed ).toBe( true )
} )

Fusion( 'tagged-scenarios.feature', { tagFilter: '@included and not @excluded' } )
```

The scenario tagged `@included` runs, and the scenario tagged `@excluded` is reported as skipped. Its first and last steps have no definition, and that is allowed: a scenario the filter excludes is exempt from `stepsMustMatchFeatureFile`, because excluding a half-written scenario is one of the reasons to reach for a filter.

The expression language comes from `@cucumber/tag-expressions`: a tag is written `@name`, and names combine with `not`, `and` and `or`, grouped with parentheses. Matching ignores case on both sides. The expression and every tag are lowercased before they are compared, so `@UI and not @Slow` selects the same scenarios as `@ui and not @slow`.

A scenario is selected on the tags that reach it, which is the union of its own tags, its feature's tags and, for a Scenario Outline row, that Examples set's tags.

An expression that cannot be parsed is refused when the file is collected, naming the expression you wrote. So is an expression with an operand that is not a tag, such as `smoke` written for `@smoke`, because no tag in a feature file could ever match it. Neither becomes a filter that quietly selects nothing.

## Scenario title templates

In some cases, having more control over the scenario titles is desired. For example, imagine scenarios that are tagged with issue ids like so:

```gherkin
# filename: test/features/issue-tracked.feature
Feature: Issue tracking

    @issue-1234
    Scenario: Scenario tagged with issue
        Given a scenario that fixes an issue
```

Provide a `scenarioNameTemplate` function to generate the scenario title as desired. For example:

```javascript
// filename: test/features/issue-tracked.steps.js
import { Given, Fusion } from '@g_package/jest-cucumber-fusion'

Given( 'a scenario that fixes an issue', () => {} )

Fusion( 'issue-tracked.feature', {
    scenarioNameTemplate: ( vars ) => {
        return `${vars.scenarioTitle} (${vars.scenarioTags.join( ',' )})`
    }
} )
```

The output scenario title in this case would be `Scenario tagged with issue (@issue-1234)`. Tags reach the template with their leading `@` and lowercased, so strip the `@` in your template if you would rather not see it.

The following info is available in the `vars` argument:

* `featureTitle` - string
* `featureTags` - string[]
* `scenarioTitle` - string
* `scenarioTags` - string[]

`scenarioTitle` is the title of the individual test being named. For a Scenario Outline that is each **row's** own substituted title, so every row gets its own name.

`featureTags` holds the feature's declared tags and `scenarioTags` the rest of the tags that reached the scenario, which for an Examples row includes that Examples set's tags. The two lists are disjoint, and a tag declared on both the feature and the scenario appears in `featureTags` only.

The template is called once per test while Fusion registers, never again while the tests run, and it names every test whatever its status: a scenario skipped by a tag filter, or because its steps do not bind, carries the same name it would have carried had it run. It must return a non-empty string. A template that throws, or that returns anything else, is refused when the file is collected rather than naming a test something Jest cannot report.

## Relative feature file paths

A feature path is always resolved relative to the file that calls `Fusion`, which is what most people expect, so there is nothing to switch on:

```javascript
Fusion( 'rocket-launching.feature' )
```

The `loadRelativePath` flag is still **accepted and ignored**, so a call that passes it keeps working:

```javascript
Fusion( 'rocket-launching.feature', { loadRelativePath: true } ) // same as leaving it out
```

Please note that the path is relative to the file that calls `Fusion`, so if you use helper files which call `Fusion` for you this might lead to unexpected results. Fusion resolves against the first stack frame outside this package, so a thin wrapper of your own in another file resolves against that wrapper.

## Global configuration

To avoid repeating the same configuration settings in every step definition file, you can set them once with `setFusionConfiguration`. Settings passed to a `Fusion` call take precedence over the global ones for that call.

First list a configuration script in the `setupFiles` of your Jest configuration, for example in `package.json`:

```json
"jest": {
  "testMatch": [ "**/*.steps.js" ],
  "setupFiles": [ "./jest-fusion-config.js" ]
}
```

And set up that file, like so:

```javascript
//jest-fusion-config.js

import { setFusionConfiguration } from '@g_package/jest-cucumber-fusion'

setFusionConfiguration({
  tagFilter: '@ui and not @slow',
  scenarioNameTemplate: (vars) => {
      return `${vars.featureTitle} - ${vars.scenarioTitle}`;
  }
});
```

In a CommonJS project (see [Using CommonJS instead](../README.md#using-commonjs-instead)), the setup file requires the same function:

```javascript
//jest-fusion-config.js (CommonJS)

const { setFusionConfiguration } = require('@g_package/jest-cucumber-fusion');

setFusionConfiguration({ tagFilter: '@ui and not @slow' });
```

Either style of setup file works with either style of steps, because both share one global configuration. To keep a CommonJS setup file in a `"type": "module"` project, name it `jest-fusion-config.cjs`, since there a `.js` file is read as an ES module and `require` does not exist.

Options are merged lowest to highest: the defaults, then whatever `setFusionConfiguration` holds, then the options passed to one `Fusion` call. `errors` merges key-wise at every layer, so naming one validation in your setup file never switches off another. An option set to `undefined`, such as an unset environment variable forwarded as `{ tagFilter: process.env.TAGS }`, counts as not set and leaves the layer below in place. `null` is a value, so `{ tagFilter: null }` clears a global filter for that call.

A second `setFusionConfiguration` call **replaces** what the first set rather than merging into it, which is how you clear or redefine a global: `setFusionConfiguration({})` clears it. Jest gives each test file its own global object and runs `setupFiles` inside it, so what you set there applies to that file and cannot reach another one. The configuration lives on that global, not in a module, so `jest.resetModules()` does not clear it.

An argument that is not an options object is refused in the setup file itself, before any step definition file loads. An unknown key is accepted and ignored, exactly as it is per call.

Coming from version 2, where global configuration went through `jest-cucumber`'s own setter? [Migrating to version 3](./Migrating.md) shows the change.
