# Jest Cucumber Fusion documentation

New here? Start with the [README](../README.md): it installs the package, sets up Jest, and
walks through a first feature file and its step definitions, for ES modules, CommonJS and
TypeScript.

## Using Jest Cucumber Fusion

Every example on these pages runs as written: the repository's tests copy each one into a fresh
project and run it.

| Page | Read it when you want to |
|---|---|
| [Step definition arguments](./StepDefinitionArguments.md) | capture values from a step's text, with a string or a regular expression |
| [Gherkin tables](./GherkinTables.md) | use a data table in a step |
| [Scenario outlines](./ScenarioOutlines.md) | run one scenario for every row of an `Examples` table |
| [Re-using step definitions](./ReusingStepDefinitions.md) | share steps between feature files |
| [Language](./Language.md) | write feature files in a language other than English |
| [Configuration options](./AdditionalConfiguration.md) | look up every export and option, and how options merge |
| [Migrating to version 3](./Migrating.md) | upgrade from version 2, or from `jest-cucumber-fusion` 0.8.x |

## Working on the package

| Page | What it covers |
|---|---|
| [Running the examples](./RunningTheExamples.md) | running this repository's own example features |
| [Architecture](./Architecture.md) | how the source is organised, and the rules the architecture test enforces |

## How this package was built

You do not need anything below to use the package.

[`feature/`](./feature/README.md) holds the records of larger pieces of work on the package: the
plans, briefs and root-cause analyses written while they were delivered. They are dated history,
kept as they were written. Where one disagrees with the pages above, the pages above are current.
