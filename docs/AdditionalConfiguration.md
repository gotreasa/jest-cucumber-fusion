# Configuration options

This page is the reference for what the package exports and for every option `Fusion` accepts. It assumes the set-up from [Getting Started](../README.md#getting-started). The examples are ES modules; for CommonJS, see [Using CommonJS](./CommonJS.md).

## What the package exports

| Export | Call it as | What it does |
|---|---|---|
| `Given`, `When`, `Then`, `And`, `But` | `Given( stringOrRegExp, stepFunction )` | Registers a step definition for steps with that keyword. Returns a chain you can hand to another verb. |
| | `Then( And( stringOrRegExp, stepFunction ) )` | The chained form: registers the same definition under a second keyword, so a step binds to it with either. |
| `Before`, `After` | `Before( hookFunction )` | Runs the function before or after every scenario of the `Fusion` call that follows it. Register it before that call, like a step. Fusion passes it nothing, so declare no parameters: Jest treats a declared parameter as a `done` callback and waits for it. It may be `async`. |
| `Fusion` | `Fusion( featurePath, options? )` | Reads the feature file (relative to the calling file) and registers one Jest test per scenario and per outline row. Call it after the step definitions and hooks. Each call uses what was registered before it and then empties the registry, so a second call in the same file needs its definitions registered again. |
| `setFusionConfiguration` | `setFusionConfiguration( options )` | Sets options for every `Fusion` call of a test file, from a Jest `setupFiles` script. See [Global configuration](#global-configuration). |

TypeScript types: `StepArgument` (what a step receives: a `string`, or a table's rows as `Array<Record<string, string>>`), `CallBack`, `StepChain`, `FusionOptions`, `FusionErrorOptions` and `ScenarioNameTemplateVars`.

A step binds only to a definition registered with its own keyword: an `And` step needs an `And(...)` definition, and a `Then(...)` definition does not serve it. Use the chained form for a definition that several keywords share. Because a step binds by its keyword, the Gherkin `*` keyword is not supported: Fusion refuses a `*` step and asks you to write it with `Given`, `When`, `Then`, `And` or `But`.

## The options

Pass options as the second argument to one `Fusion` call, or set them for every file with [`setFusionConfiguration`](#global-configuration).

| Option | Value | Default | What it does |
|---|---|---|---|
| `errors` | `true`, `false`, or an object of the keys below | every check on | [Validation](#validation): refuse a step with no definition, or two scenarios with one title |
| `tagFilter` | a tag expression, or `null` | no filter | [Tag filtering](#tag-filtering): run only the scenarios it selects |
| `scenarioNameTemplate` | a function returning a string | each scenario's own title | [Scenario title templates](#scenario-title-templates): change what each test is called |

Two older keys are accepted and ignored: see [Legacy options](#legacy-options).

## Validation

Fusion generates the Jest tests from the feature file itself, so the two cannot drift apart: there is one test per scenario, named for that scenario, and each step runs the definition you registered for its keyword. What Fusion does check is whether every step the feature file declares has a definition, and whether the file declares two scenarios it could not tell apart.

Both checks are on by default. These keys of `errors` control them:

```javascript
import { Fusion } from '@g_package/jest-cucumber-fusion'

// your step definitions
// Given( ...

Fusion( 'shopping-basket.feature', {
  errors: {
    stepsMustMatchFeatureFile: true, // Refuse at collection when a feature step has no registered definition
    scenariosMustMatchFeatureFile: true, // Refuse at collection when the file declares two scenarios of one title
  }
} )
```

`errors` is also accepted as a boolean: `true` turns every key on, `false` turns every key off. Written as an object it merges key-wise over the defaults, so naming one key leaves the others exactly as they were.

### `stepsMustMatchFeatureFile`

On, a step with no registered definition is refused when the step definition file is collected, before any test is registered. One refusal names every unbound step of the feature, with starter code in Fusion's own verb idiom that you can paste and fill in. Steps that differ only in their values, such as the rows of a Scenario Outline, share one numbered entry and one definition, so you can paste every snippet at once:

```text
Fusion found 3 steps in the feature "Stock" that no registered step definition matches.

WHY:  Fusion runs each step through the definition registered for that step's own
      Gherkin keyword, so a step with no definition has nothing to run and the
      scenario holding it cannot be reported honestly.
HOW:  register a definition for each entry below. The starter code under each one is
      the verb, the matcher and the parameters its steps need, and one definition
      binds every step its entry names. Or pass
      errors: { stepsMustMatchFeatureFile: false } to have the scenarios holding them
      reported as skipped tests instead.

  1. No step definition matches: "the shop is open"
     Given("the shop is open", () => {});

  2. No step definition matches: "3 coffee mugs are in stock"
     nor: "2 coffee mugs are in stock"
     And(/^(\d+) coffee mugs are in stock$/, (arg0) => {});
```

The verb is the one for that step's own Gherkin keyword, so an `And` step suggests `And`. A step whose text carries a number or a double-quoted value gets an anchored regular expression with a capture group and a parameter for each, and a step carrying a data table or a docstring gets a `table` or `docString` parameter after them.

Off, by `errors: false` or by `errors: { stepsMustMatchFeatureFile: false }`, the scenarios holding those steps are registered as **skipped** tests under their own names. Jest lists them as skipped, and the scenarios of the same feature whose steps do bind still run normally.

### `scenariosMustMatchFeatureFile`

On, a feature file that declares two scenarios with the same title is refused when it is collected, and no test of it runs. Fusion names one test per scenario, so two scenarios of one title cannot be told apart in a report, by a `-t` filter, or in a test history. Titles are compared ignoring case, and a scenario inside a `Rule` counts with the rest.

A Scenario Outline counts **once**, as its declared title, however many Examples rows it has. Rows that generate the same test name are therefore never a duplicate.

Off, the file is accepted as written and every scenario registers, repeated names included.

## Tag filtering

Pass a `tagFilter` expression to run only the scenarios it selects. Jest reports the others as **skipped**, under their own names, rather than leaving them out of the report.

For example, with this feature file:

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

The scenario tagged `@included` runs, and the scenario tagged `@excluded` is reported as skipped. Its first and last steps have no definition, and that is allowed: a scenario the filter excludes is exempt from `stepsMustMatchFeatureFile`, so you can leave a half-written scenario out with a tag.

The expression language comes from `@cucumber/tag-expressions`: a tag is written `@name`, and names combine with `not`, `and` and `or`, grouped with parentheses. Matching ignores case on both sides. The expression and every tag are lowercased before they are compared, so `@UI and not @Slow` selects the same scenarios as `@ui and not @slow`.

A scenario is selected on the tags that reach it, which is the union of its own tags, its `Rule`'s tags, its feature's tags and, for a Scenario Outline row, that Examples set's tags.

An expression that cannot be parsed is refused when the file is collected, naming the expression you wrote. So is an expression with an operand that is not a tag, such as `smoke` written for `@smoke`, because no tag in a feature file could ever match it. Neither becomes a filter that selects nothing without telling you.

## Scenario title templates

A `scenarioNameTemplate` function changes what each test is called. For example, to add a scenario's issue tag to its name, with this feature:

```gherkin
# filename: test/features/issue-tracked.feature
Feature: Issue tracking

    @issue-1234
    Scenario: Scenario tagged with issue
        Given a scenario that fixes an issue
```

and this template:

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

the test is called `Scenario tagged with issue (@issue-1234)`. Tags reach the template with their leading `@` and lowercased, so strip the `@` in your template if you would rather not see it.

The `vars` argument holds:

* `featureTitle` - string
* `featureTags` - string[]
* `scenarioTitle` - string
* `scenarioTags` - string[]

`scenarioTitle` is the title of the individual test being named. For a Scenario Outline that is each **row's** own substituted title, so every row gets its own name.

`featureTags` holds the feature's declared tags and `scenarioTags` the rest of the tags that reached the scenario, which for an Examples row includes that Examples set's tags. The two lists are disjoint, and a tag declared on both the feature and the scenario appears in `featureTags` only.

The template is called once per test while Fusion registers, never again while the tests run, and it names every test whatever its status: a scenario skipped by a tag filter, or because its steps do not bind, carries the same name it would have carried had it run. It must return a non-empty string. A template that throws, or that returns anything else, is refused when the file is collected rather than naming a test something Jest cannot report.

## Global configuration

To avoid repeating the same options in every step definition file, set them once with `setFusionConfiguration`. Options passed to a `Fusion` call take precedence over the global ones for that call.

First list a configuration script in the `setupFiles` of your Jest configuration, for example in `package.json`:

```json
"jest": {
  "testMatch": [ "**/*.steps.js" ],
  "setupFiles": [ "./jest-fusion-config.js" ]
}
```

Then write that script:

```javascript
// jest-fusion-config.js
import { setFusionConfiguration } from '@g_package/jest-cucumber-fusion'

setFusionConfiguration( {
    tagFilter: '@ui and not @slow',
    scenarioNameTemplate: ( vars ) => `${vars.featureTitle} - ${vars.scenarioTitle}`,
} )
```

A global `tagFilter` applies to every feature, so a scenario without a matching tag, such as an untagged one, is then reported as skipped.

In a CommonJS project (see [Using CommonJS](./CommonJS.md)), the script requires the same function:

```javascript
// jest-fusion-config.js, in CommonJS
const { setFusionConfiguration } = require( '@g_package/jest-cucumber-fusion' )

setFusionConfiguration( { tagFilter: '@ui and not @slow' } )
```

Either style of setup file works with either style of steps, because both share one global configuration. To keep a CommonJS setup file in a `"type": "module"` project, name it `jest-fusion-config.cjs`, since there a `.js` file is read as an ES module and `require` does not exist.

### Merge order

Options are merged lowest to highest: the defaults, then whatever `setFusionConfiguration` holds, then the options passed to one `Fusion` call. `errors` merges key-wise at every layer, so naming one check in your setup file never switches off another. An option set to `undefined`, such as an unset environment variable forwarded as `{ tagFilter: process.env.TAGS }`, counts as not set and leaves the layer below in place. `null` is a value, so `{ tagFilter: null }` clears a global filter for that call.

### Clearing and scope

A second `setFusionConfiguration` call **replaces** what the first set rather than merging into it, which is how you clear or redefine a global: `setFusionConfiguration({})` clears it. Jest gives each test file its own global object and runs `setupFiles` inside it, so what you set there applies to that file and cannot reach another one. The configuration lives on that global, not in a module, so `jest.resetModules()` does not clear it.

An argument that is not an options object is refused in the setup file itself, before any step definition file loads. An unknown key is accepted and ignored, exactly as it is per call.

Coming from version 2, where global configuration went through `jest-cucumber`'s own setter? [Migrating to version 3](./Migrating.md) shows the change.

## Feature file paths

A relative feature path is resolved against the file that calls `Fusion`:

```javascript
Fusion( 'shopping-basket.feature' )
```

An absolute path is used as it is, so you can also build the path yourself, for example to keep feature files in a folder of their own:

```javascript
import path from 'path'

Fusion( path.join( import.meta.dirname, '..', 'features', 'shopping-basket.feature' ) )
```

In CommonJS, use `__dirname` in place of `import.meta.dirname`.

Fusion finds the calling file as the first stack frame outside this package. So if a helper of your own calls `Fusion` for you, from another file, the path resolves against the helper's file, not the step definition file that called the helper.

## Legacy options

Two keys from earlier versions are accepted and ignored, so configurations that set them keep working:

- `errors.allowScenariosNotInFeatureFile`: Fusion generates the scenarios from the feature file, so there are none outside it.
- `loadRelativePath`: feature paths are always relative to the calling file, so `Fusion( 'shopping-basket.feature', { loadRelativePath: true } )` is the same as leaving it out.
