# Contributing to Jest Cucumber Fusion

Thank you for helping. This page covers how a change gets from your machine to a release. To use the package rather than change it, start with the [README](./README.md).

Everyone taking part follows the [code of conduct](./CODE_OF_CONDUCT.md). To report a security vulnerability, follow the [security policy](./SECURITY.md) rather than opening an issue.

## Set up

You need Node 20.11 or newer: the test suite loads the ES module source.

```
git clone https://github.com/gotreasa/jest-cucumber-fusion.git
cd jest-cucumber-fusion
npm install
```

`npm install` also installs the git hooks described below. [Running the test suite](./docs/RunningTheExamples.md) shows how to run all the tests or one file, and [Architecture](./docs/Architecture.md) shows how the source is organised.

## Making a change

1. Branch from `main`.
2. Write a failing test first, then the change that makes it pass. Behaviour is tested through feature files under `test/specs/features`, with their step definitions in `test/specs/features/step-definitions`.
3. Run the checks in [Before you push](./docs/RunningTheExamples.md#before-you-push). The pre-push hook runs the slower ones for you.
4. Open a pull request against `main`.

**A new test feature file.** Add the `.feature` file and a `.steps.js` file that calls `Fusion` on it. Do not reword the existing feature files listed in `test/specs/baseline/test-names-2.0.0.txt`: that file is a recorded run of version 2.0.0, and the baseline checks that version 3 still gives those tests the same names, which consumers' CI history depends on.

**A new module in `src/`.** Add it to the table in [Architecture](./docs/Architecture.md), with what it requires. The architecture test reads that table and fails when a module's imports differ from it.

## Commit messages

Commits follow [Conventional Commits](https://www.conventionalcommits.org/), checked by commitlint in the `commit-msg` hook. The type decides the release:

| Type                                               | Example                                                      | Releases        |
| -------------------------------------------------- | ------------------------------------------------------------ | --------------- |
| `fix`                                              | `fix: report what a step threw, whatever it threw`           | a patch         |
| `feat`                                             | `feat: add basic scenarios in language`                      | a minor version |
| `feat!` or a `BREAKING CHANGE:` footer             | `feat!: replace jest-cucumber with jest + @cucumber/gherkin` | a major version |
| `docs`, `test`, `chore`, `ci`, `build`, `refactor` | `docs: add a Hooks section`                                  | nothing         |

`npm run commit` starts a guided prompt that writes the message for you.

Pull requests are squash-merged, so **the pull request's title becomes the commit on `main`**, and that title decides the release. Give it the type of the most significant change in the pull request.

## The git hooks

| Hook         | Runs                                                                                                                 |
| ------------ | -------------------------------------------------------------------------------------------------------------------- |
| `pre-commit` | secretlint on every staged file; ESLint and Prettier on staged `.js` files; Prettier on staged `.md` and `.ts` files |
| `commit-msg` | commitlint                                                                                                           |
| `pre-push`   | `npm test`, `npm run test-d` and `npm run test:baseline`                                                             |

Do not skip a hook with `--no-verify`. If one fails, fix the cause; CI runs the same checks and more.

## Documentation

User documentation is the README and the pages under `docs/`. Write examples that are concrete and realistic, such as a shopping basket or a login, and keep them free of jokes: they may be the only examples a reader finds.

A code block whose first line names its file is a runnable example:

````
```javascript
// filename: test/features/shopping-basket.steps.js
```
````

`npm run test:baseline` writes each listed page's named blocks into a fresh ES module project of their own, installs the packed package, and runs it, so a named example must pass as written. The pages it runs are listed in `test/specs/baseline/assert-doc-examples.js`. A block without a filename line is a fragment and is not run, and a section headed "Written as CommonJS" is skipped. The CommonJS, TypeScript and ESLint pages are not run that way: check their examples by hand in a throwaway project.

Write prose in British English, and do not use em dashes.

## Releases

A push to `main` runs semantic-release in CI after the checks pass. It reads the commit types since the last release, and when one calls for a release it tags the version, writes the GitHub release, and stages the package on npm with provenance. A maintainer then approves the staged package with two-factor authentication, which publishes it. Nothing is published from a contributor's machine.

## Reporting problems and asking questions

[Open an issue](https://github.com/gotreasa/jest-cucumber-fusion/issues/new/choose) and pick the form that fits: a bug report, a feature request or a question. The bug report asks for the package, Node and Jest versions, how your step files load the package, and the smallest feature file and step definitions that show the problem, with what Jest printed. That is what it takes to reproduce a problem, so please fill it in.

If you can, follow up with a pull request that adds a failing test for the problem under `test/specs/features`. A fix can come in the same pull request or a later one.
