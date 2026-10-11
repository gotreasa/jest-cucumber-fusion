# Jest Cucumber Fusion documentation

New here? Start with the [README](../README.md): it sets up a project from nothing and walks through a first feature file and its step definitions, then lists the differences from Cucumber.

## Setting up

| Page | Read it when you want to |
|---|---|
| [Using CommonJS](./CommonJS.md) | use `require` instead of `import`, or run on Node 18 |
| [Using TypeScript](./TypeScript.md) | write step definitions in TypeScript |
| [Linting with ESLint](./ESLint.md) | lint step files, with `expect` allowed inside steps and hooks |
| [Migrating to version 3](./Migrating.md) | upgrade from version 2, or from `jest-cucumber-fusion` 0.8.x |

## Writing features and steps

| Page | Read it when you want to |
|---|---|
| [Step definition arguments](./StepDefinitionArguments.md) | capture values from a step's text with a regular expression, or read a docstring |
| [Gherkin tables](./GherkinTables.md) | use a data table in a step |
| [Scenario outlines](./ScenarioOutlines.md) | run one scenario for every row of an `Examples` table |
| [Re-using step definitions](./ReusingStepDefinitions.md) | share steps between feature files |
| [Language](./Language.md) | write feature files in a language other than English |
| [Hooks](../README.md#hooks) | run code before or after every scenario |

## Options

| Page | Read it when you want to |
|---|---|
| [Configuration options](./AdditionalConfiguration.md) | look up every export and option |
| [Tag filtering](./AdditionalConfiguration.md#tag-filtering) | run only the scenarios with certain tags |
| [Scenario title templates](./AdditionalConfiguration.md#scenario-title-templates) | change what each test is called |
| [Global configuration](./AdditionalConfiguration.md#global-configuration) | set options once for every step definition file |

The examples on the README and on the guide pages under "Writing features and steps" and "Options" run in CI as written: every block that names its file, in ES modules, is copied into a fresh project with the packed package and run (`npm run test:baseline`). The other pages show set-up files and before-and-after fragments.

## Working on the package

| Page | What it covers |
|---|---|
| [Running the test suite](./RunningTheExamples.md) | running this repository's test suite, and the checks to run before you push |
| [Architecture](./Architecture.md) | how the source is organised, and the rules the architecture test enforces |

## How this package was built

You do not need anything below to use the package.

[`feature/`](./feature/README.md) holds the records of larger pieces of work on the package: the plans, briefs and root-cause analyses written while they were delivered. They are dated history. Where one disagrees with the pages above, the pages above are current.
