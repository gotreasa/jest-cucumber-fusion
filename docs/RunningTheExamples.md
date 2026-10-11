# Running the examples

The examples are the feature files and step definition files under `test/specs/features`, written in JavaScript as ES modules. `npm test` builds the CommonJS bundle first and runs Jest in its ES module mode (`node --experimental-vm-modules`), so run the examples through it rather than through a bare `jest`. Working on the repository needs Node 20.11 or newer: the suite loads the ES module source, and the build and baseline scripts use `import.meta.dirname`.

First, clone the repository and install the dependencies:

```
git clone https://github.com/gotreasa/jest-cucumber-fusion.git
cd jest-cucumber-fusion
npm install
```

To see how the code is organised before you change it, read [Architecture](./Architecture.md).

## Running the examples from the command line

`npm test` runs the whole suite, which is the examples:

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

The pre-push hook runs the first two with `npm test`; CI runs all of them.
