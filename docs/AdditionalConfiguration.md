# Configuration Options

## Disabling scenario / step definition validation

Cucumber's approach is to start with your feature file and execute the step definitions in the order defined in the feature file. Fusion generates the Jest tests from the feature file itself, so the two cannot drift apart: there is one test per scenario, named for that scenario, and each step runs the definition you registered for its keyword. What Fusion does validate is whether every step the feature file declares actually has a definition, and whether the file declares two scenarios it could not tell apart.

By default both validations are on. The following keys control them:

```javascript
const { Given, When, Then, And, But, Fusion } = require( '@g_package/jest-cucumber-fusion' )


//your javascript tests
//....
//Given( ...
// 


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

On, a step with no registered definition is refused when the step definition file is collected, before any test is registered. One refusal names every unbound step of the feature, numbered, each with starter code in Fusion's own verb idiom that you can paste and fill in:

```text
Fusion found 2 steps in the feature "Rocket launching" that no registered step definition matches.

WHY:  Fusion runs each step through the definition registered for that step's own
      Gherkin keyword, so a step with no definition has nothing to run and the
      scenario holding it cannot be reported honestly.
HOW:  register a definition for each step below. The starter code under each one is
      the verb, the matcher and the parameters that step needs. Or pass
      errors: { stepsMustMatchFeatureFile: false } to have the scenarios holding them
      reported as skipped tests instead.

  1. No step definition matches: "the launch pad is clear"
     Given("the launch pad is clear", () => {});

  2. No step definition matches: "3 boosters are fuelled"
     Given(/^(\d+) boosters are fuelled$/, (arg0) => {});
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

Consider the following step definitions file:

```javascript
const { Given, When, Then, And, But, Fusion } = require( '@g_package/jest-cucumber-fusion' )


//your javascript tests
//....
//Given( ...
// 


Fusion( 'rocket-launching.feature', { tagFilter: '@included and not @excluded' } )
```

In this case, the scenario tagged `@included` will be run, and the scenario tagged `@excluded` will be skipped. The expression language comes from `@cucumber/tag-expressions`: a tag is written `@name`, and names combine with `not`, `and` and `or`, grouped with parentheses.

Matching ignores case on both sides. The expression and every tag are lowercased before they are compared, so `@UI and not @Slow` selects the same scenarios as `@ui and not @slow`.

A scenario is selected on the tags that reach it, which is the union of its own tags, its feature's tags and, for a Scenario Outline row, that Examples set's tags. A scenario the filter excludes is also exempt from `stepsMustMatchFeatureFile`: excluding a half-written scenario is one of the reasons to reach for a filter, so Fusion does not ask for its steps to be bound.

An expression that cannot be parsed is refused when the file is collected, naming the expression you wrote. It never becomes a filter that quietly selects nothing.

## Scenario title templates

In some cases, having more control over the scenario titles is desired. For example, imagine scenarios that are tagged with with issue ids like so:

```
Feature: Tagged scenarios

    @issue-1234
    Scenario: Scenario tagged with issue
        ...
        ...
        ...        
```

Use a `scenarioNameTemplate` function to be provided to generate the scenario title as desired. For example:

```javascript
const { Given, When, Then, And, But, Fusion } = require( '@g_package/jest-cucumber-fusion' )


//your javascript tests
//....
//Given( ...
// 


Fusion( 'rocket-launching.feature', {
    scenarioNameTemplate: (vars) => {
        return `${vars.scenarioTitle} (${vars.scenarioTags.join(',')})`
    }
} )
```

The output scenario title in this case would be `Scenario tagged with issue (@issue-1234)`. Tags reach the template with their leading `@` and lowercased, so strip the `@` in your template if you would rather not see it.

The following info is available in the `vars` argument:

* `featureTitle` - string
* `featureTags` - string[]
* `scenarioTitle` - string
* `scenarioTags` - string[]

`scenarioTitle` is the title of the individual test being named. For a Scenario Outline that is each **row's** own substituted title, so every row gets its own name: a template is no longer silently inert on outline rows, as it was before version 3.

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

First specify a configuration JavaScript file in the `setupFiles` section of your Jest configuration, like so:

```javascript
{
  ...
  "setupFiles": [
    "./jest-fusion-config"
  ],
  ...
}
```

And set up that file, like so:

```javascript
//jest-fusion-config.js

const { setFusionConfiguration } = require('@g_package/jest-cucumber-fusion');

setFusionConfiguration({
  tagFilter: '@ui and not @slow',
  scenarioNameTemplate: (vars) => {
      return `${vars.featureTitle} - ${vars.scenarioTitle}`;
  }
});
```

Options are merged lowest to highest: the defaults, then whatever `setFusionConfiguration` holds, then the options passed to one `Fusion` call. `errors` merges key-wise at every layer, so naming one validation in your setup file never switches off another.

A second `setFusionConfiguration` call **replaces** what the first set rather than merging into it, which is how you clear or redefine a global. Jest gives each test file its own module registry and runs `setupFiles` inside it, so what you set there applies to that file and cannot reach another one.

An argument that is not an options object is refused in the setup file itself, before any step definition file loads. An unknown key is accepted and ignored, exactly as it is per call.

### Migrating from version 2

Version 2 of this package relied on `jest-cucumber`, and global configuration went through that package's own setter. Version 3 does not depend on it, so the import moves:

```javascript
// Before (version 2)
const setJestCucumberConfiguration = require('jest-cucumber').setJestCucumberConfiguration;
setJestCucumberConfiguration({ tagFilter: '@ui and not @slow' });

// After (version 3)
const { setFusionConfiguration } = require('@g_package/jest-cucumber-fusion');
setFusionConfiguration({ tagFilter: '@ui and not @slow' });
```

The options object is the same shape, with two corrections worth reading: the `errors` keys are the three listed at the top of this page, not the four earlier versions of this document described, and `scenarioNameTemplate` now also names Scenario Outline rows.
