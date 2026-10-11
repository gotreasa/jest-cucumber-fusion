# Jest Cucumber Fusion documentation

New here? Start with the [README](../README.md): it sets up a project from nothing and walks through a first feature file and its step definitions, then lists the differences from Cucumber. For a bug, a feature request or a question, [open an issue](https://github.com/gotreasa/jest-cucumber-fusion/issues/new/choose); [Getting help](../SUPPORT.md) says which form fits, and the [security policy](../SECURITY.md) covers vulnerabilities.

**A reading order for the guides.** After the README, read [Step definition arguments](./StepDefinitionArguments.md), [Background](./Background.md), [Rule](./Rule.md), [Gherkin tables](./GherkinTables.md), [Scenario outlines](./ScenarioOutlines.md), [Re-using step definitions](./ReusingStepDefinitions.md) and [Configuration options](./AdditionalConfiguration.md), in that order. Each ends with a link to the next. The other pages are for when you need them.

## Writing features and steps

| Page | Read it when you want to |
|---|---|
| [Hooks](../README.md#hooks) | run code before or after every scenario |
| [Step definition arguments](./StepDefinitionArguments.md) | capture values from a step's text with a regular expression, or read a docstring |
| [Background](./Background.md) | give every scenario of a feature, or of a `Rule`, the same first steps |
| [Rule](./Rule.md) | group scenarios under the business rule they illustrate |
| [Gherkin tables](./GherkinTables.md) | use a data table in a step |
| [Scenario outlines](./ScenarioOutlines.md) | run one scenario for every row of an `Examples` table |
| [Re-using step definitions](./ReusingStepDefinitions.md) | share steps between feature files |
| [Language](./Language.md) | write feature files in a language other than English |

## Options

| Page | Read it when you want to |
|---|---|
| [Configuration options](./AdditionalConfiguration.md) | look up every export and option |
| [Tag filtering](./AdditionalConfiguration.md#tag-filtering) | run only the scenarios with certain tags |
| [Scenario title templates](./AdditionalConfiguration.md#scenario-title-templates) | change what each test is called |
| [Global configuration](./AdditionalConfiguration.md#global-configuration) | set options once for every step definition file |

## Set-up variants and tooling

| Page | Read it when you want to |
|---|---|
| [Using CommonJS](./CommonJS.md) | use `require` instead of `import`, or run on Node 18 |
| [Using TypeScript](./TypeScript.md) | write step definitions in TypeScript |
| [Linting with ESLint](./ESLint.md) | lint step files, with `expect` allowed inside steps and hooks |

## Upgrading

| Page | Read it when you want to |
|---|---|
| [Migrating to version 3](./Migrating.md) | upgrade from version 2, or from `jest-cucumber-fusion` 0.8.x |

## Working on the package

| Page | What it covers |
|---|---|
| [Contributing](../CONTRIBUTING.md) | how a change gets from your machine to a release: commits, hooks, documentation and releases |
| [Running the test suite](./RunningTheExamples.md) | running this repository's test suite, and the checks to run before you push |
| [Architecture](./Architecture.md) | how the source is organised, and the rules the architecture test enforces |

**How the examples are checked.** Every example on the README and on the pages under "Writing features and steps" and "Options" that names its file is run by the project's tests, so you can copy it as written: each page's named blocks are written into a fresh ES module project of their own, with the packed package installed, and run (`npm run test:baseline`). The TypeScript page is checked by an equivalent TypeScript project that the same baseline builds. The other set-up pages show configuration, and Migrating shows before-and-after fragments.

## How this package was built

You do not need anything below to use the package.

[`feature/`](./feature/README.md) holds the records of larger pieces of work on the package: the plans, briefs and root-cause analyses written while they were delivered. Where one disagrees with the pages above, the pages above are current.
