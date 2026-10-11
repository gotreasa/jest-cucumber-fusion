# Running the test suite

This repository's test suite is the feature files and step definition files under `test/specs/features`, written in JavaScript as ES modules. They are regression fixtures rather than examples to copy: some keep wording from the package's earliest versions, because a recorded baseline checks that version 3 still gives their tests the names version 2 gave them. For examples to copy, use the [documentation](./README.md). `npm test` builds the CommonJS bundle first and runs Jest in its ES module mode (`node --experimental-vm-modules`), so run the suite through it rather than through a bare `jest`. Working on the repository needs Node 20.11 or newer: the suite loads the ES module source, and the build and baseline scripts use `import.meta.dirname`.

First, clone the repository and install the dependencies:

```
git clone https://github.com/gotreasa/jest-cucumber-fusion.git
cd jest-cucumber-fusion
npm install
```

To see how the code is organised before you change it, read [Architecture](./Architecture.md).

## Running the suite from the command line

`npm test` runs the whole suite:

```
npm test
```

To run one steps file, name it after `--`:

```
npm test -- test/specs/features/step-definitions/basic-scenarios.steps.js
```

## Before you push

The pre-push hook and CI run more than `npm test`. Run these too:

| Command | What it checks |
|---|---|
| `npm run test-d` | the published types, with `tsd` |
| `npm run test:baseline` | the packed package in fresh consumer projects, including every named example on the guide pages. It needs network access: it installs the packed package from a tarball. |
| `npm run lint` | ESLint, with no warnings allowed |
| `npm run typecheck` | TypeScript checking `src/` as JavaScript (`jsconfig.json`) |
| `npm run lint:secrets` | secretlint, for anything that looks like a credential |

The pre-push hook runs `npm test`, `npm run test-d` and `npm run test:baseline`; CI runs every command in this table.
