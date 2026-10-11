# Migrating to version 3

Your feature files and step definition files keep their shape: the same `Given`, `When`, `Then`, `And`, `But`, `Before`, `After` and `Fusion`, called the same way. Version 3 no longer depends on `jest-cucumber`; it runs on Jest and `@cucumber/gherkin` directly.

Start from the section for the version you have:

- **[From version 2](#from-version-2)** of `@g_package/jest-cucumber-fusion`.
- **[From `jest-cucumber-fusion` 0.8.x](#from-jest-cucumber-fusion-08x)**, the original package from [b-yond-infinite-network](https://github.com/b-yond-infinite-network/jest-cucumber-fusion), whose last release was 0.8.1 in June 2021.

## From version 2

Step definition files written as CommonJS keep working as CommonJS, with no change of module format: the package ships a CommonJS build, which `require` gets. Version 2 declared no Node range; version 3 runs on Node 18.14 and newer for CommonJS, and Node 20.11 and newer for ES modules (see [Which Jest and Node versions work?](#which-jest-and-node-versions-work)).

Three changes may need an edit. Two of the [smaller differences](#smaller-differences-from-200) can also change which tests run, so read those too if you use `tagFilter`.

**1. The global configuration import moves.** Version 2 relied on `jest-cucumber`, and global configuration went through that package's own setter. In your `setupFiles` script:

```javascript
// Before (version 2)
const setJestCucumberConfiguration = require( 'jest-cucumber' ).setJestCucumberConfiguration
setJestCucumberConfiguration( { tagFilter: '@ui and not @slow' } )

// After (version 3)
const { setFusionConfiguration } = require( '@g_package/jest-cucumber-fusion' )
setFusionConfiguration( { tagFilter: '@ui and not @slow' } )
```

The options object is the same shape.

**2. Scenario Outline steps match their substituted text.** Version 2 matched an outline step against its template text, so a row whose value did not fit the definition's regular expression still ran, with no captured values. Version 3 matches each row's substituted text, so that row now reports an unmatched step. A step definition that relied on running with no captures needs a regular expression that accepts the row's value.

**3. An outline step's docstring and data table always receive the row's values.** Version 2 substituted them, except when the step was bound by a regular expression and its own text held no placeholder: that step received the `<name>` text as written. Version 3 substitutes in every case, as Cucumber does, so a docstring or table cell that needs a literal `<name>` must use a placeholder name that is not an Examples column.

### Smaller differences from 2.0.0

Each row comes from running the same feature and step files under 2.0.0 and 3.0.0. Most need no change in a working project, but **two can change which tests run**, so check them if you use `tagFilter`: a `Rule`'s tags now count, and a filter of only spaces now runs every scenario.

| Situation | 2.0.0 | 3.0.0 |
|---|---|---|
| A `Rule:` with tags, under a `tagFilter` | the Rule's tags were ignored | they count, like the feature's tags, and reach `scenarioNameTemplate` in `scenarioTags` |
| A `tagFilter` of only spaces | every scenario was skipped | no filter: every scenario runs |
| A tag filter naming a non-ASCII tag (`@ünï`), a repeated tag (`@b and not @b`) or an escaped space | refused: `Could not parse tag filter` | accepted |
| A step with no definition, default options | the suite failed with `jest-cucumber`'s message, suggesting code in its own `test(..., ({ given }) => ...)` form | the suite fails with one message naming every unmatched step, each with starter code you can paste, such as `Then(/^the balance is \$(\d+)$/, (arg0) => {});` |
| A step with no definition, `errors: false` | the test passed and the step was skipped silently | the scenario is reported as a skipped test |
| `scenarioNameTemplate` on a Scenario Outline | applied to plain scenarios only; outline rows kept their own titles | applied to every test, outline rows included |
| A Scenario Outline with no `Examples` | the suite failed with `jest-cucumber`'s "has 0 step(s)" message | runs once as a plain scenario, the `<placeholder>` text as written, as Cucumber does |
| A feature in Slovenian, Persian, Malayalam or the `en-tx` dialect | could not run | runs, like the other 76 Gherkin languages |
| A step that throws a string, `undefined` or a rejection with no value | the reporter crashed: `Cannot create property 'message' on string` | reported as the failing step, with what was thrown |
| A step matcher that is neither a string nor a regular expression, such as `Given(42, fn)` | accepted and ignored, so the step later failed as having no definition | refused at the call: `Unsupported step matcher: Given was given number 42.` |
| A step definition with no function, `Given('the shop is open')` | accepted, then failed when the step ran: `stepFn is not a function` | refused at the call: `Missing step function: ...` |
| `Fusion` handed to `forEach`, or called from code built with `new Function` | the feature path resolved against the working directory | resolved against the calling file |
| `Fusion()` with no path, a number, or a directory | Node's raw `paths[1]` argument error, or `EISDIR` | refused, naming what it was given |
| Two scenarios declared with the same title, ignoring case | the suite failed: `More than one scenario found in feature file that match scenario title ...` | the suite still fails by default, now with `Duplicate scenario title`, naming each title and how often it is declared; `errors: { scenariosMustMatchFeatureFile: false }` allows them |
| `errors: 0` (or another non-boolean) | read as "no change", leaving every check on | refused: `errors` must be `true`, `false` or an object |
| A `scenarioNameTemplate` that is not a function, or is `async` | reported as a template that threw, or that "returned object {}" | refused, saying it is not a function, or that it returned a Promise |
| `setFusionConfiguration(...)`, then `jest.resetModules()` | the global configuration was cleared with the modules | kept for the rest of the test file. Call `setFusionConfiguration({})` to clear it |

## From `jest-cucumber-fusion` 0.8.x

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

3. If you configured every file at once through `jest-cucumber`'s `setJestCucumberConfiguration`, change it as [From version 2](#from-version-2) shows.

4. Run your tests. Problems that 0.8.1 passed silently now fail on this first run, each with a message naming the step involved and how to fix it.

Read [From version 2](#from-version-2) as well. Change 1 applies to you, because 0.8.1 also configured through `jest-cucumber`. Change 2 and the row for a `tagFilter` of only spaces (every scenario was skipped) were run under 0.8.1 and behaved as under version 2, so they apply too. Change 3 differs: under 0.8.1 an outline step bound by a regular expression received no docstring at all, and version 3 passes it with the row's values. The other rows of the smaller differences were run against 2.0.0 only. In addition, these changed in version 2:

| Situation | 0.8.1 | Version 2 and 3 |
|---|---|---|
| Two `Before` (or `After`) hooks in one file | only the last one ran | every hook runs, in registration order |
| A feature with more than one scenario | each hook ran once per scenario in the feature, before and after every test | each hook runs once per test |
| The same step text registered twice for one keyword | accepted, and the second definition replaced the first | refused: `Duplicate step definition: "a step" is already registered for "given"` |
| A step that more than one definition matches | accepted, and the first registered definition ran | refused: `Ambiguous step definition: ... matches 2 step definitions` |
| `Fusion()` called twice in one file, sharing steps | the second call reused the steps registered for the first | each call starts empty, so register the shared steps again before the second call |

0.8.1 could not read a `Rule:` with tags (its Gherkin, version 17, refused a tag line above `Rule:`); an untagged `Rule:` ran. Data tables, docstrings outside Scenario Outlines (an empty one included), Background, `# language:` headers and chaining a step definition with `And(chain)` (see [What the package exports](./AdditionalConfiguration.md#what-the-package-exports)) behave as they did in 0.8.1.

## Which Jest and Node versions work?

Version 3 runs under the Jest your project already has, from Jest 27 on. CI runs Jest 30; Jest 27.5, 29.7 and 30.5 were each run by hand when version 3 was released. `jest` is a peer dependency (`>=27`), so the package installs no copy of its own. Version 2 listed `jest` as a dependency, so a project on an older Jest also got a nested Jest it never ran. If your project has no `jest` yet, install it beside the package, as [Getting Started](../README.md#getting-started) does.

- **CommonJS** step files run on Node 18.14 and newer. The package declares Jest 30's own Node range (`^18.14.0 || ^20.0.0 || ^22.0.0 || >=24.0.0`).
- **ES modules** need Node 20.11 or newer, because `@cucumber/gherkin` 42 uses import attributes, which Node 18.19 and 20.9 could not parse when measured (`SyntaxError: Unexpected token 'with'`); 20.11 is the oldest version measured to work. Run Jest in its ES module mode, as [Getting Started](../README.md#getting-started) shows.
- **Mixing the two** works: a shared step library written as CommonJS can serve step files written as ES modules. See [Using CommonJS](./CommonJS.md#mixing-the-two-styles).

## What does the migration cost?

Expect the first run to fail wherever a steps file depended on one of the old silent behaviours. From 0.8.x, the likeliest are these: where a file relied on a second `Before` replacing the first, both hooks now run, so the two may need to merge into one; where a file registered the same step twice, keep one definition. The message for each case lists the step and the definitions involved, so fixing it takes a reading of the message rather than a search through the file.

A missing step stops the whole steps file, including scenarios that already passed, because Fusion checks every step before it registers any test. While you write the new definitions, `errors: { stepsMustMatchFeatureFile: false }` keeps the rest of the file running and reports the unfinished scenario as skipped. Every option is in [Configuration options](./AdditionalConfiguration.md).
