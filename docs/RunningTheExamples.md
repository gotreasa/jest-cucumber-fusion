# Running the examples

The examples are the feature files and step definition files under `test/specs/features`, written in JavaScript as ES modules. `npm test` builds the CommonJS bundle first and runs Jest in its ES module mode (`node --experimental-vm-modules`), so run the examples through it rather than through a bare `jest`. Working on the repository needs Node 20.11 or newer: the suite loads the ES module source, and the build and baseline scripts use `import.meta.dirname`.

First, clone the repository and install the dependencies:

```
$ git clone https://github.com/gotreasa/jest-cucumber-fusion.git
$ cd jest-cucumber-fusion
$ npm install
```

To see how the code is organised before you change it, read [Architecture](./Architecture.md).

## Running examples from the CMD line


```
$ npm test
```
