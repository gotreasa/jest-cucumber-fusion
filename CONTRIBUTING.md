# Contributing to Jest Cucumber Fusion

Thank you for helping. This page covers how a change gets from your machine to a release. To use the package rather than change it, start with the [README](./README.md).

Everyone taking part follows the [code of conduct](./CODE_OF_CONDUCT.md); its [Reporting an Issue](./CODE_OF_CONDUCT.md#reporting-an-issue) section says how to report a problem privately. To report a security vulnerability, follow the [security policy](./SECURITY.md) rather than opening an issue.

## Set up

You need Node 22.22.1 or newer to work on the package (CI uses Node 24): the git hooks' tools need it, and `lint-staged` fails on older versions. The package itself runs on older Node versions; [Migrating to version 3](./docs/Migrating.md#which-jest-and-node-versions-work) lists them.

Fork the repository on GitHub, then clone your fork:

```
git clone https://github.com/<your-account>/jest-cucumber-fusion.git
cd jest-cucumber-fusion
npm install
```

`npm install` also installs the git hooks described below. [Running the test suite](./docs/RunningTheExamples.md) shows how to run all the tests or one file, and [Architecture](./docs/Architecture.md) shows how the source is organised.

## Making a change

For anything bigger than a small fix, [open an issue](https://github.com/gotreasa/jest-cucumber-fusion/issues/new/choose) first, so that we can agree the approach before you write it.

1. Branch from `main` in your fork.
2. Write a failing test first, then the change that makes it pass. Behaviour is tested through feature files under `test/specs/features`, with their step definitions in `test/specs/features/step-definitions`.
3. Commit following the [commit message rules](#commit-messages). The hooks run when you commit and when you push.
4. Run the checks in [Before you push](./docs/RunningTheExamples.md#before-you-push). The pre-push hook runs the slower ones for you.
5. Open a pull request from your branch against `main`. CI runs the code checks again, and the maintainer reviews it; there is no guaranteed response time.

**A new test feature file.** Add the `.feature` file and a `.steps.js` file that calls `Fusion` on it. Some existing feature files must keep their wording: the baselines (`npm run test:baseline`) are scripts that check the package against a reference, and one of them compares the test names of the suites listed in `test/specs/baseline/test-names-2.0.0.txt` with a recorded run of version 2.0.0, because consumers' CI history depends on those names. Do not reword the feature files those suites load; if a change needs one reworded, ask in an issue first.

**A new module in `src/`.** Add it to the table in [Architecture](./docs/Architecture.md), with what it requires. The architecture test reads that table and fails when a module's imports differ from it.

## Commit messages

Commits follow [Conventional Commits](https://www.conventionalcommits.org/), checked by commitlint in the `commit-msg` hook. The type decides the release:

| Type                                                                    | Example from this repository                                    | Releases        |
| ----------------------------------------------------------------------- | --------------------------------------------------------------- | --------------- |
| `fix` or `perf`                                                         | `fix: report what a template or step threw, whatever it threw`  | a patch         |
| `feat`                                                                  | `feat: add basic scenarios in language`                         | a minor version |
| any type, with a `BREAKING CHANGE:` footer in the body                  | `feat!: replace jest-cucumber with jest + @cucumber/gherkin`    | a major version |
| `docs`, `test`, `chore`, `ci`, `build`, `refactor`, `style` or `revert` | `docs: add a documentation index and remove stale expectations` | nothing         |

**A breaking change needs the `BREAKING CHANGE:` footer.** The release configuration reads only the footer: a `!` after the type, as in `feat!:`, marks the change as breaking for a reader, but on its own it releases nothing at all. The `feat!` example above released 3.0.0 because its body ends with a `BREAKING CHANGE:` footer.

`npm run commit` starts a guided prompt that writes the message for you.

Pull requests are normally squash-merged. GitHub then names the commit on `main` after the pull request's title, or, for a pull request of a single commit, after that commit's title, and the commit's body holds the message of every squashed commit. Both decide the release: give the title the type of the most significant change, and know that a `BREAKING CHANGE:` footer in any of your commits releases a major version. The maintainer who merges may correct the title.

## The git hooks

| Hook         | Runs                                                                                                                 |
| ------------ | -------------------------------------------------------------------------------------------------------------------- |
| `pre-commit` | secretlint on every staged file; ESLint and Prettier on staged `.js` files; Prettier on staged `.md` and `.ts` files |
| `commit-msg` | commitlint                                                                                                           |
| `pre-push`   | `npm test`, `npm run test-d` and `npm run test:baseline`                                                             |

Do not skip a hook with `--no-verify`. If one fails, fix the cause. CI runs the same code checks and more, but only the hook checks commit messages: nothing checks a commit made with `--no-verify`, or the squash title written when a pull request is merged.

## Documentation

This section matters only if you change the documentation. User documentation is the README and the pages under `docs/`. Write examples that are concrete and realistic, such as a shopping basket or a login, and keep them free of jokes: they may be the only examples a reader finds.

A code block that names its file in its first line (or its second, after a `# language:` line) is a runnable example:

````
```javascript
// filename: test/features/shopping-basket.steps.js
```
````

`npm run test:baseline` runs the named blocks of the pages listed in `test/specs/baseline/assert-doc-examples.js`, each page in a fresh project with the packed package installed, so a named example must pass as written. It leaves out blocks without a filename, and everything from a "Written as CommonJS" heading to the end of the page. The CommonJS, TypeScript and ESLint pages are not run that way: check their examples by hand in a throwaway project.

Write prose in British English, and do not use em dashes.

## Releases

A push to `main` runs semantic-release in CI, in the integration job, once the lint job has passed. It reads the commit types since the last release, and when one calls for a release it tags the version, writes the GitHub release, and stages the package on npm with provenance. A maintainer then approves the staged package with two-factor authentication, which publishes it. Nothing is published from a contributor's machine.

## Reporting problems and asking questions

[Open an issue](https://github.com/gotreasa/jest-cucumber-fusion/issues/new/choose) and pick the form that fits: a bug report, a feature request or a question. The bug report asks for the package, Node and Jest versions, how your step files load the package, and the smallest feature file and step definitions that show the problem, with what Jest printed. That is what it takes to reproduce a problem, so please fill it in.

If you can, follow up with a pull request that adds a failing test for the problem under `test/specs/features`. A fix can come in the same pull request or a later one.
