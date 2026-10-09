# Migrating to version 3

This package continues [b-yond-infinite-network/jest-cucumber-fusion](https://github.com/b-yond-infinite-network/jest-cucumber-fusion), whose last release was `jest-cucumber-fusion` 0.8.1 in June 2021. It is published under a new name, `@g_package/jest-cucumber-fusion`, and version 3 no longer depends on `jest-cucumber` at all. Your feature files and step definition files keep their shape: the same `Given`, `When`, `Then`, `And`, `But`, `Before`, `After` and `Fusion`, called the same way.

What changes depends on where you start:

- **From `jest-cucumber-fusion` 0.8.x** (the b-yond package): follow the steps below, then read the behaviour changes, because several silent behaviours now fail loudly.
- **From `@g_package/jest-cucumber-fusion` 2.x**: only the global configuration import moves, plus the version 3 rows of the behaviour table. See [Migrating from version 2](./AdditionalConfiguration.md#migrating-from-version-2).

## How do I switch from the b-yond package?

1. Replace the package. Remove the old one and install the new one; your own Jest can stay as it is.

   ```
   npm uninstall jest-cucumber-fusion
   npm install @g_package/jest-cucumber-fusion --save-dev
   ```

2. Change every import to the new name.

   ```javascript
   // Before
   const { Given, When, Then, Fusion } = require( 'jest-cucumber-fusion' )

   // After
   const { Given, When, Then, Fusion } = require( '@g_package/jest-cucumber-fusion' )
   ```

3. If you configured every file at once through `jest-cucumber`'s `setJestCucumberConfiguration` in a Jest `setupFiles` script, call `setFusionConfiguration` from this package instead. The options object is the same shape.

   ```javascript
   // Before
   const setJestCucumberConfiguration = require( 'jest-cucumber' ).setJestCucumberConfiguration
   setJestCucumberConfiguration( { tagFilter: '@ui and not @slow' } )

   // After
   const { setFusionConfiguration } = require( '@g_package/jest-cucumber-fusion' )
   setFusionConfiguration( { tagFilter: '@ui and not @slow' } )
   ```

4. Run your tests. Problems that 0.8.1 passed silently now fail on this first run, each with a message naming the step involved and how to fix it, and the table below lists every case.

## Which Jest and Node versions work?

Version 3 runs under the Jest your project already has. Steps files that `require` the package gave identical results under Jest 27.5, 29.7 and 30.5 on Node 22, and under Jest 30 on Node 18, 20, 22 and 24. The package declares Jest 30's own Node range (`^18.14.0 || ^20.0.0 || ^22.0.0 || >=24.0.0`).

Your step files can stay CommonJS. Version 3 is written as ES modules on the latest Gherkin toolchain, and the package ships a CommonJS build beside them: `require` gets that build, so a steps file that `require`s the package works unchanged, with no Jest or Babel configuration. If you write your steps as ES modules, `import` gets the ES module source; run Jest in its ES module mode for that (the README's [Using ES modules](../README.md#using-es-modules) gives the set-up), on **Node 20.11 or newer**: `@cucumber/gherkin` 42 uses import attributes, which Node 18 and 20.9 cannot parse (`SyntaxError: Unexpected token 'with'`, measured). Mixing the two styles in one project, for example a shared step library written as CommonJS used by step files written as ES modules, works: both copies share one step registry and one global configuration.

Installing the package also brings its own copy of Jest 30, because `jest` is one of its dependencies. When your project uses an older Jest, npm installs that copy alongside yours, under the package's own `node_modules`, and your tests keep running on your version. It costs disk space only.

## What behaves differently?

Each row was observed by running the same steps file under `jest-cucumber-fusion` 0.8.1 with Jest 27 and under version 3.

| Situation | 0.8.1 (b-yond) | Version 3 | Since |
|---|---|---|---|
| Two `Before` (or `After`) hooks in one file | only the last one ran | every hook runs, in registration order | 2.0.0 |
| A feature with both plain scenarios and a Scenario Outline | each hook ran twice per test | each hook runs once per test | 2.0.0 |
| The same step text registered twice for one keyword | accepted, and the second definition replaced the first | refused: `Duplicate step definition: "a step" is already registered for "given"` | 2.0.0 |
| A step that more than one definition matches | accepted, and the first registered definition ran | refused: `Ambiguous step definition: ... matches 2 step definitions` | 2.0.0 |
| `Fusion()` called twice in one file, sharing steps | the second call reused the steps registered for the first | each call starts empty, so register the shared steps again before the second call | 2.0.0 |
| A step with no definition, default options | the suite failed with `jest-cucumber`'s message, suggesting code in its own `test(..., ({ given }) => ...)` form | the suite fails with one message naming every unmatched step, each with starter code you can paste, such as `Then(/^the balance is \$(\d+)$/, (arg0) => {});` | 3.0.0 |
| A step with no definition, `errors: false` | the test passed and the step was skipped silently | the scenario is reported as a skipped test | 3.0.0 |
| `scenarioNameTemplate` on a Scenario Outline | applied to plain scenarios only; outline rows kept their own titles | applied to every test, outline rows included | 3.0.0 |
| A step matcher that is neither a string nor a regular expression, such as `Given(42, fn)` | accepted and ignored, so the step later failed as having no definition (`undefined` threw a `TypeError` instead) | refused at the call: `Unsupported step matcher: Given was given number 42.` | 3.0.0 |
| Two scenarios declared with the same title, ignoring case | the suite failed: `More than one scenario found in feature file that match scenario title ...` | the suite still fails by default, now with `Duplicate scenario title`, naming each title and how often it is declared; `errors: { scenariosMustMatchFeatureFile: false }` allows them | 3.0.0 |

`tagFilter`, data tables, docstrings (an empty one included), Background, `# language:` headers and chaining a step definition with `And(chain)` behave as they did in 0.8.1.

## What else changes when coming from version 2?

Versions 1 and 2 of this package matched a Scenario Outline step against its template text, so a row whose value did not fit the definition's regular expression still ran, with no captured values. Version 3 matches each row's substituted text, so that row now reports an unmatched step, and a step definition that relied on running with no captures needs a regular expression that accepts the row's value.

The same change reaches a step's docstring and data table. Version 2 substituted a row's values into them, except when the step was bound by a regular expression and its own text held no placeholder: that step received the `<name>` text as written. Version 3 substitutes in every case, as Cucumber does, so a docstring or table cell that needs a literal `<name>` must use a placeholder name that is not an Examples column.

The global configuration import and the version 3 rows of the table above complete the list; [Migrating from version 2](./AdditionalConfiguration.md#migrating-from-version-2) shows the configuration change.

## What does the migration cost?

Expect the first run to fail wherever a steps file depended on one of the old silent behaviours. Where a file relied on a second `Before` replacing the first, both hooks now run, so the two may need to merge into one; where a file registered the same step twice, keep one definition. The message for each case lists the step and the definitions involved, so fixing it takes a reading of the message rather than a search through the file.

A missing step stops the whole steps file, including scenarios that already passed, because Fusion checks every step before it registers any test. While you write the new definitions, `errors: { stepsMustMatchFeatureFile: false }` keeps the rest of the file running and reports the unfinished scenario as skipped. The full list of options is in [Configuration options](./AdditionalConfiguration.md).
